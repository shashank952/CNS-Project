from flask import Flask, jsonify

from routes.keys import keys_bp


def create_app():
    app = Flask(__name__)
    app.register_blueprint(keys_bp)

    @app.get("/api/health")
    def health():
        return jsonify(status="ok")

    return app


if __name__ == "__main__":
    create_app().run(host="127.0.0.1", port=5000)
