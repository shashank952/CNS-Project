import hashlib
import io
import sqlite3

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa

from crypto_utils import (
    generate_key_pair,
    serialize_public_key,
    sign_document,
)


def make_material():
    private_key, public_key = generate_key_pair()
    return {
        "private_key": private_key,
        "public_pem": serialize_public_key(public_key),
    }


def post_verify(client, document, filename, signature, public_pem, include=None):
    data = {}
    if include != "document":
        data["document"] = (io.BytesIO(document), filename)
    if include != "signature":
        data["signature"] = (io.BytesIO(signature), "artifact.sig")
    if include != "public_key":
        data["public_key"] = (io.BytesIO(public_pem), "public.pem")
    return client.post(
        "/api/verify", data=data, content_type="multipart/form-data"
    )


def fetch_rows(app):
    connection = sqlite3.connect(app.config["DATABASE"])
    connection.row_factory = sqlite3.Row
    try:
        return connection.execute(
            "SELECT * FROM operations ORDER BY id"
        ).fetchall()
    finally:
        connection.close()


def test_verify_valid_txt_returns_true_and_records_success(client, app):
    material = make_material()
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.txt", signature, material["public_pem"]
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["valid"] is True
    assert body["reason"] is None
    assert body["document_filename"] == "report.txt"
    assert body["document_sha256"] == hashlib.sha256(document).hexdigest()
    assert body["verified_at"].endswith("Z")

    rows = fetch_rows(app)
    assert len(rows) == 1
    row = rows[0]
    assert row["operation_type"] == "verify"
    assert row["result"] == "success"
    assert row["reason_code"] is None
    assert row["algorithm"] == "RSA-PSS-SHA256"
    assert row["document_sha256"] == body["document_sha256"]


def test_verify_valid_pdf_returns_true(client):
    material = make_material()
    document = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.pdf", signature, material["public_pem"]
    )

    assert response.status_code == 200
    assert response.get_json()["valid"] is True


def test_verify_tampered_document_returns_invalid_and_records_failure(client, app):
    material = make_material()
    signature = sign_document(material["private_key"], b"quarterly report")

    response = post_verify(
        client,
        b"quarterly reporT",
        "report.txt",
        signature,
        material["public_pem"],
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["valid"] is False
    assert body["reason"] == "verification_failed"
    assert "Document" in body["message"]

    rows = fetch_rows(app)
    assert len(rows) == 1
    assert rows[0]["result"] == "failure"
    assert rows[0]["reason_code"] == "verification_failed"


def test_verify_wrong_public_key_returns_invalid(client, app):
    material = make_material()
    other = make_material()
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.txt", signature, other["public_pem"]
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["valid"] is False
    assert body["reason"] == "verification_failed"

    rows = fetch_rows(app)
    assert len(rows) == 1
    assert rows[0]["result"] == "failure"


def test_verify_empty_signature_is_a_format_error(client, app):
    material = make_material()

    response = post_verify(
        client, b"quarterly report", "report.txt", b"", material["public_pem"]
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_signature_format"
    assert fetch_rows(app) == []


def test_verify_malformed_public_key_is_rejected(client, app):
    material = make_material()
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.txt", signature, b"not a key"
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_public_key"
    assert fetch_rows(app) == []


def test_verify_non_2048_public_key_is_rejected(client, app):
    material = make_material()
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)
    small_key = rsa.generate_private_key(public_exponent=65537, key_size=1024)

    response = post_verify(
        client,
        document,
        "report.txt",
        signature,
        serialize_public_key(small_key.public_key()),
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "invalid_public_key"
    assert fetch_rows(app) == []


@pytest.mark.parametrize("missing", ["document", "signature", "public_key"])
def test_verify_requires_all_three_inputs(client, app, missing):
    material = make_material()
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client,
        document,
        "report.txt",
        signature,
        material["public_pem"],
        include=missing,
    )

    assert response.status_code == 400
    assert response.get_json()["error"]["code"] == "missing_input"
    assert fetch_rows(app) == []


def test_verify_rejects_unsupported_document_type(client, app):
    material = make_material()
    document = b"binary"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "payload.exe", signature, material["public_pem"]
    )

    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "unsupported_type"
    assert fetch_rows(app) == []


def test_verify_rejects_pdf_without_magic_bytes(client, app):
    material = make_material()
    document = b"not a pdf"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.pdf", signature, material["public_pem"]
    )

    assert response.status_code == 415
    assert response.get_json()["error"]["code"] == "unsupported_type"
    assert fetch_rows(app) == []


def test_verify_rejects_oversized_document(client, app):
    material = make_material()
    app.config["MAX_DOCUMENT_BYTES"] = 4
    document = b"12345"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.txt", signature, material["public_pem"]
    )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "file_too_large"
    assert fetch_rows(app) == []


def test_verify_rejects_oversized_signature(client, app):
    material = make_material()
    app.config["MAX_SIGNATURE_BYTES"] = 4
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.txt", signature, material["public_pem"]
    )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "file_too_large"
    assert fetch_rows(app) == []


def test_verify_rejects_oversized_public_key(client, app):
    material = make_material()
    app.config["MAX_KEY_BYTES"] = 10
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)

    response = post_verify(
        client, document, "report.txt", signature, material["public_pem"]
    )

    assert response.status_code == 413
    assert response.get_json()["error"]["code"] == "file_too_large"
    assert fetch_rows(app) == []


def test_verify_hides_unexpected_errors(client, app, monkeypatch):
    import routes.verification as verification_module

    material = make_material()
    document = b"quarterly report"
    signature = sign_document(material["private_key"], document)

    def explode(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(verification_module, "verify_document", explode)

    response = post_verify(
        client, document, "report.txt", signature, material["public_pem"]
    )

    assert response.status_code == 500
    assert response.get_json()["error"]["code"] == "internal_error"
    assert "boom" not in response.get_data(as_text=True)
    assert fetch_rows(app) == []
