import base64
import hashlib
import os
import shutil
import tempfile

from cryptography.exceptions import UnsupportedAlgorithm
from flask import Blueprint, current_app, jsonify, request

from api_errors import ApiError, error_response
from crypto_utils import ALGORITHM, load_private_key, sign_document
from database import record_operation, utc_now_iso

signing_bp = Blueprint("signing", __name__)

ALLOWED_EXTENSIONS = (".pdf", ".txt")


@signing_bp.post("/api/sign")
def sign():
    try:
        document_upload = request.files.get("document")
        key_upload = request.files.get("private_key")
        password = request.form.get("password") or None

        document_bytes, document_name = _read_document(document_upload)
        key_bytes = _read_upload(
            key_upload,
            current_app.config["MAX_KEY_BYTES"],
            "A Private Key is required.",
            "The Private Key exceeds the size limit.",
        )
        private_key = _load_private_key(key_bytes, password)

        signature = sign_document(private_key, document_bytes)
        signed_at = utc_now_iso()
        fingerprint = hashlib.sha256(document_bytes).hexdigest()

        operation_id = record_operation(
            current_app,
            document_filename=document_name,
            operation_type="sign",
            result="success",
            reason_code=None,
            algorithm=ALGORITHM,
            document_sha256=fingerprint,
            created_at=signed_at,
        )

        return jsonify(
            operation_id=operation_id,
            document_filename=document_name,
            document_size=len(document_bytes),
            document_sha256=fingerprint,
            algorithm=ALGORITHM,
            signed_at=signed_at,
            signature_filename=_signature_filename(document_name),
            signature_base64=base64.b64encode(signature).decode("ascii"),
        )
    except ApiError as error:
        return error_response(error.code, error.message, error.status)
    except Exception:
        return error_response(
            "internal_error",
            "Could not sign the Document.",
            500,
        )


def _read_document(upload):
    document_bytes = _read_upload(
        upload,
        current_app.config["MAX_DOCUMENT_BYTES"],
        "A Document is required.",
        "The Document exceeds the size limit.",
    )

    filename = os.path.basename(upload.filename or "")
    extension = os.path.splitext(filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ApiError(
            "unsupported_type",
            "Only PDF and TXT Documents are supported.",
            415,
        )

    if extension == ".pdf" and not document_bytes.startswith(b"%PDF-"):
        raise ApiError(
            "unsupported_type",
            "The uploaded PDF is not a valid PDF file.",
            415,
        )

    return document_bytes, filename


def _read_upload(upload, max_bytes, missing_message, too_large_message):
    if upload is None or not upload.filename:
        raise ApiError("missing_input", missing_message, 400)

    upload.stream.seek(0, os.SEEK_END)
    size = upload.stream.tell()
    upload.stream.seek(0)

    if size > max_bytes:
        raise ApiError("file_too_large", too_large_message, 413)

    descriptor, temp_path = tempfile.mkstemp(prefix="dss-")
    try:
        with os.fdopen(descriptor, "wb") as temp_file:
            shutil.copyfileobj(upload.stream, temp_file)
        with open(temp_path, "rb") as temp_file:
            data = temp_file.read()
    finally:
        try:
            os.unlink(temp_path)
        except FileNotFoundError:
            pass

    return data


def _load_private_key(key_bytes, password):
    encrypted = b"ENCRYPTED" in key_bytes

    try:
        return load_private_key(key_bytes, password if encrypted else None)
    except (TypeError, ValueError, UnsupportedAlgorithm):
        if encrypted:
            message = (
                "The Private Key is encrypted; a Password is required."
                if not password
                else "The Private Key could not be decrypted. Check the Password."
            )
            raise ApiError("invalid_private_key_password", message, 422)
        raise ApiError(
            "invalid_private_key",
            "The Private Key must be an RSA-2048 PEM file.",
            400,
        )


def _signature_filename(document_filename):
    stem = os.path.splitext(os.path.basename(document_filename))[0]
    return f"{stem or 'document'}.sig"
