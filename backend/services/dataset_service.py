"""
services/dataset_service.py
Handles CSV validation and statistical profiling.
Clean separation from routing logic — good SWE practice.
"""

import pandas as pd
import numpy as np


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
