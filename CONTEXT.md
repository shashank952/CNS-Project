# Digital Signature System

A local web application for producing and checking digital signatures over documents. Its domain is the relationship between a document's exact bytes, a key pair, and a signature artifact.

## Language

**Document**:
The exact byte sequence submitted for signing or verification. Its identity is its bytes; a filename is only a label.
_Avoid_: File, upload, content

**Key Pair**:
A matched private key and public key. The private key produces signatures; the public key checks them.
_Avoid_: Credentials, certificate

**Private Key**:
The secret half of a Key Pair, used to produce a Signature Artifact. It may be protected by a Password when exported.
_Avoid_: Secret key, signing key

**Public Key**:
The shareable half of a Key Pair, used to check a Signature Artifact.
_Avoid_: Verification key, certificate

**Password**:
An optional secret that encrypts an exported Private Key. It is never stored.
_Avoid_: Passphrase, PIN

**Signing Operation**:
A completed act of producing a Signature Artifact for a Document with a Private Key. Only successful Signing Operations are recorded.
_Avoid_: Sign request, signature generation

**Verification Attempt**:
A completed act of checking a Signature Artifact against a Document and Public Key. Every completed attempt is recorded, whether Valid or Invalid.
_Avoid_: Verify request, validation

**Signature Artifact**:
The output of a Signing Operation, bound to the exact Document bytes and Key Pair that produced it. Opaque bytes; its validity is decided only by a Verification Attempt.
_Avoid_: Signature file, sig, hash

**Document Fingerprint**:
The SHA-256 digest of a Document's bytes, shown for reference. It is not proof of authenticity.
_Avoid_: Hash, checksum, digest

**Valid**:
The outcome of a Verification Attempt whose Signature Artifact matches the Document and Public Key.
_Avoid_: Success, verified, authentic

**Invalid**:
The outcome of a Verification Attempt whose Signature Artifact does not match the Document or Public Key. It does not reveal which of the two is wrong.
_Avoid_: Failed, tampered, forged

**Operation Record**:
The stored metadata describing a Signing Operation or Verification Attempt.
_Avoid_: History entry, log, audit record
