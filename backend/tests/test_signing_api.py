import base64
import hashlib
import io
import os
import sqlite3
import tempfile

import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

from crypto_utils import (
    generate_key_pair,
    serialize_private_key,
)


def make_key(password=None):
    private_key, public_key = generate_key_pair()
    return serialize_private_key(private_key, password), public_key


def post_sign(client, document, filename, private_pem, password=None):
    data = {
        "document": (io.BytesIO(document), filename),
        "private_key": (io.BytesIO(private_pem), "private.pem"),
    }
    if password is not None:
        data["password"] = password
    return client.post(
        "/api/sign",
        data=data,
        content_type="multipart/form-data",
    )


def verify(public_key, signature, document):
    public_key.verify(
        signature,
        document,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=padding.PSS.MAX_LENGTH,
        ),
        hashes.SHA256(),
    )


def fetch_rows(app):
    connection = sqlite3.connect(app.config["DATABASE"])
    connection.row_factory = sqlite3.Row
    try:
        return connection.execute("SELECT * FROM operations").fetchall()
    finally:
        connection.close()


def test_sign_txt_returns_metadata_and_verifiable_signature(client, app):
    private_pem, public_key = make_key()
    document = b"quarterly report"

    response = post_sign(client, document, "report.txt", private_pem)

    assert response.status_code == 200
    body = response.get_json()

    assert body["operation_id"] == 1
    assert body["document_filename"] == "report.txt"
    assert body["document_size"] == len(document)
    assert body["document_sha256"] == hashlib.sha256(document).hexdigest()
    assert body["algorithm"] == "RSA-PSS-SHA256"
    assert body["signature_filename"] == "report.sig"
    assert body["signed_at"].endswith("Z")

    verify(public_key, base64.b64decode(body["signature_base64"]), document)

    rows = fetch_rows(app)
    assert len(rows) == 1
    row = rows[0]
    assert row["document_filename"] == "report.txt"
    assert row["operation_type"] == "sign"
    assert row["result"] == "success"
    assert row["reason_code"] is None
    assert row["algorithm"] == "RSA-PSS-SHA256"
    assert row["document_sha256"] == body["document_sha256"]
    assert row["created_at"] == body["signed_at"]


def test_sign_pdf_returns_verifiable_signature(client):
    private_pem, public_key = make_key()
    document = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"

    response = post_sign(client, document, "report.pdf", private_pem)

    assert response.status_code == 200
    verify(
        public_key,
        base64.b64decode(response.get_json()["signature_base64"]),
        document,
    )


def test_sign_with_encrypted_key_and_password(client, app):
    private_pem, public_key = make_key("secret")
    document = b"encrypted key"

    response = post_sign(client, document, "note.txt", private_pem, "secret")

    assert response.status_code == 200
    verify(
        public_key,
        base64.b64decode(response.get_json()["signature_base64"]),
        document,
    )

    rows = fetch_rows(app)
    assert len(rows) == 1
    assert "secret" not in str(tuple(rows[0]))
    assert "PRIVATE KEY" not in str(tuple(rows[0]))


@pytest.mark.parametrize("password", [None, "wrong"])
def test_sign_rejects_missing_or_wrong_password(client, app, password):
    private_pem, _ = make_key("secret")

    response = post_sign(client, b"note", "note.txt", private_pem, password)

    assert response.status_code == 422
    assert response.get_json()["error"]["code"] == "invalid_private_key_password"
    assert fetch_rows(app) == []


def test_sign_rejects_malformed_private_key(client, app):
    response = post_sign(client, b"note", "note.txt", b"not a pem")

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_private_key"
    assert fetch_rows(app) == []


@pytest.mark.parametrize("missing", ["document", "private_key"])
def test_sign_requires_both_files(client, missing):
    private_pem, _ = make_key()
    data = {}
    if missing != "document":
        data["document"] = (io.BytesIO(b"note"), "note.txt")
    if missing != "private_key":
        data["private_key"] = (io.BytesIO(private_pem), "private.pem")

    response = client.post(
        "/api/sign", data=data, content_type="multipart/form-data"
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "missing_input"


def test_sign_rejects_unsupported_document_type(client):
    private_pem, _ = make_key()

    response = post_sign(client, b"binary", "payload.exe", private_pem)

    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "unsupported_type"


def test_sign_rejects_pdf_without_magic_bytes(client):
    private_pem, _ = make_key()

    response = post_sign(client, b"not a pdf", "report.pdf", private_pem)

    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "unsupported_type"


def test_sign_rejects_oversized_document(client, app):
    private_pem, _ = make_key()
    app.config["MAX_DOCUMENT_BYTES"] = 4

    response = post_sign(client, b"12345", "note.txt", private_pem)

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "file_too_large"


def test_sign_rejects_oversized_private_key(client, app):
    private_pem, _ = make_key()
    app.config["MAX_KEY_BYTES"] = 10

    response = post_sign(client, b"note", "note.txt", private_pem)

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "file_too_large"


def test_sign_ignores_password_for_unencrypted_key(client):
    private_pem, public_key = make_key()
    document = b"note"

    response = post_sign(client, document, "note.txt", private_pem, "unused")

    assert response.status_code == 200
    verify(
        public_key,
        base64.b64decode(response.get_json()["signature_base64"]),
        document,
    )


def test_signature_filename_keeps_document_stem(client):
    private_pem, _ = make_key()

    response = post_sign(client, b"note", "archive.tar.txt", private_pem)

    assert response.get_json()["signature_filename"] == "archive.tar.sig"


def test_sign_cleans_up_temporary_files(client, monkeypatch):
    private_pem, _ = make_key()
    created_paths = []
    real_mkstemp = tempfile.mkstemp

    def tracking_mkstemp(*args, **kwargs):
        descriptor, path = real_mkstemp(*args, **kwargs)
        created_paths.append(path)
        return descriptor, path

    monkeypatch.setattr("uploads.tempfile.mkstemp", tracking_mkstemp)

    response = post_sign(client, b"note", "note.txt", private_pem)

    assert response.status_code == 200
    assert len(created_paths) == 2
    assert all(not os.path.exists(path) for path in created_paths)
