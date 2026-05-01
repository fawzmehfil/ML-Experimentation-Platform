"""
Consistent JSON response helpers for the REST API.
"""

from flask import jsonify


def success_response(data=None, *, status_code: int = 200, meta: dict | None = None):
    return jsonify({
        "success": True,
        "data": data,
        "error": None,
        "meta": meta or {},
    }), status_code


def error_response(
    message: str,
    *,
    status_code: int = 500,
    code: str = "internal_error",
    details: dict | None = None,
):
    return jsonify({
        "success": False,
        "data": None,
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        },
        "meta": {},
    }), status_code
