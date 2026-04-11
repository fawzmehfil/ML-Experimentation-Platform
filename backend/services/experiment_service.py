"""
services/experiment_service.py
Orchestrates the full ML pipeline: load → preprocess → train → evaluate.
Acts as the bridge between routes and ML logic.
"""

import pandas as pd
import numpy as np

from ml.preprocessor import build_preprocessing_pipeline, split_data
from ml.trainer import train_models
from ml.evaluator import evaluate_models
from ml.explainer import extract_feature_importance


def run_experiment_pipeline(
    filepath: str,
    target_column: str,
    task_type: str,
    model_names: list[str],
    preprocessing_config: dict,
) -> dict:
    """
    Full ML experiment pipeline.

    Args:
        filepath: Path to the CSV file.
        target_column: Name of the label/target column.
        task_type: 'classification' or 'regression'.
        model_names: List of model keys to train.
        preprocessing_config: Dict of preprocessing options.

    Returns:
        Dict with metrics, feature_importance, best_model, summary_text.
    """
    # --- 1. Load data ---
    df = pd.read_csv(filepath)

    # --- 2. Drop user-specified columns ---
    drop_cols = preprocessing_config.get("drop_columns", [])
    drop_cols = [c for c in drop_cols if c in df.columns and c != target_column]
    if drop_cols:
        df = df.drop(columns=drop_cols)

    # --- 3. Separate features and target ---
    if target_column not in df.columns:
        raise ValueError(f"Target column '{target_column}' not found")

    X = df.drop(columns=[target_column])
    y = df[target_column]

    # --- 4. Task-type validation ---
    if task_type == "classification":
        n_classes = y.nunique()
        if n_classes < 2:
            raise ValueError("Classification target must have at least 2 unique classes")
        if n_classes > 50:
            raise ValueError(f"Too many classes ({n_classes}). Did you mean regression?")
    elif task_type == "regression":
        if not pd.api.types.is_numeric_dtype(y):
            raise ValueError("Regression target must be numeric")

    # --- 5. Train/val/test split ---
    test_size = float(preprocessing_config.get("test_size", 0.2))
    val_size = float(preprocessing_config.get("val_size", 0.1))

    X_train, X_val, X_test, y_train, y_val, y_test = split_data(
        X, y, test_size=test_size, val_size=val_size
    )

    # --- 6. Build preprocessing pipeline ---
    pipeline = build_preprocessing_pipeline(
        X_train,
        handle_missing=preprocessing_config.get("handle_missing", "mean"),
        scaling=preprocessing_config.get("scaling", "standard"),
        encode_categoricals=preprocessing_config.get("encode_categoricals", True),
    )

    # Fit on train, transform all splits
    X_train_proc = pipeline.fit_transform(X_train)
    X_val_proc = pipeline.transform(X_val)
    X_test_proc = pipeline.transform(X_test)

    # Get feature names after preprocessing (for explainability)
    feature_names = _get_feature_names(pipeline, X_train)

    # --- 7. Train models ---
    use_cv = preprocessing_config.get("use_cross_validation", False)
    trained_models = train_models(
        model_names=model_names,
        task_type=task_type,
        X_train=X_train_proc,
        y_train=y_train,
        use_cross_validation=use_cv,
    )

    # --- 8. Evaluate on test set ---
    metrics = evaluate_models(
        trained_models=trained_models,
        task_type=task_type,
        X_test=X_test_proc,
        y_test=y_test,
    )

    # --- 9. Feature importance / coefficients ---
    feature_importance = extract_feature_importance(
        trained_models=trained_models,
        feature_names=feature_names,
        task_type=task_type,
    )

    # --- 10. Identify best model and generate summary ---
    best_model = _find_best_model(metrics, task_type)
    summary_text = _generate_summary(metrics, task_type, best_model, len(df))

    return {
        "metrics": metrics,
        "feature_importance": feature_importance,
        "best_model": best_model,
        "summary_text": summary_text,
    }


def _get_feature_names(pipeline, X_train: pd.DataFrame) -> list[str]:
    """Extract feature names after the sklearn pipeline transforms them."""
    try:
        # Pipeline wraps a ColumnTransformer named 'preprocessor'
        return list(pipeline.named_steps['preprocessor'].get_feature_names_out())
    except Exception:
        pass
    try:
        return list(pipeline.get_feature_names_out())
    except Exception:
        return list(X_train.columns)


def _find_best_model(metrics: dict, task_type: str) -> str:
    """Return the model name with the best primary metric."""
    primary = "r2" if task_type == "regression" else "f1"
    best = max(metrics.items(), key=lambda x: x[1].get(primary, -999))
    return best[0]


def _generate_summary(metrics: dict, task_type: str, best_model: str, n_samples: int) -> str:
    """
    Generate a human-readable summary of results.
    Simple but useful for portfolio demonstrations.
    """
    m = metrics.get(best_model, {})
    lines = [
        f"Trained {len(metrics)} model(s) on {n_samples:,} samples.",
        f"Best performing model: {best_model.replace('_', ' ').title()}.",
    ]

    if task_type == "regression":
        r2 = m.get("r2")
        rmse = m.get("rmse")
        if r2 is not None:
            quality = "excellent" if r2 > 0.9 else "good" if r2 > 0.7 else "moderate" if r2 > 0.5 else "weak"
            lines.append(f"R² = {r2:.4f} — {quality} explanatory power.")
        if rmse is not None:
            lines.append(f"RMSE = {rmse:.4f}.")
    else:
        acc = m.get("accuracy")
        f1 = m.get("f1")
        if acc is not None:
            lines.append(f"Accuracy = {acc:.2%}, F1 = {f1:.4f}.")

    return " ".join(lines)
