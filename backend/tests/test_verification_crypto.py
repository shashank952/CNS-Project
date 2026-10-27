import pytest
from cryptography.exceptions import InvalidSignature

from crypto_utils import generate_key_pair, sign_document, verify_document


def test_verify_document_accepts_matching_signature():
    private_key, public_key = generate_key_pair()
    document = b"quarterly report"
    signature = sign_document(private_key, document)

    assert verify_document(public_key, signature, document) is True


def test_verify_document_rejects_tampered_document():
    private_key, public_key = generate_key_pair()
    signature = sign_document(private_key, b"quarterly report")

    with pytest.raises(InvalidSignature):
        verify_document(public_key, signature, b"quarterly reporT")


def test_verify_document_rejects_wrong_public_key():
    private_key, _ = generate_key_pair()
    _, other_public_key = generate_key_pair()
    document = b"quarterly report"
    signature = sign_document(private_key, document)

    with pytest.raises(InvalidSignature):
        verify_document(other_public_key, signature, document)


def test_verify_document_rejects_empty_signature():
    _, public_key = generate_key_pair()

    with pytest.raises(InvalidSignature):
        verify_document(public_key, b"", b"quarterly report")
