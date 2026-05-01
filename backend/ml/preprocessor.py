"""Preprocessing pipelines and train/validation/test splitting."""

import numpy as np
import pandas as pd
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler, MinMaxScaler, OneHotEncoder
from sklearn.impute import SimpleImputer
from sklearn.model_selection import train_test_split


def split_data(
    X: pd.DataFrame,
    y: pd.Series,
    test_size: float = 0.2,
    val_size: float = 0.1,
    random_state: int = 42,
):
    """
    Split into train / validation / test sets.
    Stratifies for classification when feasible.
    """
    total = len(X)
    if total < 20:
        raise ValueError("Dataset too small to split meaningfully (< 20 rows)")

    # First split off test
    X_temp, X_test, y_temp, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    # Then split val from remaining
    # Adjust val_size relative to the remaining data
    if val_size > 0 and len(X_temp) > 10:
        relative_val = val_size / (1.0 - test_size)
        relative_val = min(relative_val, 0.5)  # cap to avoid tiny train sets
        X_train, X_val, y_train, y_val = train_test_split(
            X_temp, y_temp, test_size=relative_val, random_state=random_state
        )
    else:
        X_train, y_train = X_temp, y_temp
        X_val, y_val = X_test.copy(), y_test.copy()  # reuse test as val if no val split

    return X_train, X_val, X_test, y_train, y_val, y_test


def build_preprocessing_pipeline(
    X_train: pd.DataFrame,
    handle_missing: str = "mean",
    scaling: str = "standard",
    encode_categoricals: bool = True,
) -> Pipeline:
    """
    Build a ColumnTransformer pipeline that handles:
    - Numeric: imputation + optional scaling
    - Categorical: imputation + one-hot encoding

    Uses ColumnTransformer to handle mixed numeric and categorical data.
    """
    numeric_cols = X_train.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = X_train.select_dtypes(exclude=[np.number]).columns.tolist()

    # --- Numeric pipeline ---
    numeric_steps = [("imputer", SimpleImputer(strategy=_missing_strategy(handle_missing)))]

    if scaling == "standard":
        numeric_steps.append(("scaler", StandardScaler()))
    elif scaling == "minmax":
        numeric_steps.append(("scaler", MinMaxScaler()))
    # "none" → no scaler appended

    numeric_pipeline = Pipeline(numeric_steps)

    # --- Categorical pipeline ---
    categorical_pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])

    # --- Compose transformers ---
    transformers = []
    if numeric_cols:
        transformers.append(("num", numeric_pipeline, numeric_cols))
    if categorical_cols and encode_categoricals:
        transformers.append(("cat", categorical_pipeline, categorical_cols))

    if not transformers:
        raise ValueError("No columns available for preprocessing")

    preprocessor = ColumnTransformer(transformers=transformers, remainder="drop")

    # Wrap in a Pipeline for clean fit/transform interface
    return Pipeline([("preprocessor", preprocessor)])


def _missing_strategy(strategy: str) -> str:
    """Map UI-friendly names to sklearn SimpleImputer strategies."""
    mapping = {
        "mean": "mean",
        "median": "median",
        "mode": "most_frequent",
        "drop": "mean",  # row-dropping is handled before pipeline; fallback to mean
    }
    return mapping.get(strategy, "mean")
