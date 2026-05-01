import io
import os
import tempfile
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import create_app


class ApiContractTestCase(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        temp_path = Path(self.tmpdir.name)
        os.environ["DATABASE_PATH"] = str(temp_path / "experiments.db")
        os.environ["UPLOAD_FOLDER"] = str(temp_path / "uploads")
        os.environ["TESTING"] = "true"

        app = create_app()
        self.client = app.test_client()

    def tearDown(self):
        self.tmpdir.cleanup()
        os.environ.pop("DATABASE_PATH", None)
        os.environ.pop("UPLOAD_FOLDER", None)
        os.environ.pop("TESTING", None)

    def test_health_uses_success_response_envelope(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {
                "success": True,
                "data": {"status": "ok", "message": "ML Platform API is running"},
                "error": None,
                "meta": {},
            },
        )

    def test_upload_requires_csv_file(self):
        response = self.client.post(
            "/api/upload",
            data={"file": (io.BytesIO(b"not,csv\n1,2\n"), "notes.txt")},
            content_type="multipart/form-data",
        )

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertFalse(payload["success"])
        self.assertIsNone(payload["data"])
        self.assertEqual(
            payload["error"],
            {
                "code": "validation_error",
                "message": "Only CSV files are supported",
                "details": {},
            },
        )

    def test_upload_accepts_valid_csv(self):
        rows = ["age,income,target"]
        rows.extend(f"{20 + index},{40000 + index},1" for index in range(20))
        csv_data = "\n".join(rows).encode("utf-8")

        response = self.client.post(
            "/api/upload",
            data={"file": (io.BytesIO(csv_data), "training.csv")},
            content_type="multipart/form-data",
        )

        payload = response.get_json()
        self.assertEqual(response.status_code, 201)
        self.assertTrue(payload["success"])
        self.assertEqual(payload["data"]["filename"], "training.csv")
        self.assertEqual(payload["data"]["profile"]["num_rows"], 20)

    def test_list_datasets_returns_list_in_response_envelope(self):
        response = self.client.get("/api/datasets")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.get_json(),
            {
                "success": True,
                "data": [],
                "error": None,
                "meta": {},
            },
        )

    def test_run_experiment_rejects_missing_json_body(self):
        response = self.client.post("/api/experiments/run")

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertFalse(payload["success"])
        self.assertEqual(payload["error"]["code"], "validation_error")
        self.assertEqual(payload["error"]["message"], "Request body must be valid JSON")

    def test_run_experiment_rejects_unknown_models(self):
        response = self.client.post(
            "/api/experiments/run",
            json={
                "dataset_id": "dataset-1",
                "target_column": "target",
                "task_type": "regression",
                "models": ["mystery_model"],
                "preprocessing": {},
            },
        )

        self.assertEqual(response.status_code, 400)
        payload = response.get_json()
        self.assertFalse(payload["success"])
        self.assertEqual(payload["error"]["message"], "Unknown models: mystery_model")


if __name__ == "__main__":
    unittest.main()
