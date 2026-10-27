# Digital Signature Generation and Verification System

A local full-stack course project for producing and checking digital signatures over PDF and TXT documents. A signer selects a Private Key; a recipient verifies the Document, Signature Artifact, and Public Key. The backend performs every cryptographic operation and is the sole authority on Valid or Invalid.

## Features

- RSA-2048 Key Pair generation with optional password-encrypted Private Key export.
- Signing PDF and TXT Documents over their original bytes.
- Downloadable raw `.sig` Signature Artifacts.
- Backend verification with an honest Valid/Invalid result and Document Fingerprint.
- TXT tamper demonstration: edit one character and watch verification fail.
- Dashboard with four live counts and recent activity.
- Activity History with operation/result filters, refresh, and confirmed clear-all.
- Metadata-only SQLite history; no Private Keys, Passwords, or document contents.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, CSS Modules |
| Backend | Python 3.12, Flask 3.1 |
| Cryptography | `cryptography` 50, RSA-2048, RSA-PSS, SHA-256 |
| Database | SQLite |
| Tests | Pytest, Vitest + React Testing Library |

## Architecture

```mermaid
flowchart LR
  UI[React + Vite] -->|JSON and multipart| API[Flask REST API]
  API --> CRYPTO[Crypto module]
  CRYPTO --> RSA[RSA-2048 / RSA-PSS / SHA-256]
  API --> DB[(SQLite metadata)]
```

- **Frontend** owns forms, uploads, downloads, and rendering. It never performs cryptography or decides validity.
- **API** owns validation, orchestration, error mapping, and Operation Records. Route handlers do not contain cryptographic primitives.
- **Crypto module** owns key generation, PEM serialization, signing, and verification.
- **SQLite** stores Operation Records only: filename, operation type, result, reason code, algorithm, fingerprint, and timestamp.

In development, Vite proxies `/api` to Flask. In single-origin mode, Flask serves the built frontend and the API from port 5000.

## Cryptography

- RSA-2048 with public exponent `65537`.
- RSA-PSS with SHA-256, MGF1-SHA-256, and `PSS.MAX_LENGTH`, identical for signing and verification.
- Signing always covers the Document's original bytes — never a filename, path, or frontend-computed hash.
- Private Keys export as PKCS#8 PEM; Public Keys as SubjectPublicKeyInfo PEM.
- A supplied Password encrypts the Private Key with `BestAvailableEncryption`; a blank Password exports it unencrypted with a visible warning.
- Imported keys must be RSA-2048.
- RSA-PSS is randomized, so two signatures over the same bytes differ while both verify.

