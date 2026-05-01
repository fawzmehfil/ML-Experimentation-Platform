"""
Experiment database access functions.
"""

import json

from models.database import get_db, row_to_dict


def create_experiment(db_path: str, experiment: dict) -> None:
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
                experiment["id"],
                experiment["dataset_id"],
                experiment["dataset_name"],
                experiment["target_column"],
                experiment["task_type"],
                json.dumps(experiment["models_trained"]),
                json.dumps(experiment["preprocessing_config"]),
                json.dumps(experiment["metrics"]),
                json.dumps(experiment.get("feature_importance", {})),
                json.dumps(experiment.get("stability_history", [])),
                experiment["run_number"],
                experiment["created_at"],
            ),
        )


def get_experiment(db_path: str, experiment_id: str) -> dict | None:
    with get_db(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM experiments WHERE id = ?", (experiment_id,)
        ).fetchone()
    return row_to_dict(row) if row else None


def list_experiments(db_path: str) -> list[dict]:
    with get_db(db_path) as conn:
        rows = conn.execute(
            """SELECT id, dataset_name, target_column, task_type,
                      models_trained, metrics, run_number, created_at
               FROM experiments ORDER BY created_at DESC"""
        ).fetchall()
    return [row_to_dict(row) for row in rows]


def list_prior_runs(
    db_path: str,
    *,
    dataset_id: str,
    target_column: str,
    task_type: str,
) -> list[dict]:
    with get_db(db_path) as conn:
        rows = conn.execute(
            """SELECT metrics, created_at FROM experiments
               WHERE dataset_id = ? AND target_column = ? AND task_type = ?
               ORDER BY created_at ASC""",
            (dataset_id, target_column, task_type),
        ).fetchall()

    return [
        {
            "metrics": json.loads(row["metrics"]),
            "created_at": row["created_at"],
        }
        for row in rows
    ]
