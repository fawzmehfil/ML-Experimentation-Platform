"""
ML Experimentation Platform - Flask Backend
Entry point for the application.

CORS is handled manually via after_request so flask-cors is NOT required.
"""

import os
from flask import Flask, request, make_response

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from models.database import init_db
from routes.dataset_routes import dataset_bp
from routes.experiment_routes import experiment_bp


def create_app():
    app = Flask(__name__)

    app.config["UPLOAD_FOLDER"] = os.getenv("UPLOAD_FOLDER", "./uploads")
    app.config["DATABASE_PATH"] = os.getenv("DATABASE_PATH", "./experiments.db")
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", 16_777_216))
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")

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

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    init_db(app.config["DATABASE_PATH"])

    app.register_blueprint(dataset_bp, url_prefix="/api")
    app.register_blueprint(experiment_bp, url_prefix="/api")

    @app.route("/api/health")
    def health():
        return {"status": "ok", "message": "ML Platform API is running"}

    return app


def _apply_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


if __name__ == "__main__":
    app = create_app()
    # Listen on 0.0.0.0 so both localhost and 127.0.0.1 work
    app.run(debug=True, port=5001, host="0.0.0.0")