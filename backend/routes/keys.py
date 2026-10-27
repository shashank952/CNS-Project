import io
import zipfile

from flask import Blueprint, jsonify, request, send_file

from crypto_utils import (
    generate_key_pair,
    serialize_private_key,
    serialize_public_key,
)

keys_bp = Blueprint("keys", __name__)


@keys_bp.post("/api/keys/generate")
def generate_keys():
    password = request.form.get("password") or None

    try:
        private_key, public_key = generate_key_pair()
        private_pem = serialize_private_key(private_key, password)
        public_pem = serialize_public_key(public_key)

        archive_buffer = io.BytesIO()
        with zipfile.ZipFile(
            archive_buffer, "w", zipfile.ZIP_DEFLATED
        ) as archive:
            archive.writestr("public.pem", public_pem)
            archive.writestr("private.pem", private_pem)

        archive_buffer.seek(0)
        return send_file(
            archive_buffer,
            mimetype="application/zip",
            as_attachment=True,
            download_name="rsa-keypair.zip",
        )
    except Exception:
        return (
            jsonify(
                error={
                    "code": "internal_error",
                    "message": "Could not generate the key pair.",
                }
            ),
            500,
        )
