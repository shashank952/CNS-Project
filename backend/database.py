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


OPERATION_COLUMNS = (
    "id, document_filename, operation_type, result, reason_code, "
    "algorithm, document_sha256, created_at"
)


def list_operations(app, operation=None, result=None, limit=None):
    query = f"SELECT {OPERATION_COLUMNS} FROM operations"
    clauses = []
    params = []

    if operation is not None:
        clauses.append("operation_type = ?")
        params.append(operation)
    if result is not None:
        clauses.append("result = ?")
        params.append(result)
    if clauses:
        query += " WHERE " + " AND ".join(clauses)

    query += " ORDER BY id DESC"

    if limit is not None:
        query += " LIMIT ?"
        params.append(limit)

    with closing(connect(app)) as connection:
        rows = connection.execute(query, params).fetchall()

    return [dict(row) for row in rows]


def delete_operations(app):
    with closing(connect(app)) as connection:
        cursor = connection.execute("DELETE FROM operations")
        connection.commit()
        return cursor.rowcount


def dashboard_stats(app):
    with closing(connect(app)) as connection:
        counts = connection.execute(
            """
            SELECT
                COALESCE(SUM(operation_type = 'sign'), 0)
                    AS total_signing_operations,
                COALESCE(SUM(operation_type = 'verify'), 0)
                    AS total_verification_attempts,
                COALESCE(
                    SUM(operation_type = 'verify' AND result = 'success'), 0
                ) AS successful_verifications,
                COALESCE(
                    SUM(operation_type = 'verify' AND result = 'failure'), 0
                ) AS failed_verifications
            FROM operations
            """
        ).fetchone()
        recent = connection.execute(
            f"SELECT {OPERATION_COLUMNS} FROM operations "
            "ORDER BY id DESC LIMIT 10"
        ).fetchall()

    return {
        "total_signing_operations": counts["total_signing_operations"],
        "total_verification_attempts": counts["total_verification_attempts"],
        "successful_verifications": counts["successful_verifications"],
        "failed_verifications": counts["failed_verifications"],
        "recent_activity": [dict(row) for row in recent],
    }
