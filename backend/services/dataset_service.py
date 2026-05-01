import logging
import os
import uuid
from datetime import datetime, timezone

import pandas as pd
import numpy as np
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from repositories import dataset_repository
from utils.exceptions import NotFoundError, UnprocessableEntityError, ValidationError


logger = logging.getLogger(__name__)


def upload_dataset(file: FileStorage | None, *, upload_folder: str, db_path: str) -> dict:
    if file is None:
        raise ValidationError("No file part in request")
    if file.filename == "":
        raise ValidationError("No file selected")
    if not file.filename.lower().endswith(".csv"):
        raise ValidationError("Only CSV files are supported")

    dataset_id = str(uuid.uuid4())
    original_filename = secure_filename(file.filename)
    saved_filename = f"{dataset_id}_{original_filename}"
    filepath = os.path.join(upload_folder, saved_filename)

    logger.info("dataset_upload_started", extra={"dataset_id": dataset_id, "dataset_filename": original_filename})
    file.save(filepath)

    try:
        profile = validate_and_profile_csv(filepath)
    except ValueError as error:
        _remove_file(filepath)
        logger.warning("dataset_upload_rejected", extra={"dataset_id": dataset_id, "reason": str(error)})
        raise UnprocessableEntityError(str(error))
    except Exception as error:
        _remove_file(filepath)
        logger.exception("dataset_upload_failed", extra={"dataset_id": dataset_id})
        raise UnprocessableEntityError(f"Failed to parse CSV: {str(error)}")

    created_at = datetime.now(timezone.utc).isoformat()
    dataset_repository.create_dataset(db_path, {
        "id": dataset_id,
        "filename": original_filename,
        "filepath": filepath,
        "num_rows": profile["num_rows"],
        "num_cols": profile["num_cols"],
        "columns": profile["columns"],
        "dtypes": profile["dtypes"],
        "missing": profile["missing"],
        "created_at": created_at,
    })

    logger.info(
        "dataset_upload_completed",
        extra={"dataset_id": dataset_id, "rows": profile["num_rows"], "columns": profile["num_cols"]},
    )
    return {
        "dataset_id": dataset_id,
        "filename": original_filename,
        "profile": profile,
        "created_at": created_at,
    }


def get_dataset_summary(dataset_id: str, *, db_path: str) -> dict:
    dataset = dataset_repository.get_dataset(db_path, dataset_id)
    if not dataset:
        raise NotFoundError("Dataset not found")

    try:
        df = pd.read_csv(dataset["filepath"], nrows=10)
        preview = df.fillna("").to_dict(orient="records")
    except Exception:
        logger.exception("dataset_preview_failed", extra={"dataset_id": dataset_id})
        preview = []

    dataset["preview"] = preview
    return dataset


def list_datasets(db_path: str) -> list[dict]:
    return dataset_repository.list_datasets(db_path)


def validate_and_profile_csv(filepath: str) -> dict:
    """
    Load a CSV, run validation checks, and return a statistical profile.

    Raises ValueError for any data quality issue.
    Returns a profile dict suitable for JSON serialization.
    """
    # --- Load ---
    try:
        df = pd.read_csv(filepath)
    except pd.errors.EmptyDataError:
        raise ValueError("The uploaded CSV file is empty")
    except pd.errors.ParserError as e:
        raise ValueError(f"CSV parsing error: {str(e)}")

    # --- Validation checks ---
    if df.empty:
        raise ValueError("Dataset has no rows")

    if len(df.columns) < 2:
        raise ValueError("Dataset must have at least 2 columns")

    if df.columns.duplicated().any():
        dupes = df.columns[df.columns.duplicated()].tolist()
        raise ValueError(f"Duplicate column names found: {dupes}")

    if len(df) < 10:
        raise ValueError("Dataset must have at least 10 rows for meaningful training")

    # --- Profile ---
    dtypes = {col: _map_dtype(str(dtype)) for col, dtype in df.dtypes.items()}
    missing = {col: int(df[col].isna().sum()) for col in df.columns}

    # Basic stats for numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    stats = {}
    for col in numeric_cols:
        s = df[col].describe()
        stats[col] = {
            "mean": _safe_float(s.get("mean")),
            "std": _safe_float(s.get("std")),
            "min": _safe_float(s.get("min")),
            "max": _safe_float(s.get("max")),
            "median": _safe_float(df[col].median()),
        }

    return {
        "num_rows": len(df),
        "num_cols": len(df.columns),
        "columns": df.columns.tolist(),
        "dtypes": dtypes,
        "missing": missing,
        "numeric_columns": numeric_cols,
        "categorical_columns": [c for c in df.columns if c not in numeric_cols],
        "stats": stats,
    }


def _map_dtype(dtype_str: str) -> str:
    """Map pandas dtype strings to human-readable labels."""
    if "int" in dtype_str:
        return "integer"
    if "float" in dtype_str:
        return "float"
    if "bool" in dtype_str:
        return "boolean"
    if "datetime" in dtype_str:
        return "datetime"
    return "string"


def _safe_float(val) -> float | None:
    """Convert numpy float to Python float, handling NaN."""
    try:
        f = float(val)
        return None if np.isnan(f) else round(f, 4)
    except (TypeError, ValueError):
        return None


def _remove_file(filepath: str) -> None:
    try:
        os.remove(filepath)
    except FileNotFoundError:
        pass
