def test_unknown_api_path_returns_json_404(client):
    response = client.get("/api/does-not-exist")

    assert response.status_code == 404
    assert response.get_json() == {
        "error": {"code": "not_found", "message": "Not found."}
    }


def test_api_root_returns_json_404(client):
    response = client.get("/api")

    assert response.status_code == 404
    assert response.get_json()["error"]["code"] == "not_found"
