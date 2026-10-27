# Agent Guidance

## Repository State

- The workspace contains a React/Vite frontend and a Flask backend. `plan.txt` remains the authoritative product and security specification; `CONTEXT.md` is the domain glossary; `docs/adr/` records hard-to-reverse decisions.
- Work is tracked as local markdown under `.scratch/digital-signature-system/`: `spec.md` is the buildable spec, and `issues/` holds tracer-bullet tickets with `Blocked by` edges. Work the unblocked frontier; do not skip a blocker.
- Tickets 01 (walking skeleton), 02 (key generation), 03 (signing), and 04 (verification) are complete. Later tickets add history, the tamper demonstration, and delivery. Do not replace real signing or verification with mocks.

## Commands

Verified on Windows PowerShell 5.1 with Python 3.12.10, Node 24.19.0, and npm 11.17.0:

- Backend setup: `python -m venv backend\.venv; backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt`
- Backend tests (from `backend\`): `backend\.venv\Scripts\python.exe -m pytest`
- Single backend test: `backend\.venv\Scripts\python.exe -m pytest tests\test_health.py`
- Backend dev server: `backend\.venv\Scripts\python.exe backend\app.py` (port 5000)
- Frontend setup (from `frontend\`): `npm install`
- Frontend tests: `npm test` (Vitest, single run)
- Single frontend test: `npx vitest run src/App.test.jsx`
- Frontend dev server: `npm run dev` (port 5173, proxies `/api` to 127.0.0.1:5000)
- Frontend build: `npm run build`

No lint or typecheck script is configured yet.

## Implementation Boundaries

- Preserve the planned separation: React/Vite frontend, Flask REST API, dedicated cryptography module, SQLite metadata access, and tests. Keep cryptographic operations out of route handlers and keep verification authoritative on the backend.
- Implement in ticket order: cryptography plus tests, backend/API and database, frontend, then end-to-end integration and documentation. Do not build a mock UI in place of working signing and verification.
- Use Python `cryptography` for RSA-2048 with public exponent `65537`, RSA-PSS, SHA-256, MGF1-SHA-256, and `PSS.MAX_LENGTH` consistently for signing and verification. Sign the original document bytes, not filenames or frontend-provided hashes.

## Sensitive Data

- Never log, persist, commit, or expose private keys or passwords. The SQLite history stores operation metadata only; it must not contain private keys, passwords, or document contents.
- The backend must perform the real cryptographic verification. Ordinary invalid signatures are an application result, not an unhandled server error.
- Keep uploads size-limited and validated, use safe temporary-file handling, and remove temporary artifacts after processing. Do not add authentication, cloud key storage, blockchain, or third-party APIs; those are explicitly out of scope.

## Verification

- Run the relevant Pytest and Vitest suites before marking a ticket complete, and record the actual results.
- Before declaring the project complete, exercise the real workflow: generate keys, sign a document, download/re-upload the artifacts, verify successfully, then verify tampered content and a wrong public key fail safely.
- Report only tests and features that were actually executed. Record the final commands and results in the project README when ticket 07 is implemented.

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage role names are used unchanged. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout: `CONTEXT.md` and `docs/adr/` at the repository root. See `docs/agents/domain.md`.
