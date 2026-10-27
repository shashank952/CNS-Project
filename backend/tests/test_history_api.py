from database import record_operation, utc_now_iso


def seed(app, document="note.txt", operation="sign", result="success", reason=None):
    return record_operation(
        app,
        document_filename=document,
        operation_type=operation,
        result=result,
        reason_code=reason,
        algorithm="RSA-PSS-SHA256",
        document_sha256="a" * 64,
        created_at=utc_now_iso(),
    )


def test_history_returns_newest_first(client, app):
    first = seed(app, document="one.txt")
    second = seed(app, document="two.txt")
    third = seed(app, document="three.txt")

    response = client.get("/api/history")

    assert response.status_code == 200
    records = response.get_json()["records"]
    assert [record["id"] for record in records] == [third, second, first]
    assert records[0]["document_filename"] == "three.txt"
    assert records[0]["operation_type"] == "sign"
    assert records[0]["result"] == "success"
    assert records[0]["algorithm"] == "RSA-PSS-SHA256"
    assert records[0]["created_at"].endswith("Z")


def test_history_filters_by_operation(client, app):
    seed(app, operation="sign")
    seed(app, operation="verify")
    seed(app, operation="sign")

    signs = client.get("/api/history?operation=sign").get_json()["records"]
    verifies = client.get("/api/history?operation=verify").get_json()["records"]

    assert len(signs) == 2
    assert all(record["operation_type"] == "sign" for record in signs)
    assert len(verifies) == 1
    assert verifies[0]["operation_type"] == "verify"


def test_history_filters_by_result(client, app):
    seed(app, operation="verify", result="success")
    seed(app, operation="verify", result="failure", reason="verification_failed")

    failures = client.get("/api/history?result=failure").get_json()["records"]

    assert len(failures) == 1
    assert failures[0]["result"] == "failure"
    assert failures[0]["reason_code"] == "verification_failed"


def test_history_combines_filters(client, app):
    seed(app, operation="verify", result="success")
    seed(app, operation="verify", result="failure", reason="verification_failed")
    seed(app, operation="sign", result="success")

    records = client.get(
        "/api/history?operation=verify&result=failure"
    ).get_json()["records"]

    assert len(records) == 1
    assert records[0]["operation_type"] == "verify"
    assert records[0]["result"] == "failure"


def test_history_rejects_unknown_filters(client, app):
    for query in ["?operation=delete", "?result=maybe"]:
        response = client.get(f"/api/history{query}")

        assert response.status_code == 400
        assert response.get_json()["error"]["code"] == "invalid_filter"


def test_history_is_empty_for_fresh_database(client):
    response = client.get("/api/history")

    assert response.status_code == 200
    assert response.get_json() == {"records": []}


def test_clear_history_deletes_all_and_returns_count(client, app):
    seed(app)
    seed(app)

    response = client.delete("/api/history")

    assert response.status_code == 200
    assert response.get_json() == {"deleted": 2}
    assert client.get("/api/history").get_json() == {"records": []}
    assert client.delete("/api/history").get_json() == {"deleted": 0}


def test_dashboard_stats_counts_and_recent(client, app):
    seed(app, operation="sign", result="success")
    seed(app, operation="sign", result="success")
    seed(app, operation="verify", result="success")
    last = seed(app, operation="verify", result="failure", reason="verification_failed")

    response = client.get("/api/dashboard/stats")

    assert response.status_code == 200
    body = response.get_json()
    assert body["total_signing_operations"] == 2
    assert body["total_verification_attempts"] == 2
    assert body["successful_verifications"] == 1
    assert body["failed_verifications"] == 1
    assert len(body["recent_activity"]) == 4
    assert body["recent_activity"][0]["id"] == last


def test_dashboard_stats_empty(client):
    response = client.get("/api/dashboard/stats")

    assert response.status_code == 200
    assert response.get_json() == {
        "total_signing_operations": 0,
        "total_verification_attempts": 0,
        "successful_verifications": 0,
        "failed_verifications": 0,
        "recent_activity": [],
    }


def test_dashboard_recent_activity_is_limited_to_ten(client, app):
    ids = [seed(app) for _ in range(12)]

    recent = client.get("/api/dashboard/stats").get_json()["recent_activity"]

    assert len(recent) == 10
    assert [record["id"] for record in recent] == list(reversed(ids))[:10]


def test_history_hides_unexpected_errors(client, monkeypatch):
    import routes.history as history_module

    def explode(*args, **kwargs):
        raise RuntimeError("boom")

    monkeypatch.setattr(history_module, "list_operations", explode)

    response = client.get("/api/history")

    assert response.status_code == 500
    assert response.get_json()["error"]["code"] == "internal_error"
    assert "boom" not in response.get_data(as_text=True)
