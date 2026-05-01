"""
Request validation helpers for API routes.
"""

from flask import Request

from ml.trainer import MODEL_REGISTRY
from utils.exceptions import ValidationError


TASK_TYPES = {"classification", "regression"}
PREPROCESSING_DEFAULTS = {
    "test_size": 0.2,
    "val_size": 0.1,
    "use_cross_validation": False,
    "handle_missing": "mean",
    "scaling": "standard",
    "encode_categoricals": True,
    "drop_columns": [],
}


def parse_json_body(request: Request) -> dict:
    body = request.get_json(silent=True)
    if body is None:
        raise ValidationError("Request body must be valid JSON")
    if not isinstance(body, dict):
        raise ValidationError("Request body must be a JSON object")
    return body


def validate_experiment_request(body: dict) -> dict:
    required_fields = ["dataset_id", "target_column", "task_type", "models", "preprocessing"]
    missing = [field for field in required_fields if field not in body]
    if missing:
        raise ValidationError(
            f"Missing required field: {missing[0]}",
            details={"missing_fields": missing},
        )

    task_type = body["task_type"]
    if task_type not in TASK_TYPES:
        raise ValidationError("task_type must be 'classification' or 'regression'")

    models = body["models"]
    if not isinstance(models, list):
        raise ValidationError("models must be a list")
    if not models:
        raise ValidationError("Select at least one model")

    invalid_models = sorted(set(models) - set(MODEL_REGISTRY))
    if invalid_models:
        raise ValidationError(f"Unknown models: {', '.join(invalid_models)}")

    preprocessing = body["preprocessing"]
    if not isinstance(preprocessing, dict):
        raise ValidationError("preprocessing must be an object")

    normalized_preprocessing = {**PREPROCESSING_DEFAULTS, **preprocessing}
    _validate_split_sizes(normalized_preprocessing)

    return {
        "dataset_id": str(body["dataset_id"]),
        "target_column": str(body["target_column"]),
        "task_type": task_type,
        "models": models,
        "preprocessing": normalized_preprocessing,
    }


def _validate_split_sizes(preprocessing: dict) -> None:
    try:
        test_size = float(preprocessing["test_size"])
        val_size = float(preprocessing["val_size"])
    except (TypeError, ValueError):
        raise ValidationError("test_size and val_size must be numbers")

    if not 0 < test_size < 0.8:
        raise ValidationError("test_size must be greater than 0 and less than 0.8")
    if not 0 <= val_size < 0.8:
        raise ValidationError("val_size must be at least 0 and less than 0.8")
    if test_size + val_size >= 0.9:
        raise ValidationError("test_size and val_size leave too little training data")

    preprocessing["test_size"] = test_size
    preprocessing["val_size"] = val_size
