from flask import Blueprint, request, current_app

from services import dataset_service
from utils.responses import success_response

dataset_bp = Blueprint("dataset", __name__)


@dataset_bp.route("/upload", methods=["POST"])
def upload_dataset():
    result = dataset_service.upload_dataset(
        request.files.get("file"),
        upload_folder=current_app.config["UPLOAD_FOLDER"],
        db_path=current_app.config["DATABASE_PATH"],
    )
    return success_response(result, status_code=201)


@dataset_bp.route("/dataset/<dataset_id>/summary", methods=["GET"])
def get_dataset_summary(dataset_id):
    dataset = dataset_service.get_dataset_summary(dataset_id, db_path=current_app.config["DATABASE_PATH"])
    return success_response(dataset)


@dataset_bp.route("/datasets", methods=["GET"])
def list_datasets():
    datasets = dataset_service.list_datasets(current_app.config["DATABASE_PATH"])
    return success_response(datasets)
