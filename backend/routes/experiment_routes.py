"""
routes/experiment_routes.py
Handles experiment configuration, training dispatch, and result retrieval.
"""

import json
import uuid
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app

from services.experiment_service import run_experiment_pipeline
from models.database import get_db, row_to_dict

experiment_bp = Blueprint("experiment", __name__)


@experiment_bp.route("/experiments/run", methods=["POST"])
def run_experiment():
    """
    POST /api/experiments/run
    Body (JSON):
    {
        "dataset_id": "...",
        "target_column": "price",
        "task_type": "regression",
        "models": ["random_forest", "gradient_boosting"],
        "preprocessing": {
            "test_size": 0.2,
            "val_size": 0.1,
            "use_cross_validation": false,
            "handle_missing": "mean",
            "scaling": "standard",
            "encode_categoricals": true,
            "drop_columns": []
        }
    }
    """
    body = request.get_json()

    # --- Input validation ---
    required = ["dataset_id", "target_column", "task_type", "models", "preprocessing"]
    for field in required:
        if field not in body:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    if body["task_type"] not in ("classification", "regression"):
        return jsonify({"error": "task_type must be 'classification' or 'regression'"}), 400

    valid_models = {"linear_regression", "logistic_regression", "random_forest", "gradient_boosting"}
    invalid = set(body["models"]) - valid_models
    if invalid:
        return jsonify({"error": f"Unknown models: {invalid}"}), 400

    if not body["models"]:
        return jsonify({"error": "Select at least one model"}), 400

    # --- Fetch dataset path from DB ---
    db_path = current_app.config["DATABASE_PATH"]

    with get_db(db_path) as conn:
        dataset_row = conn.execute(
            "SELECT * FROM datasets WHERE id = ?", (body["dataset_id"],)
        ).fetchone()

    if not dataset_row:
        return jsonify({"error": "Dataset not found"}), 404

    dataset = row_to_dict(dataset_row)

    if body["target_column"] not in dataset["columns"]:
        return jsonify({"error": f"Target column '{body['target_column']}' not found in dataset"}), 400

    # --- Count prior runs on this dataset+target for stability tracking ---
    with get_db(db_path) as conn:
        prior_runs = conn.execute(
            """SELECT metrics, created_at FROM experiments
               WHERE dataset_id = ? AND target_column = ? AND task_type = ?
               ORDER BY created_at ASC""",
            (body["dataset_id"], body["target_column"], body["task_type"]),
        ).fetchall()

    run_number = len(prior_runs) + 1

    # --- Run the ML pipeline ---
    try:
        results = run_experiment_pipeline(
            filepath=dataset["filepath"],
            target_column=body["target_column"],
            task_type=body["task_type"],
            model_names=body["models"],
            preprocessing_config=body["preprocessing"],
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500

    # --- Build stability history from prior runs ---
    stability_history = []
    for row in prior_runs:
        stability_history.append({
            "run_number": len(stability_history) + 1,
            "metrics": json.loads(row["metrics"]),
            "created_at": row["created_at"],
        })
    # Append current run
    stability_history.append({
        "run_number": run_number,
        "metrics": results["metrics"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    # --- Persist experiment ---
    experiment_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    with get_db(db_path) as conn:
        conn.execute(
            """
            INSERT INTO experiments
              (id, dataset_id, dataset_name, target_column, task_type,
               models_trained, preprocessing_config, metrics,
               feature_importance, stability_history, run_number, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                experiment_id,
                body["dataset_id"],
                dataset["filename"],
                body["target_column"],
                body["task_type"],
                json.dumps(body["models"]),
                json.dumps(body["preprocessing"]),
                json.dumps(results["metrics"]),
                json.dumps(results.get("feature_importance", {})),
                json.dumps(stability_history),
                run_number,
                created_at,
            ),
        )

    return jsonify({
        "experiment_id": experiment_id,
        "run_number": run_number,
        "metrics": results["metrics"],
        "feature_importance": results.get("feature_importance", {}),
        "best_model": results.get("best_model"),
        "summary_text": results.get("summary_text"),
        "stability_history": stability_history,
        "created_at": created_at,
    }), 201


@experiment_bp.route("/experiments", methods=["GET"])
def list_experiments():
    """GET /api/experiments - return all experiments, newest first."""
    db_path = current_app.config["DATABASE_PATH"]

    with get_db(db_path) as conn:
        rows = conn.execute(
            """SELECT id, dataset_name, target_column, task_type,
                      models_trained, metrics, run_number, created_at
               FROM experiments ORDER BY created_at DESC"""
        ).fetchall()

    experiments = []
    for row in rows:
        d = dict(row)
        d["models_trained"] = json.loads(d["models_trained"])
        d["metrics"] = json.loads(d["metrics"])
        experiments.append(d)

    return jsonify(experiments), 200


@experiment_bp.route("/experiments/<experiment_id>", methods=["GET"])
def get_experiment(experiment_id):
    """GET /api/experiments/:id - full experiment detail."""
    db_path = current_app.config["DATABASE_PATH"]

    with get_db(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM experiments WHERE id = ?", (experiment_id,)
        ).fetchone()

    if not row:
        return jsonify({"error": "Experiment not found"}), 404

    return jsonify(row_to_dict(row)), 200


@experiment_bp.route("/experiments/<experiment_id>/export", methods=["GET"])
def export_experiment(experiment_id):
    """GET /api/experiments/:id/export - download experiment as JSON."""
    db_path = current_app.config["DATABASE_PATH"]

    with get_db(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM experiments WHERE id = ?", (experiment_id,)
        ).fetchone()

    if not row:
        return jsonify({"error": "Experiment not found"}), 404

    data = row_to_dict(row)
    return jsonify(data), 200


@experiment_bp.route("/leaderboard", methods=["GET"])
def leaderboard():
    """
    GET /api/leaderboard
    Returns the best experiment per task type, ranked by primary metric.
    Regression: R², Classification: F1.
    """
    db_path = current_app.config["DATABASE_PATH"]

    with get_db(db_path) as conn:
        rows = conn.execute(
            """SELECT id, dataset_name, target_column, task_type,
                      models_trained, metrics, run_number, created_at
               FROM experiments ORDER BY created_at DESC"""
        ).fetchall()

    entries = []
    for row in rows:
        d = dict(row)
        d["models_trained"] = json.loads(d["models_trained"])
        d["metrics"] = json.loads(d["metrics"])

        # Find best model score within this experiment
        best_score = None
        best_model = None
        for model, m in d["metrics"].items():
            if d["task_type"] == "regression":
                score = m.get("r2", -999)
            else:
                score = m.get("f1", -999)
            if best_score is None or score > best_score:
                best_score = score
                best_model = model

        entries.append({
            "experiment_id": d["id"],
            "dataset_name": d["dataset_name"],
            "target_column": d["target_column"],
            "task_type": d["task_type"],
            "best_model": best_model,
            "best_score": best_score,
            "metric_label": "R²" if d["task_type"] == "regression" else "F1",
            "run_number": d["run_number"],
            "created_at": d["created_at"],
        })

    # Sort descending by score
    entries.sort(key=lambda x: x["best_score"] or -999, reverse=True)
    return jsonify(entries[:20]), 200
