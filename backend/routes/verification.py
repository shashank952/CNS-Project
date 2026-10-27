import hashlib

from cryptography.exceptions import InvalidSignature, UnsupportedAlgorithm
from flask import Blueprint, current_app, jsonify, request

from api_errors import ApiError, error_response
from crypto_utils import ALGORITHM, load_public_key, verify_document
from database import record_operation, utc_now_iso
from uploads import read_document, read_upload

verification_bp = Blueprint("verification", __name__)

INVALID_MESSAGE = (
    "The Signature Artifact does not match the Document or Public Key. "
    "The Document may have changed, or the Signature Artifact or Public Key "
    "may be wrong."
)


@verification_bp.post("/api/verify")
def verify():
    try:
        document_upload = request.files.get("document")
        signature_upload = request.files.get("signature")
        public_key_upload = request.files.get("public_key")

        document_bytes, document_name = read_document(
            document_upload, current_app.config["MAX_DOCUMENT_BYTES"]
        )
        signature_bytes = read_upload(
            signature_upload,
            current_app.config["MAX_SIGNATURE_BYTES"],
            "A Signature Artifact is required.",
            "The Signature Artifact exceeds the size limit.",
        )
        if not signature_bytes:
            raise ApiError(
                "invalid_signature_format",
                "The Signature Artifact is empty.",
                400,
            )

        public_key_bytes = read_upload(
            public_key_upload,
            current_app.config["MAX_KEY_BYTES"],
            "A Public Key is required.",
            "The Public Key exceeds the size limit.",
        )
        public_key = _load_public_key(public_key_bytes)

        fingerprint = hashlib.sha256(document_bytes).hexdigest()
        verified_at = utc_now_iso()

        try:
            valid = verify_document(
                public_key, signature_bytes, document_bytes
            )
            reason = None
            message = (
                "The Signature Artifact matches the Document and Public Key."
            )
        except InvalidSignature:
            valid = False
            reason = "verification_failed"
            message = INVALID_MESSAGE

        record_operation(
            current_app,
            document_filename=document_name,
            operation_type="verify",
            result="success" if valid else "failure",
            reason_code=reason,
            algorithm=ALGORITHM,
            document_sha256=fingerprint,
            created_at=verified_at,
        )

        return jsonify(
            valid=valid,
            reason=reason,
            message=message,
            document_filename=document_name,
            document_sha256=fingerprint,
            verified_at=verified_at,
        )
    except ApiError as error:
        return error_response(error.code, error.message, error.status)
    except Exception:
        return error_response(
            "internal_error",
            "Could not verify the Signature Artifact.",
            500,
        )


def _load_public_key(public_key_bytes):
    try:
        return load_public_key(public_key_bytes)
    except (TypeError, ValueError, UnsupportedAlgorithm):
        raise ApiError(
            "invalid_public_key",
            "The Public Key must be an RSA-2048 PEM file.",
            400,
        )
