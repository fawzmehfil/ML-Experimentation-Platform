from flask import Blueprint, current_app, request

from services import experiment_service
from utils.responses import success_response
from utils.validation import parse_json_body, validate_experiment_request

experiment_bp = Blueprint("experiment", __name__)


@experiment_bp.route("/experiments/run", methods=["POST"])
def run_experiment():
    request_data = validate_experiment_request(parse_json_body(request))
    result = experiment_service.create_experiment_run(
        request_data,
        db_path=current_app.config["DATABASE_PATH"],
    )
    return success_response(result, status_code=201)


@experiment_bp.route("/experiments", methods=["GET"])
def list_experiments():
    experiments = experiment_service.list_experiments(current_app.config["DATABASE_PATH"])
    return success_response(experiments)


@experiment_bp.route("/experiments/<experiment_id>", methods=["GET"])
def get_experiment(experiment_id):
    experiment = experiment_service.get_experiment(
        experiment_id,
        db_path=current_app.config["DATABASE_PATH"],
    )
    return success_response(experiment)


@experiment_bp.route("/experiments/<experiment_id>/export", methods=["GET"])
def export_experiment(experiment_id):
    experiment = experiment_service.get_experiment(
        experiment_id,
        db_path=current_app.config["DATABASE_PATH"],
    )
    return success_response(experiment)


@experiment_bp.route("/leaderboard", methods=["GET"])
def leaderboard():
    entries = experiment_service.build_leaderboard(current_app.config["DATABASE_PATH"])
    return success_response(entries)
