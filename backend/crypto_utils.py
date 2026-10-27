from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

KEY_SIZE = 2048
PUBLIC_EXPONENT = 65537


def generate_key_pair():
    private_key = rsa.generate_private_key(
        public_exponent=PUBLIC_EXPONENT,
        key_size=KEY_SIZE,
    )
    return private_key, private_key.public_key()


def serialize_private_key(private_key, password=None):
    encryption = (
        serialization.BestAvailableEncryption(password.encode("utf-8"))
        if password
        else serialization.NoEncryption()
    )
    return private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=encryption,
    )


def serialize_public_key(public_key):
    return public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )


def load_private_key(pem_data, password=None):
    private_key = serialization.load_pem_private_key(
        pem_data,
        password=password.encode("utf-8") if password else None,
    )
    _require_rsa_2048(private_key)
    return private_key


def load_public_key(pem_data):
    public_key = serialization.load_pem_public_key(pem_data)
    _require_rsa_2048(public_key)
    return public_key


def _require_rsa_2048(key):
    if not isinstance(key, (rsa.RSAPrivateKey, rsa.RSAPublicKey)):
        raise ValueError("Key must be RSA")
    if key.key_size != KEY_SIZE:
        raise ValueError("Key must be RSA-2048")
