# 03: Sign a Document and download its Signature Artifact

**What to build:** A user uploads a PDF or TXT Document and a Private Key, enters the Password when the key is encrypted, and signs. The page shows the Document Fingerprint and algorithm, and offers the `.sig` file for download. The Signing Operation is recorded.

**Blocked by:** 02 (generate and download a Key Pair)

**Status:** done

- [x] Signing uses RSA-PSS with SHA-256, MGF1-SHA-256, and `PSS.MAX_LENGTH`, over the Document's original bytes.
- [x] The database is initialized and a successful Signing Operation is recorded with metadata only — no Private Key, Password, or document contents.
- [x] `POST /api/sign` validates multipart input and limits (12 MB request, 10 MB Document, 64 KB key), uses temporary files and removes them afterward, returns metadata plus the base64 Signature Artifact, and maps failures to the agreed error codes.
- [x] The Generate Signature page supports PDF/TXT upload, Private Key plus optional Password, validation, progress, success metadata, `.sig` download only after success, and a clear action.
- [x] Tests cover TXT and PDF signing, missing, oversized and unsupported inputs, malformed Private Keys, a wrong Password, persistence of the Operation Record, and the page states.
- [x] The downloaded artifact is raw binary, named from the Document stem.
