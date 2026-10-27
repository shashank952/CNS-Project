import pytest
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding

from crypto_utils import generate_key_pair, sign_document


def pss():
    return padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH,
    )


def test_sign_document_verifies_with_matching_public_key():
    private_key, public_key = generate_key_pair()
    document = b"quarterly report"

    signature = sign_document(private_key, document)

    public_key.verify(signature, document, pss(), hashes.SHA256())


def test_sign_document_fails_verification_after_one_byte_changes():
    private_key, public_key = generate_key_pair()
    signature = sign_document(private_key, b"quarterly report")

    with pytest.raises(InvalidSignature):
        public_key.verify(signature, b"quarterly reporT", pss(), hashes.SHA256())


def test_sign_document_fails_verification_with_wrong_public_key():
    private_key, _ = generate_key_pair()
    _, other_public_key = generate_key_pair()
    signature = sign_document(private_key, b"quarterly report")

    with pytest.raises(InvalidSignature):
        other_public_key.verify(
            signature, b"quarterly report", pss(), hashes.SHA256()
        )


def test_sign_document_is_randomized_by_pss():
    private_key, _ = generate_key_pair()

    first = sign_document(private_key, b"same bytes")
    second = sign_document(private_key, b"same bytes")

    assert first != second
