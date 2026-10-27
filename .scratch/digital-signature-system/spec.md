# Digital Signature Generation and Verification System — Spec

Status: ready-for-agent

## Problem Statement

Documents exchanged digitally can be altered without any visible sign. A recipient has no reliable way to tell whether a Document still matches what was originally signed, or whether it was signed by the holder of a particular Private Key. Demonstrating this needs a working application, not an explanation: generate keys, sign a Document, and later prove that the exact bytes still match — while modified bytes and the wrong Public Key fail.

## Solution

A local full-stack web application with five pages. Users generate an RSA Key Pair, sign PDF or TXT Documents with a Private Key, download the Signature Artifact, and later verify that artifact against the same Document and the matching Public Key. The backend performs all cryptography and is the sole authority on Valid and Invalid outcomes. Every successful Signing Operation and every completed Verification Attempt is recorded as an Operation Record, and the dashboard summarizes them. A tamper panel demonstrates that changing one character invalidates the Signature Artifact.

## User Stories

1. As a first-time visitor, I want a dashboard that explains what the system does, so that I understand the workflow before starting.
2. As a user, I want summary cards for signing and verification activity, so that I can see usage at a glance.
3. As a user, I want recent activity on the dashboard, so that I can see what happened most recently.
4. As a user, I want quick actions for signing, verifying, and key management, so that I can start the task I came for.
5. As a first-time user with no records, I want a useful empty state, so that I know how to begin.
6. As a user, I want a loading indicator while dashboard data is fetched, so that I know the page is working.
7. As a user, I want a readable error when the backend is unavailable, so that I know to retry rather than assume there is no data.
8. As a user, I want to generate an RSA-2048 Key Pair, so that I can sign and verify Documents.
9. As a user, I want to download the Key Pair as PEM files, so that I can reuse them later.
10. As a user, I want to protect the Private Key with a Password, so that it is safer at rest.
11. As a user, I want a clear warning when exporting an unencrypted Private Key, so that I understand the risk I am accepting.
12. As a user, I want instructions explaining that the Private Key signs and the Public Key verifies, so that I use the correct file in each flow.
13. As a user, I want the Private Key never displayed in full or stored in browser storage, so that it cannot leak from the UI.
14. As a user, I want to upload a PDF or TXT Document for signing, so that I can sign the file I actually have.
15. As a user, I want to upload my Private Key and, when needed, its Password, so that signing works with my own key.
16. As a user, I want required fields and file constraints validated before submission, so that I get immediate feedback.
17. As a user, I want a progress indicator during signing, so that I know the operation is running.
18. As a user, I want to see the Document Fingerprint and the signature algorithm after signing, so that I can record what was signed.
19. As a user, I want to download the Signature Artifact after a successful signing, so that I can send it alongside the Document.
20. As a user, I want to clear the signing form, so that I can start another Signing Operation quickly.
21. As a user, I want a clear message when the Private Key is malformed or the Password is wrong, so that I can correct the input.
22. As a user, I want to upload the Document, Signature Artifact, and Public Key for verification, so that I can check authenticity.
23. As a user, I want an unmistakable Valid or Invalid result, so that I know whether to trust the Document.
24. As a user, I want a reason when verification cannot run at all, so that I can fix the input rather than guess.
25. As a user, I want to see the Document Fingerprint on the result panel, so that I can confirm I checked the intended file.
26. As a user, I want to verify another Document without reloading the page, so that repeated checks are quick.
27. As a user, I want an Invalid result to name the possible causes — modified Document, wrong Public Key, or wrong Signature Artifact — so that I do not assume a cause the cryptography cannot prove.
28. As a user, I want to modify a TXT Document in a tamper panel and re-verify it, so that I can see integrity detection demonstrated live.
29. As a user, I want a warning when a TXT Document cannot be edited as UTF-8, so that I understand why the tamper panel is unavailable for that file.
30. As a user, I want a history of Signing Operations and Verification Attempts, so that I can review what the application has done.
31. As a user, I want to filter history by operation type, so that I can isolate signings or verifications.
32. As a user, I want to filter history by result, so that I can find failures quickly.
33. As a user, I want records ordered newest first, so that recent activity is easiest to find.
34. As a user, I want to clear history only after confirming, so that I cannot erase records by accident.
35. As a user, I want an empty state in history, so that I know there are no records yet.
36. As a user, I want upload size limits enforced, so that the application stays responsive.
37. As a user, I want error messages that never expose stack traces or internal paths, so that implementation details stay private.
38. As a user, I want the verification result shown in the UI to be the backend's actual result, so that I can trust what I see.
39. As a user, I want the application to work without an external paid service or internet API, so that it runs entirely locally.
40. As a user on a phone, I want responsive layouts, so that I can complete the workflow on a small screen.
41. As a keyboard user, I want visible labels and focusable controls, so that I can complete every flow without a mouse.
42. As a developer, I want Private Keys and Passwords never logged, persisted, or committed, so that secrets stay out of the repository and database.

## Implementation Decisions

### Architecture

