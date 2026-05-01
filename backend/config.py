"""
Environment-based application configuration.
"""

import os
from dataclasses import dataclass


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class AppConfig:
    upload_folder: str
    database_path: str
    max_content_length: int
    secret_key: str
    debug: bool
    testing: bool
    log_level: str
    cors_allow_origin: str

    @classmethod
    def from_env(cls) -> "AppConfig":
        return cls(
            upload_folder=os.getenv("UPLOAD_FOLDER", "./uploads"),
            database_path=os.getenv("DATABASE_PATH", "./experiments.db"),
            max_content_length=int(os.getenv("MAX_CONTENT_LENGTH", "16777216")),
            secret_key=os.getenv("SECRET_KEY", "dev-secret"),
            debug=_env_bool("FLASK_DEBUG", False),
            testing=_env_bool("TESTING", False),
            log_level=os.getenv("LOG_LEVEL", "INFO").upper(),
            cors_allow_origin=os.getenv("CORS_ALLOW_ORIGIN", "*"),
        )

    def to_flask_config(self) -> dict:
        return {
            "UPLOAD_FOLDER": self.upload_folder,
            "DATABASE_PATH": self.database_path,
            "MAX_CONTENT_LENGTH": self.max_content_length,
            "SECRET_KEY": self.secret_key,
            "DEBUG": self.debug,
            "TESTING": self.testing,
            "CORS_ALLOW_ORIGIN": self.cors_allow_origin,
        }
