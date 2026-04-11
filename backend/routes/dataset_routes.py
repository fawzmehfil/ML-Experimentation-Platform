"""
routes/dataset_routes.py
Handles CSV upload, validation, and dataset summary endpoints.
"""

import os
import uuid
import json
from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, current_app

from services.dataset_service import validate_and_profile_csv
from models.database import get_db, row_to_dict

dataset_bp = Blueprint("dataset", __name__)


@dataset_bp.route("/upload", methods=["POST"])
def upload_dataset():
    """
    POST /api/upload
    Accepts a multipart/form-data CSV file.
    Validates, profiles, saves metadata to DB, returns dataset summary.
    """
    # --- 1. File presence check ---
    if "file" not in request.files:
        return jsonify({"error": "No file part in request"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.lower().endswith(".csv"):
        return jsonify({"error": "Only CSV files are supported"}), 400

    # --- 2. Save file to disk ---
    dataset_id = str(uuid.uuid4())
    safe_filename = f"{dataset_id}_{file.filename}"
    filepath = os.path.join(current_app.config["UPLOAD_FOLDER"], safe_filename)
    file.save(filepath)

    # --- 3. Validate and profile ---
    try:
        profile = validate_and_profile_csv(filepath)
    except ValueError as e:
        os.remove(filepath)  # clean up bad file
        return jsonify({"error": str(e)}), 422
    except Exception as e:
        os.remove(filepath)
        return jsonify({"error": f"Failed to parse CSV: {str(e)}"}), 500

    # --- 4. Persist metadata to SQLite ---
    db_path = current_app.config["DATABASE_PATH"]
    created_at = datetime.now(timezone.utc).isoformat()

    with get_db(db_path) as conn:
        conn.execute(
            """
            INSERT INTO datasets (id, filename, filepath, num_rows, num_cols,
                                  columns, dtypes, missing, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                dataset_id,
                file.filename,
                filepath,
                profile["num_rows"],
                profile["num_cols"],
                json.dumps(profile["columns"]),
                json.dumps(profile["dtypes"]),
                json.dumps(profile["missing"]),
                created_at,
            ),
        )

    return jsonify({
        "dataset_id": dataset_id,
        "filename": file.filename,
        "profile": profile,
        "created_at": created_at,
    }), 201


@dataset_bp.route("/dataset/<dataset_id>/summary", methods=["GET"])
def get_dataset_summary(dataset_id):
    """
    GET /api/dataset/:id/summary
    Returns stored metadata + a preview of first 10 rows.
    """
    db_path = current_app.config["DATABASE_PATH"]

    with get_db(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM datasets WHERE id = ?", (dataset_id,)
        ).fetchone()

    if not row:
        return jsonify({"error": "Dataset not found"}), 404

    dataset = row_to_dict(row)

    # Load preview rows from disk
    try:
        import pandas as pd
        df = pd.read_csv(dataset["filepath"], nrows=10)
        preview = df.fillna("").to_dict(orient="records")
    except Exception:
        preview = []

    dataset["preview"] = preview
    return jsonify(dataset), 200


@dataset_bp.route("/datasets", methods=["GET"])
def list_datasets():
    """GET /api/datasets - list all uploaded datasets."""
    db_path = current_app.config["DATABASE_PATH"]

    with get_db(db_path) as conn:
        rows = conn.execute(
            "SELECT id, filename, num_rows, num_cols, created_at FROM datasets ORDER BY created_at DESC"
        ).fetchall()

    return jsonify([dict(r) for r in rows]), 200