Four boundaries, kept separate:

- **Frontend** — React + Vite, JavaScript, React Router, CSS Modules. Owns presentation, client-side validation, uploads, downloads, and rendering backend results. Performs no cryptography and never decides validity.
- **API layer** — Flask REST endpoints. Owns request validation, orchestration, error mapping, and recording Operation Records. Contains no cryptographic primitives.
- **Crypto module** — RSA key generation, PEM serialization/deserialization, RSA-PSS signing, and RSA-PSS verification. The only place that touches cryptographic keys.
- **Database** — SQLite, accessed through parameterized queries. Stores Operation Records only.

Order of implementation: crypto module plus its tests, then API and database, then frontend, then end-to-end integration and documentation.

### Cryptographic contract

- RSA-2048, public exponent `65537`.
- RSA-PSS with SHA-256, MGF1-SHA-256, and `PSS.MAX_LENGTH` salt length, identical for signing and verification.
- Sign the Document's original bytes directly. Never sign a filename, path, or a fingerprint supplied by the frontend.
- Never compare Signature Artifacts byte-for-byte; RSA-PSS can produce different valid signatures for the same Document.
- Private Keys export as PKCS#8 PEM: encrypted with `BestAvailableEncryption` when a Password is supplied, otherwise unencrypted.
- Public Keys export as SubjectPublicKeyInfo PEM.
- Imported Private Keys and Public Keys must be RSA-2048. Other key sizes are rejected with a clear message.
- Algorithm label shown and stored: `RSA-PSS-SHA256`.

### Key generation

- `POST /api/keys/generate` accepts optional multipart field `password`.
- Success returns a ZIP attachment named `rsa-keypair.zip` containing `public.pem` and `private.pem`.
- The Private Key never appears in a JSON body, a log, the database, or browser storage.
- If the Password is blank, the export is unencrypted and the UI shows a warning before and after generation.

### API contract

All endpoints are under `/api`. Errors use `{"error": {"code": "<code>", "message": "<safe message>"}}`. Success payloads are flat and endpoint-specific.

| Method | Endpoint | Input | Success |
| --- | --- | --- | --- |
| GET | `/api/health` | none | `200 {"status":"ok"}` |
| POST | `/api/keys/generate` | optional `password` | `200` ZIP attachment |
| POST | `/api/sign` | `document`, `private_key`, optional `password` | `200` metadata plus base64 Signature Artifact |
| POST | `/api/verify` | `document`, `signature`, `public_key` | `200` with `valid` boolean and metadata |
| GET | `/api/history` | optional `operation`, `result` | `200 {"records": [...]}` |
| DELETE | `/api/history` | none | `200 {"deleted": <count>}` |
| GET | `/api/dashboard/stats` | none | `200` counts plus recent activity |

Signing response fields: `operation_id`, `document_filename`, `document_size`, `document_sha256`, `algorithm`, `signed_at`, `signature_filename`, `signature_base64`. The frontend decodes the base64 into a Blob and downloads it as a raw binary `.sig` file. Base64 is transport only; the artifact itself is raw bytes.

Verification response fields: `valid`, `reason` (null when Valid), `message`, `document_filename`, `document_sha256`, `verified_at`. Ordinary Invalid outcomes return HTTP 200 with `valid: false` and `reason: "verification_failed"`.

Reason codes, split between transport failures and cryptographic results:

- `missing_input`, `unsupported_type`, `file_too_large`, `invalid_public_key`, `invalid_signature_format`, `invalid_private_key`, `invalid_private_key_password`, `invalid_filter` → HTTP 400/413/415 as appropriate.
- `verification_failed` → HTTP 200 with `valid: false`. Covers modified Document, wrong Public Key, and wrong Signature Artifact indistinguishably.
- `internal_error` → HTTP 500 with a generic message and no stack trace or file path.

Status codes: 400 malformed or missing input, 413 oversized upload, 415 unsupported Document type, 422 wrong Private Key Password where a distinct client action is needed, 500 unexpected failure.

### Upload constraints

- Total request limit 12 MB; each Document at most 10 MB; each Private Key, Public Key, or Signature Artifact at most 64 KB.
- Documents: `.pdf` or `.txt` only. PDFs additionally require the `%PDF-` magic bytes.
- TXT Documents remain byte-oriented for signing and verification; no encoding requirement is imposed.
- Uploads stream to temporary files and are removed in a `finally` path after processing.
- Signature Artifacts are treated as opaque bytes. An empty file yields `invalid_signature_format`; a non-empty mismatch yields `verification_failed`.

### Operation Records

One table, storing metadata only:

| Field | Meaning |
| --- | --- |
| `id` | Integer autoincrement identifier |
| `document_filename` | Original filename as a label |
| `operation_type` | `sign` or `verify` |
| `result` | `success` or `failure` |
| `reason_code` | Nullable; `verification_failed` for Invalid attempts |
| `algorithm` | `RSA-PSS-SHA256` |
| `document_sha256` | Nullable Document Fingerprint |
| `created_at` | UTC ISO-8601 timestamp |

