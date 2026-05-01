"""
Dataset database access functions.
"""

import json

from models.database import get_db, row_to_dict


def create_dataset(db_path: str, dataset: dict) -> None:
    with get_db(db_path) as conn:
        conn.execute(
            """
            INSERT INTO datasets (id, filename, filepath, num_rows, num_cols,
                                  columns, dtypes, missing, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                dataset["id"],
                dataset["filename"],
                dataset["filepath"],
                dataset["num_rows"],
                dataset["num_cols"],
                json.dumps(dataset["columns"]),
                json.dumps(dataset["dtypes"]),
                json.dumps(dataset["missing"]),
                dataset["created_at"],
            ),
        )


def get_dataset(db_path: str, dataset_id: str) -> dict | None:
    with get_db(db_path) as conn:
        row = conn.execute(
            "SELECT * FROM datasets WHERE id = ?", (dataset_id,)
        ).fetchone()
    return row_to_dict(row) if row else None


def list_datasets(db_path: str) -> list[dict]:
    with get_db(db_path) as conn:
        rows = conn.execute(
            "SELECT id, filename, num_rows, num_cols, created_at FROM datasets ORDER BY created_at DESC"
        ).fetchall()
    return [dict(row) for row in rows]
