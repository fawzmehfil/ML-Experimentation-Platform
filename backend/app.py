import os
import logging

from flask import Flask, current_app, request, make_response
from werkzeug.exceptions import HTTPException

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from config import AppConfig
from models.database import init_db
from routes.dataset_routes import dataset_bp
from routes.experiment_routes import experiment_bp
from utils.exceptions import APIError
from utils.responses import error_response, success_response


def create_app(config: AppConfig | None = None):
    config = config or AppConfig.from_env()
    logging.basicConfig(
        level=getattr(logging, config.log_level, logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    app = Flask(__name__)
    app.config.from_mapping(config.to_flask_config())

    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            resp = make_response("", 204)
            _apply_cors(resp)
            return resp

    @app.after_request
    def apply_cors_headers(response):
        _apply_cors(response)
        return response

    @app.errorhandler(APIError)
    def handle_api_error(error):
        current_logger = logging.getLogger(__name__)
        if error.status_code >= 500:
            current_logger.exception("API error: %s", error.message)
        return error_response(
            error.message,
            status_code=error.status_code,
            code=error.code,
            details=error.details,
        )

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return error_response(
            error.description,
            status_code=error.code or 500,
            code="http_error",
        )

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        logging.getLogger(__name__).exception("Unhandled API error")
        return error_response("Unexpected server error", status_code=500)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    init_db(app.config["DATABASE_PATH"])

    app.register_blueprint(dataset_bp, url_prefix="/api")
    app.register_blueprint(experiment_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return success_response({"status": "ok", "message": "ML Platform API is running"})

    return app


def _apply_cors(response):
    response.headers["Access-Control-Allow-Origin"] = current_app.config["CORS_ALLOW_ORIGIN"]
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


if __name__ == "__main__":
    app = create_app()
    app.run(debug=app.config["DEBUG"], port=int(os.getenv("PORT", "5001")), host=os.getenv("HOST", "0.0.0.0"))
