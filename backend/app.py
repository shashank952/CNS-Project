import os

from flask import Flask, jsonify

from database import init_db
from routes.keys import keys_bp
from routes.signing import signing_bp
from routes.verification import verification_bp


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        DATABASE=os.path.join(app.instance_path, "app.db"),
        MAX_CONTENT_LENGTH=12 * 1024 * 1024,
        MAX_DOCUMENT_BYTES=10 * 1024 * 1024,
        MAX_KEY_BYTES=64 * 1024,
        MAX_SIGNATURE_BYTES=64 * 1024,
    )

    if test_config:
        app.config.update(test_config)

    os.makedirs(app.instance_path, exist_ok=True)
    init_db(app)

    app.register_blueprint(keys_bp)
    app.register_blueprint(signing_bp)
    app.register_blueprint(verification_bp)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    @app.errorhandler(413)
    def request_too_large(error):
        return (
            jsonify(
                error={
                    "code": "file_too_large",
                    "message": "The upload exceeds the allowed size.",
                }
            ),
            413,
        )

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5000)