Recording rules: a Signing Operation is recorded only when it succeeds. A Verification Attempt is recorded when it completes, Valid or Invalid. Requests rejected before cryptography — missing fields, unsupported types, oversized files, malformed keys — are not recorded. History filters accept `operation=sign|verify` and `result=success|failure`; unknown filter values return `invalid_filter`. Records are returned newest first with no pagination. Clearing history hard-deletes all rows.

Dashboard statistics are SQL aggregates over Operation Records: total Signing Operations, total Verification Attempts, successful verifications, failed verifications. Recent activity is the ten newest Operation Records. No stored counters.

### Frontend

Routes: `/` dashboard, `/sign`, `/verify`, `/keys`, `/history`. A shared sidebar provides navigation on every page. Styling uses CSS Modules and a limited palette with consistent status colors.

- **Dashboard** — summary cards from `/api/dashboard/stats`, recent activity, quick actions, loading, empty, and backend-unavailable states.
- **Generate Signature** — Document upload, Private Key upload, Password field, client-side validation, progress state, success panel with algorithm and Document Fingerprint, download button for the decoded `.sig`, clear button. The download control appears only after success.
- **Verify Signature** — Document, Signature Artifact, and Public Key uploads; result panel driven only by the backend response; reason and fingerprints; "verify another" reset. A tamper panel for TXT Documents prefills the text, allows edits, and re-verifies against the same Signature Artifact; if the bytes are not valid UTF-8 it disables the editor and explains why.
- **Key Management** — generate button, RSA-2048 information, ZIP download, Password field, unencrypted-export warning, storage guidance, and reuse instructions.
- **Activity History** — table, operation and result filters, newest first, refresh, clear with a confirmation dialog, empty state.

The frontend never stores Private Keys or Passwords in local storage, session storage, or the DOM beyond the active form, and never renders user-supplied HTML.

### Local topology

- Development: Vite on 5173 proxies `/api` to Flask on 5000. No CORS configuration needed.
- Production/demo: `vite build` output is served by Flask, keeping a single origin. If the frontend is ever served separately, restrict CORS to an explicit allowlist from configuration.
- Flask debug mode is off outside development.
- Configuration covers database location, upload limits, and optional CORS origins. The SQLite file lives in the backend instance folder and is gitignored.

### Repository and version control

Application lives at the workspace root as `frontend/` and `backend/`, not in a nested project folder. Initialize Git before implementation and commit a `.gitignore` first: Private Keys, `*.pem`, `.env`, `*.db`, uploads, `*.sig`, `node_modules`, virtual environments, and temporary artifacts.

## Testing Decisions

A good test asserts external behavior — observable inputs and outputs — not internal structure. Tests exercise the same seams a user or caller touches: HTTP for the API, public functions for the crypto module, rendered UI for pages.

**Seam 1 — HTTP API (primary).** Pytest drives a real Flask application through its test client with a temporary SQLite database per test. Covers every endpoint's success and failure paths, upload validation, size limits, malformed uploads, error shape, no stack-trace leakage, history persistence and filters, clearing history, and dashboard aggregates. Real cryptography runs through the routes.

**Seam 2 — Crypto module (unit).** Direct calls assert what HTTP cannot expose: key size, public exponent, RSA-PSS parameters identical on both sides, and failure behavior for empty signatures, malformed PEM, wrong Password, tampered bytes, and wrong Public Key. Also asserts a download/re-upload round trip still verifies.

**Seam 3 — Frontend pages (RTL).** Vitest + React Testing Library render each page with a mocked `fetch`. Assertions cover navigation, validation messages, loading/success/failure/empty states, the backend's result being displayed, download availability only after success, history filters, and clear-history confirmation. No assertions on component internals.

**Optional — Playwright E2E.** If adopted, one happy path (generate keys, sign, download, re-upload, verify) and one tamper failure against real servers. Not an acceptance requirement.

There is no prior art: this is a greenfield project. The crypto and API suites establish the pattern the frontend suite follows.

## Out of Scope

- Authentication, accounts, user roles, and multi-user isolation.
- Digital certificates, certificate authorities, and real-world signer identity. The application proves a Signature Artifact matches a supplied Public Key; it does not prove who owns that key.
- Cloud key storage, key vaults, blockchain anchoring, email notifications, and third-party APIs.
- Docker, Redis, PostgreSQL, microservices, and cloud infrastructure.
- Pagination, migration frameworks, and retention policies for Operation Records.
- Serving the application over the public internet or providing production hardening beyond disabling debug mode.

## Further Notes

- `plan.txt` remains authoritative where this spec is silent. If they conflict, stop and surface the conflict rather than choosing silently.
- Do not ship a mock UI. The React frontend must drive the real Flask API and real cryptography.
- The README must record the actual commands used and the actual test results, plus screenshots of the dashboard and the signing and verification flows.
- The documented limitation — verification proves key match, not signer identity — belongs in the README.
- Report unfinished features and failing tests honestly; never mark a phase complete without executing its tests.
