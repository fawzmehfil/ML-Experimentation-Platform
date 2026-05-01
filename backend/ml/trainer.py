"""
ml/trainer.py
Instantiates and trains scikit-learn models.
Supports optional cross-validation for more robust performance estimates.
"""

import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score


# Registry pattern: maps model key → (regression class, classification class)
MODEL_REGISTRY = {
    "linear_regression": (LinearRegression, None),
    "logistic_regression": (None, LogisticRegression),
    "random_forest": (RandomForestRegressor, RandomForestClassifier),
    "gradient_boosting": (GradientBoostingRegressor, GradientBoostingClassifier),
}

# Default hyperparameters for reproducible local training.
MODEL_PARAMS = {
    "linear_regression": {},
    "logistic_regression": {"max_iter": 1000, "random_state": 42},
    "random_forest": {"n_estimators": 100, "random_state": 42, "n_jobs": -1},
    "gradient_boosting": {"n_estimators": 100, "random_state": 42, "learning_rate": 0.1},
}


def train_models(
    model_names: list[str],
    task_type: str,
    X_train: np.ndarray,
    y_train: np.ndarray,
    use_cross_validation: bool = False,
) -> dict:
    """
    Train one or more models and return a dict of {model_name: fitted_model}.
    Optionally records cross-validation scores as a model attribute for reporting.

    Args:
        model_names: List of model keys from MODEL_REGISTRY.
        task_type: 'regression' or 'classification'.
        X_train: Preprocessed training features.
        y_train: Training labels.
        use_cross_validation: If True, run 5-fold CV and attach scores.

    Returns:
        Dict of {model_name: fitted sklearn estimator}.
    """
    trained = {}

    for name in model_names:
        model = _instantiate_model(name, task_type)
        model.fit(X_train, y_train)

        # Attach CV scores as an attribute (non-standard but useful for reporting)
        if use_cross_validation:
            scoring = "r2" if task_type == "regression" else "f1_weighted"
            try:
                cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring=scoring)
                model._cv_scores = cv_scores.tolist()
                model._cv_mean = float(np.mean(cv_scores))
                model._cv_std = float(np.std(cv_scores))
            except Exception:
                model._cv_scores = []
                model._cv_mean = None
                model._cv_std = None
        else:
            model._cv_scores = []
            model._cv_mean = None
            model._cv_std = None

        trained[name] = model

    return trained


def _instantiate_model(model_name: str, task_type: str):
    """Look up and instantiate a model from the registry."""
    if model_name not in MODEL_REGISTRY:
        raise ValueError(f"Unknown model: {model_name}")

    reg_cls, clf_cls = MODEL_REGISTRY[model_name]
    params = MODEL_PARAMS.get(model_name, {})

    if task_type == "regression":
        if reg_cls is None:
            raise ValueError(f"'{model_name}' does not support regression")
        return reg_cls(**params)
    else:
        if clf_cls is None:
            raise ValueError(f"'{model_name}' does not support classification")
        return clf_cls(**params)
