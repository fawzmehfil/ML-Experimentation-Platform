"""
ml/explainer.py
Extracts feature importance or model coefficients for explainability.
Supports tree-based (feature_importances_) and linear (coef_) models.
"""

import numpy as np


def extract_feature_importance(
    trained_models: dict,
    feature_names: list[str],
    task_type: str,
    top_n: int = 20,
) -> dict:
    """
    Extract feature importance or coefficients for each model.

    Returns:
        {
          "random_forest": [
            {"feature": "age", "importance": 0.32},
            ...
          ],
          "logistic_regression": [
            {"feature": "income", "coefficient": 1.45},
            ...
          ]
        }
    """
    importance_dict = {}

    for name, model in trained_models.items():
        try:
            importance_dict[name] = _extract_single(model, feature_names, name, top_n)
        except Exception:
            importance_dict[name] = []  # graceful fallback

    return importance_dict


def _extract_single(model, feature_names: list[str], model_name: str, top_n: int) -> list[dict]:
    """Extract importance values for a single model."""

    # --- Tree-based models: feature_importances_ ---
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
        pairs = list(zip(feature_names, importances))
        pairs.sort(key=lambda x: abs(x[1]), reverse=True)
        return [
            {"feature": _clean_name(f), "importance": round(float(v), 6), "type": "importance"}
            for f, v in pairs[:top_n]
        ]

    # --- Linear models: coef_ ---
    if hasattr(model, "coef_"):
        coef = model.coef_

        # Logistic regression with multi-class has shape (n_classes, n_features)
        # Average absolute values across classes for a single ranking
        if coef.ndim > 1:
            coef = np.mean(np.abs(coef), axis=0)

        pairs = list(zip(feature_names, coef))
        pairs.sort(key=lambda x: abs(x[1]), reverse=True)
        return [
            {"feature": _clean_name(f), "importance": round(float(v), 6), "type": "coefficient"}
            for f, v in pairs[:top_n]
        ]

    return []


def _clean_name(feature_name: str) -> str:
    """
    Clean up sklearn-generated feature names like 'num__age' or 'cat__color_blue'.
    Makes charts more readable.
    """
    name = str(feature_name)
    # Remove pipeline prefixes (num__, cat__, preprocessor__)
    for prefix in ["num__", "cat__", "preprocessor__num__", "preprocessor__cat__"]:
        if name.startswith(prefix):
            name = name[len(prefix):]
    return name
