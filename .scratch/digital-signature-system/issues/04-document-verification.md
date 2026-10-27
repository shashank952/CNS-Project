# 04: Verify a Document and show Valid or Invalid

**What to build:** A user uploads a Document, its Signature Artifact, and a Public Key, and receives a clear Valid or Invalid result from the backend, with the Document Fingerprint and an honest explanation when Invalid. The Verification Attempt is recorded.

**Blocked by:** 03 (sign a Document)

**Status:** ready-for-agent

- [ ] Verification uses the same RSA-PSS parameters as signing; an empty artifact yields `invalid_signature_format`, a non-empty mismatch yields `verification_failed`, and a malformed or non-2048 Public Key yields `invalid_public_key`.
- [ ] `POST /api/verify` returns 200 with a `valid` boolean and metadata; missing, malformed, oversized, or unsupported input returns 4xx; responses never expose stack traces or internal paths.
- [ ] Completed Verification Attempts are recorded with `success` or `failure` plus `reason_code`; requests rejected before cryptography are not recorded.
- [ ] The Verify page drives its result only from the backend response and provides reset plus loading and error states.
- [ ] Tests cover Valid TXT and PDF verification, a single-byte tamper, a wrong Public Key, an empty artifact, a malformed key, a controlled 200 Invalid result, and UI rendering of backend results.
