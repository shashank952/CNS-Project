import sqlite3
from contextlib import closing
from datetime import datetime, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_filename TEXT NOT NULL,
    operation_type TEXT NOT NULL CHECK (operation_type IN ('sign', 'verify')),
    result TEXT NOT NULL CHECK (result IN ('success', 'failure')),
    reason_code TEXT,
    algorithm TEXT NOT NULL,
    document_sha256 TEXT,
    created_at TEXT NOT NULL
)
"""

INSERT_OPERATION = """
INSERT INTO operations (
    document_filename,
    operation_type,
    result,
    reason_code,
    algorithm,
    document_sha256,
    created_at
) VALUES (?, ?, ?, ?, ?, ?, ?)
"""


def utc_now_iso():
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="microseconds")
        .replace("+00:00", "Z")
    )


def connect(app):
    connection = sqlite3.connect(app.config["DATABASE"])
    connection.row_factory = sqlite3.Row
    return connection


def init_db(app):
    with closing(connect(app)) as connection:
        connection.execute(SCHEMA)
        connection.commit()


def record_operation(
    app,
    *,
    document_filename,
    operation_type,
    result,
    reason_code,
    algorithm,
    document_sha256,
    created_at,
):
    with closing(connect(app)) as connection:
        cursor = connection.execute(
            INSERT_OPERATION,
            (
                document_filename,
                operation_type,
                result,
                reason_code,
                algorithm,
                document_sha256,
                created_at,
            ),
        )
        connection.commit()
        return cursor.lastrowid
