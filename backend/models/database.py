"""SQLite schema initialization and connection helpers."""

import sqlite3
import json
from contextlib import contextmanager


SCHEMA = """
CREATE TABLE IF NOT EXISTS datasets (
    id          TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    filepath    TEXT NOT NULL,
    num_rows    INTEGER,
    num_cols    INTEGER,
    columns     TEXT,   -- JSON list of column names
    dtypes      TEXT,   -- JSON dict of col -> dtype
    missing     TEXT,   -- JSON dict of col -> missing count
    created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS experiments (
    id                  TEXT PRIMARY KEY,
    dataset_id          TEXT NOT NULL,
    dataset_name        TEXT NOT NULL,
    target_column       TEXT NOT NULL,
    task_type           TEXT NOT NULL,    -- 'classification' | 'regression'
    models_trained      TEXT NOT NULL,   -- JSON list of model names
    preprocessing_config TEXT NOT NULL,  -- JSON blob
    metrics             TEXT NOT NULL,   -- JSON dict of model -> metrics
    feature_importance  TEXT,            -- JSON dict of model -> importance
    stability_history   TEXT,            -- JSON list of past metric snapshots
    run_number          INTEGER DEFAULT 1,
    created_at          TEXT NOT NULL,
    FOREIGN KEY (dataset_id) REFERENCES datasets(id)
);
"""


def init_db(db_path: str):
    """Create tables if they don't exist. Safe to call on every startup."""
    with sqlite3.connect(db_path) as conn:
        conn.executescript(SCHEMA)
        conn.commit()


@contextmanager
def get_db(db_path: str):
    """Context manager for safe database connections with auto-close."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row  # allows dict-like access to rows
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def row_to_dict(row: sqlite3.Row) -> dict:
    """Convert a sqlite3.Row to a plain dict, parsing JSON fields."""
    d = dict(row)
    json_fields = ["columns", "dtypes", "missing", "models_trained",
                   "preprocessing_config", "metrics", "feature_importance",
                   "stability_history"]
    for field in json_fields:
        if field in d and d[field] is not None:
            try:
                d[field] = json.loads(d[field])
            except (json.JSONDecodeError, TypeError):
                pass
    return d