Verification proves that a Signature Artifact matches a Document and a supplied Public Key. It does **not** prove who owns that key; see [ADR-0001](docs/adr/0001-single-verification-failure-category.md) and [Limitations](#limitations-and-future-work).

## Prerequisites

Verified on Windows 11 with PowerShell 5.1:

- Python 3.12.10
- Node.js 24.19.0
- npm 11.17.0

## Setup

From the repository root:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

## Run

### Development (two servers)

Terminal 1, from the repository root:

```powershell
backend\.venv\Scripts\python.exe backend\app.py
```

Terminal 2, from the repository root:

```powershell
cd frontend
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to `http://127.0.0.1:5000`.

### Single-origin demo (Flask serves the build)

```powershell
cd frontend
npm run build
cd ..
backend\.venv\Scripts\python.exe backend\app.py
```

Open <http://127.0.0.1:5000>. Client-side routes such as `/sign` fall back to `index.html`; unknown `/api/...` paths return JSON 404. If the build is missing, `/` returns a JSON error telling you to run `npm run build`.

## Step-by-step usage

### Before you start

- **Single-origin demo:** <http://127.0.0.1:5000> — Flask serves the built frontend and the API.
- **Development:** <http://localhost:5173> — Vite proxies `/api` to Flask.
- There is no login; the application runs entirely on this machine.
- If a page reports “The backend is unavailable,” restart the backend using [Stop and restart](#stop-and-restart).

### 1. Create a test document

Create a TXT file on your Desktop:

```powershell
Set-Content -LiteralPath "$env:USERPROFILE\Desktop\sample.txt" -Value "Hello from the digital signature demo." -NoNewline
```

For PDF testing, use any real PDF already on the machine. Keep the original files unchanged; the signature is bound to their exact bytes.

### 2. Generate a Key Pair

1. Open **Key Management** (`/keys`).
2. Optionally enter a **Password**.
   - A Password encrypts `private.pem`.
   - If you leave it blank, the page shows an unencrypted-export warning.
3. Click **Generate key pair**.
4. Wait for **Key pair ready**.
5. Click **Download key pair (.zip)**.
6. Extract `rsa-keypair.zip`:
   - `public.pem` — safe to share; used for verification.
   - `private.pem` — secret; used for signing.

**Expected result:** a ZIP containing both PEM files. If you supplied a Password, `private.pem` is encrypted.

The server does not store the Private Key. If you lose it or forget its Password, you cannot sign with that Key Pair again.

### 3. Sign a TXT Document

1. Open **Generate Signature** (`/sign`).
2. Upload `sample.txt` as the **Document**.
3. Upload `private.pem` as the **Private Key**.
4. Enter the **Password** only if the Private Key is encrypted.
5. Click **Sign Document**.
6. Wait for **Signature created**.

The success panel shows the filename, size, SHA-256 fingerprint, algorithm (`RSA-PSS-SHA256`), and signing timestamp.

7. Click **Download signature (`sample.sig`)**.

**Expected result:** `sample.sig` in the browser's Downloads folder.

RSA-PSS is randomized, so signing the same Document twice produces different `.sig` files that both verify.

### 4. Verify the Document

1. Open **Verify Signature** (`/verify`).
2. Upload:
   - **Document:** `sample.txt`
   - **Signature Artifact:** `sample.sig`
   - **Public Key:** `public.pem`
3. Click **Verify Signature**.

**Expected result:** a green **Valid** panel with:

- “The Signature Artifact matches the Document and Public Key.”
- The Document Fingerprint.
- The verification timestamp.

The backend performs the cryptographic check. The browser never decides validity.

### 5. Demonstrate tampering

1. On `/verify`, select a TXT Document.
2. A **Tamper demonstration** box appears, prefilled with the Document text.
3. Change one character — for example, `Hello` to `Jello`.
4. Click **Tamper & re-verify**.

**Expected result:** a red **Invalid** panel. The explanation lists all possible causes: the Document may have changed, or the Signature Artifact or Public Key may be wrong. RSA-PSS cannot distinguish them.

The attempt is recorded in History.

5. Click **Verify another** to reset the form.

If the TXT file is not valid UTF-8, the editor is disabled with an explanation. PDFs never show the editor.

### 6. Demonstrate a wrong Public Key

1. Return to **Key Management** and generate a second Key Pair.
2. Extract its `public.pem`.
3. Open `/verify`.
4. Upload the original `sample.txt`, the original `sample.sig`, and the **second** Key Pair's `public.pem`.
5. Click **Verify Signature**.

**Expected result:** **Invalid**, with the same `verification_failed` explanation.

Use the first Key Pair's `public.pem` again to see **Valid**.

### 7. Sign and verify a PDF

1. On `/sign`, upload a PDF and your `private.pem`.
2. Enter the Password if needed, then click **Sign Document**.
3. Download the generated `<pdf-name>.sig`.
4. On `/verify`, upload the PDF, its `.sig`, and `public.pem`.

**Expected result:** **Valid**.

PDFs do not get a tamper editor. To test an altered PDF, modify or replace the PDF itself and verify it against the original signature.

### 8. Use an encrypted Private Key

1. On `/keys`, enter a Password before generating.
2. On `/sign`, upload the encrypted `private.pem` and enter the same Password.

Signing succeeds. Test the failure cases:

- Omit the Password → “The Private Key is encrypted; a Password is required.”
- Enter the wrong Password → “The Private Key could not be decrypted. Check the Password.”

If the Private Key is unencrypted, a Password typed on the signing form is ignored.

### 9. Read the Dashboard

Open `/`. The four cards mean:

| Card | Meaning |
| --- | --- |
| Total signing operations | Successful signings recorded |
| Total verification attempts | Completed verifications, Valid or Invalid |
| Successful verifications | Verification Attempts that were Valid |
| Failed verifications | Verification Attempts that were Invalid |

Below the cards:

- **Quick actions** link to signing, verification, and key management.
- **Recent activity** shows the ten newest Operation Records.

With no records, the Dashboard shows zeros and an empty-state message.

### 10. Use Activity History

Open `/history`.

1. **Operation** filter: All, Sign, or Verify.
2. **Result** filter: All, Success, or Failure.
3. **Refresh** reloads the records.
4. **Clear history** opens a confirmation panel.
5. **Cancel** closes it without deleting.
6. **Delete all records** permanently removes every Operation Record.

Behaviour:

- Records are newest first.
- Filters combine, for example Verify + Failure.
- Clearing history also resets the Dashboard counts.
- Successful signings and completed verifications are recorded; rejected 4xx requests are not.
- History stores metadata only — no keys, Passwords, or document contents.

### 11. Stop and restart

Stop whichever servers are listening on ports 5000 and 5173:

```powershell
Get-NetTCPConnection -LocalPort 5000,5173 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { taskkill /PID $_.OwningProcess /T /F }
```

Restart the single-origin demo:

```powershell
cd frontend
npm run build
cd ..
backend\.venv\Scripts\python.exe backend\app.py
```

Open <http://127.0.0.1:5000>.

Restart development mode:

```powershell
# Terminal 1, from the repository root
backend\.venv\Scripts\python.exe backend\app.py

# Terminal 2, from the repository root
cd frontend
npm run dev
```

Open <http://localhost:5173>.

### 12. Common errors

| Symptom | Cause / fix |
| --- | --- |
| “The backend is unavailable” | Start the Flask server on port 5000 |
| “The Private Key is encrypted; a Password is required” | Enter the Password used when generating the key |
| “The Private Key could not be decrypted” | Wrong Password |
| “The Private Key must be an RSA-2048 PEM file” | Wrong file, malformed PEM, or non-2048 key |
| “The Public Key must be an RSA-2048 PEM file” | Wrong key or non-RSA key |
| “Only PDF and TXT Documents are supported” | Unsupported file extension |
| “The uploaded PDF is not a valid PDF file” | Missing `%PDF-` header or renamed non-PDF |
| “The Signature Artifact is empty” | Empty `.sig` file |
| **Invalid** result | Document changed, wrong `.sig`, or wrong `public.pem` |
| Port already in use | Stop the old server processes, then restart |

For direct HTTP calls, see [API](#api). Upload limits are listed under [Upload limits](#upload-limits), and security constraints under [Security](#security).

## API

All endpoints are under `/api`. Errors use:

```json
{ "error": { "code": "missing_input", "message": "A Document is required." } }
```

| Method | Endpoint | Input | Success |
| --- | --- | --- | --- |
| GET | `/api/health` | none | `200 {"status":"ok"}` |
| POST | `/api/keys/generate` | optional multipart `password` | `200` ZIP with `public.pem` and `private.pem` |
| POST | `/api/sign` | multipart `document`, `private_key`, optional `password` | `200` metadata + base64 Signature Artifact |
| POST | `/api/verify` | multipart `document`, `signature`, `public_key` | `200` with `valid`, `reason`, `message`, fingerprint |
| GET | `/api/history` | optional `operation=sign\|verify`, `result=success\|failure` | `200 {"records":[...]}` newest first |
| DELETE | `/api/history` | none | `200 {"deleted":<count>}` |
| GET | `/api/dashboard/stats` | none | `200` four counts + `recent_activity` |

Signing response fields: `operation_id`, `document_filename`, `document_size`, `document_sha256`, `algorithm`, `signed_at`, `signature_filename`, `signature_base64`. Base64 is transport only; the downloaded artifact is raw binary.

Verification returns HTTP 200 with `valid: false` for an ordinary cryptographic mismatch. Requests rejected before cryptography return 4xx and are not recorded.

### Reason codes

| Code | Status | Meaning |
| --- | --- | --- |
| `missing_input` | 400 | A required file is missing |
| `unsupported_type` | 415 | Not PDF/TXT, or a PDF without `%PDF-` magic bytes |
| `file_too_large` | 413 | Request, Document, key, or signature exceeds its limit |
| `invalid_public_key` | 400 | Not an RSA-2048 PEM Public Key |
| `invalid_signature_format` | 400 | Empty Signature Artifact |
| `invalid_private_key` | 400 | Not an RSA-2048 PEM Private Key |
| `invalid_private_key_password` | 422 | Encrypted key without a usable Password |
| `invalid_filter` | 400 | Unknown history filter value |
| `verification_failed` | 200 | Cryptographic mismatch; `valid: false` |
| `internal_error` | 500 | Generic failure with no stack trace or internal path |

`verification_failed` deliberately covers a modified Document, the wrong Public Key, and the wrong Signature Artifact. RSA-PSS cannot distinguish them.

## Upload limits

- 12 MB total request.
- 10 MB per Document.
- 64 KB per Private Key, Public Key, and Signature Artifact.
- Uploads stream to temporary files and are removed in a `finally` path.

## Security

- The app never persists, logs, or commits Private Keys or Passwords.
- The Private Key is returned only inside the generated ZIP and is never displayed in full or written to browser storage.
- The backend decides validity; the frontend only renders the response.
- SQLite access uses parameterized queries and stores metadata only.
- Flask runs with `debug=False`; unexpected errors return a generic JSON envelope.
- The demo is single-origin, so no permissive CORS is configured.
- Identity verification, authentication, certificates, cloud key storage, blockchain, and third-party APIs are out of scope.

## Testing

```powershell
cd backend
.venv\Scripts\python.exe -m pytest
cd ..\frontend
npm test
npm run build
```

Actual results on 2026-10-27:

| Command | Result |
| --- | --- |
| Backend Pytest | **69 passed** |
| Frontend Vitest | **31 passed** across 7 test files |
| Frontend production build | **pass** (39 modules) |

The backend suite covers crypto parameters, key round trips, signing/verification, upload limits, error envelopes, history filters, aggregates, clear-all, and JSON 404 behavior. The frontend suite covers navigation, all five pages, validation, downloads, backend-driven results, the tamper editor, history filters, and clear confirmation.

### End-to-end verification

Executed against the single-origin build at `http://127.0.0.1:5000` with fresh keys:

| Step | Result |
| --- | --- |
| Generate Key Pair | ZIP with `public.pem` and `private.pem` |
| Sign `note.txt` | Operation 1, `.sig` produced |
| Sign `doc.pdf` | Operation 2, `.sig` produced |
| Verify original TXT | `valid: true` |
| Verify original PDF | `valid: true` |
| Verify tampered TXT | `valid: false`, `verification_failed` |
| Verify with wrong Public Key | `valid: false`, `verification_failed` |
| Dashboard statistics | 2 signings, 4 verifications, 2 successful, 2 failed |
| Database | 6 Operation Records, metadata only |
| Single-origin SPA | `/` and `/sign` return HTML; `/api/health` returns JSON |
| Unknown API path | `404` JSON `not_found` |

The optional Playwright suite was not adopted. End-to-end checks used `curl` against the real servers, and screenshots were captured with headless Chrome at 1440×1000.

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)

![Key Management](docs/screenshots/keys.png)

![Generate Signature](docs/screenshots/sign.png)

![Verify Signature](docs/screenshots/verify.png)

![Activity History](docs/screenshots/history.png)

## Project structure

```text
backend/
  app.py                 Flask app factory, limits, SPA serving
  crypto_utils.py        RSA keys, PEM, signing, verification
  database.py            SQLite schema and queries
  uploads.py             shared upload and Document validation
  api_errors.py          ApiError and JSON error envelope
  routes/                keys, signing, verification, history
  tests/                 Pytest suites
frontend/
  src/components/        Sidebar, OperationTable, placeholders
  src/lib/               label formatting
  src/pages/             Dashboard, Sign, Verify, Keys, History
  src/styles/            global CSS
  vite.config.js         proxy and Vitest configuration
docs/
  adr/                   architecture decisions
  agents/                issue tracker and domain guidance
  screenshots/           README images
.scratch/                local spec and tickets
CONTEXT.md               domain glossary
AGENTS.md                agent guidance
plan.txt                 original product and security specification
```

## Limitations and future work

- **Signer identity is not proven.** Verification proves key match, not ownership. Certificates or a trusted directory would be required.
- **Invalid does not diagnose the cause.** A modified Document, wrong Public Key, and wrong Signature Artifact are indistinguishable by design.
- No authentication, user accounts, or multi-user isolation.
- No pagination or retention policy for Operation Records.
- Local-only: no HTTPS, reverse proxy, or deployment hardening.
- The optional Playwright suite was not adopted; browser checks were manual/headless.

## Documentation

- `plan.txt` — authoritative product and security specification.
- `CONTEXT.md` — domain glossary.
- `docs/adr/` — hard-to-reverse decisions.
- `.scratch/digital-signature-system/spec.md` — buildable spec.
- `.scratch/digital-signature-system/issues/` — tracer-bullet tickets with blocking edges.
