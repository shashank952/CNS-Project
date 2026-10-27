import io
import zipfile

from crypto_utils import load_private_key


def open_archive(response):
    return zipfile.ZipFile(io.BytesIO(response.data))


def test_generate_without_password_returns_zip_with_pem_files(client):
    response = client.post("/api/keys/generate")

    assert response.status_code == 200
    assert response.mimetype == "application/zip"
    assert "rsa-keypair.zip" in response.headers["Content-Disposition"]

    archive = open_archive(response)
    assert set(archive.namelist()) == {"public.pem", "private.pem"}

    private_pem = archive.read("private.pem")
    public_pem = archive.read("public.pem")

    assert b"BEGIN PRIVATE KEY" in private_pem
    assert b"ENCRYPTED" not in private_pem
    assert b"BEGIN PUBLIC KEY" in public_pem

    private_key = load_private_key(private_pem)
    assert private_key.key_size == 2048


def test_generate_with_password_returns_encrypted_private_key(client):
    response = client.post("/api/keys/generate", data={"password": "secret"})

    assert response.status_code == 200

    private_pem = open_archive(response).read("private.pem")

    assert b"BEGIN ENCRYPTED PRIVATE KEY" in private_pem
    assert load_private_key(private_pem, "secret").key_size == 2048


def test_generate_treats_blank_password_as_unencrypted(client):
    response = client.post("/api/keys/generate", data={"password": ""})

    private_pem = open_archive(response).read("private.pem")

    assert b"ENCRYPTED" not in private_pem


def test_generate_hides_unexpected_errors(client, monkeypatch):
    import routes.keys as keys_module

    def explode():
        raise RuntimeError("boom")

    monkeypatch.setattr(keys_module, "generate_key_pair", explode)

    response = client.post("/api/keys/generate")

    assert response.status_code == 500
    assert response.get_json() == {
        "error": {
            "code": "internal_error",
            "message": "Could not generate the key pair.",
        }
    }
    assert "boom" not in response.get_data(as_text=True)
