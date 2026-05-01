"""
Application exceptions translated into API responses by app.py.
"""


class APIError(Exception):
    status_code = 500
    code = "internal_error"

    def __init__(self, message: str, *, details: dict | None = None):
        super().__init__(message)
        self.message = message
        self.details = details or {}


class ValidationError(APIError):
    status_code = 400
    code = "validation_error"


class UnprocessableEntityError(APIError):
    status_code = 422
    code = "unprocessable_entity"


class NotFoundError(APIError):
    status_code = 404
    code = "not_found"


class InternalServerError(APIError):
    status_code = 500
    code = "internal_error"
