import sqlite3

from database import record_operation, utc_now_iso

EXPECTED_COLUMNS = {
    "id",
    "document_filename",
    "operation_type",
    "result",
    "reason_code",
    "algorithm",
    "document_sha256",
    "created_at",
}


def connect(app):
    connection = sqlite3.connect(app.config["DATABASE"])
    connection.row_factory = sqlite3.Row
    return connection


def test_operations_table_stores_metadata_only(app):
    with connect(app) as connection:
        columns = {
            row["name"]
            for row in connection.execute("PRAGMA table_info(operations)")
        }

    assert columns == EXPECTED_COLUMNS


def test_record_operation_persists_and_returns_id(app):
    created_at = utc_now_iso()

    operation_id = record_operation(
        app,
        document_filename="note.txt",
        operation_type="sign",
        result="success",
        reason_code=None,
        algorithm="RSA-PSS-SHA256",
        document_sha256="a" * 64,
        created_at=created_at,
    )

    assert operation_id == 1

    with connect(app) as connection:
        row = connection.execute(
            "SELECT * FROM operations WHERE id = ?", (operation_id,)
        ).fetchone()

    assert row["document_filename"] == "note.txt"
    assert row["operation_type"] == "sign"
    assert row["result"] == "success"
    assert row["reason_code"] is None
    assert row["algorithm"] == "RSA-PSS-SHA256"
    assert row["document_sha256"] == "a" * 64
    assert row["created_at"] == created_at


def test_utc_now_iso_returns_utc_timestamp():
    assert utc_now_iso().endswith("Z")
