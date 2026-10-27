import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa

from crypto_utils import (
    generate_key_pair,
    load_private_key,
    load_public_key,
    serialize_private_key,
    serialize_public_key,
)


def test_generated_key_pair_is_rsa_2048_with_expected_exponent():
    private_key, public_key = generate_key_pair()

    assert private_key.key_size == 2048
    assert public_key.key_size == 2048
    assert private_key.public_key().public_numbers().e == 65537


def test_unencrypted_private_key_round_trips():
    private_key, _ = generate_key_pair()

    pem = serialize_private_key(private_key)
    loaded = load_private_key(pem)

    assert b"BEGIN PRIVATE KEY" in pem
    assert b"ENCRYPTED" not in pem
    assert loaded.private_numbers() == private_key.private_numbers()


def test_encrypted_private_key_round_trips_with_password():
    private_key, _ = generate_key_pair()

    pem = serialize_private_key(private_key, "correct horse battery staple")
    loaded = load_private_key(pem, "correct horse battery staple")

    assert b"BEGIN ENCRYPTED PRIVATE KEY" in pem
    assert loaded.private_numbers() == private_key.private_numbers()


def test_encrypted_private_key_rejects_wrong_password():
    private_key, _ = generate_key_pair()
    pem = serialize_private_key(private_key, "right password")

    with pytest.raises(ValueError):
        load_private_key(pem, "wrong password")


def test_public_key_round_trips():
    _, public_key = generate_key_pair()

    pem = serialize_public_key(public_key)
    loaded = load_public_key(pem)

    assert b"BEGIN PUBLIC KEY" in pem
    assert loaded.public_numbers() == public_key.public_numbers()


def test_load_private_key_rejects_rsa_key_smaller_than_2048():
    small_key = rsa.generate_private_key(public_exponent=65537, key_size=1024)

    with pytest.raises(ValueError):
        load_private_key(serialize_private_key(small_key))


def test_load_public_key_rejects_rsa_key_smaller_than_2048():
    small_key = rsa.generate_private_key(public_exponent=65537, key_size=1024)

    with pytest.raises(ValueError):
        load_public_key(serialize_public_key(small_key.public_key()))


def test_load_private_key_rejects_non_rsa_key():
    ec_key = ec.generate_private_key(ec.SECP256R1())

    with pytest.raises(ValueError):
        load_private_key(serialize_private_key(ec_key))


def test_load_public_key_rejects_non_rsa_key():
    ec_key = ec.generate_private_key(ec.SECP256R1())

    with pytest.raises(ValueError):
        load_public_key(serialize_public_key(ec_key.public_key()))
