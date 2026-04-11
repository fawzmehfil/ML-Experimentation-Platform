"""
ml/evaluator.py
Computes evaluation metrics for trained models on the test set.
Keeps metric computation cleanly separated from training logic.
"""

import numpy as np
from sklearn.metrics import (
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)


def evaluate_models(
    trained_models: dict,
    task_type: str,
    X_test: np.ndarray,
    y_test: np.ndarray,
) -> dict:
    """
    Evaluate all trained models and return a nested metrics dict.

    Returns:
        {
          "random_forest": {
            "rmse": 4.21, "mae": 2.89, "r2": 0.87,
            "cv_mean": 0.85, "cv_std": 0.02
          },
          ...
        }
    """
    results = {}

    for name, model in trained_models.items():
        y_pred = model.predict(X_test)

        if task_type == "regression":
            metrics = _regression_metrics(y_test, y_pred)
        else:
            metrics = _classification_metrics(y_test, y_pred)

        # Attach CV scores if they were computed during training
        metrics["cv_mean"] = getattr(model, "_cv_mean", None)
        metrics["cv_std"] = getattr(model, "_cv_std", None)
        metrics["cv_scores"] = getattr(model, "_cv_scores", [])

        results[name] = metrics

    return results


def _regression_metrics(y_true, y_pred) -> dict:
    """Compute RMSE, MAE, and R² for regression tasks."""
    mse = mean_squared_error(y_true, y_pred)
    return {
        "rmse": round(float(np.sqrt(mse)), 6),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 6),
        "r2": round(float(r2_score(y_true, y_pred)), 6),
    }


def _classification_metrics(y_true, y_pred) -> dict:
    """Compute accuracy, precision, recall, F1, and confusion matrix."""
    # Use weighted averaging for multi-class support
    avg = "weighted"

    cm = confusion_matrix(y_true, y_pred)
    cm_list = cm.tolist()  # convert numpy array → JSON-serializable list

    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 6),
        "precision": round(float(precision_score(y_true, y_pred, average=avg, zero_division=0)), 6),
        "recall": round(float(recall_score(y_true, y_pred, average=avg, zero_division=0)), 6),
        "f1": round(float(f1_score(y_true, y_pred, average=avg, zero_division=0)), 6),
        "confusion_matrix": cm_list,
    }
