# 01: Walking skeleton: app shells, health check, test harness

**What to build:** The repository is under version control, both applications start independently, and the dashboard reaches the real backend. A visitor opens the frontend, sees the shared sidebar and dashboard shell, and the page reports the backend as healthy. Test harnesses exist on both sides.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Git is initialized and `.gitignore` covers Private Keys, `*.pem`, `.env`, SQLite files, uploads, `.sig` artifacts, `node_modules`, virtual environments, and temporary artifacts.
- [x] The backend starts independently and `GET /api/health` returns `200 {"status":"ok"}`.
- [x] The frontend starts independently and the dashboard renders the shared sidebar and the live health result from the real request.
- [x] Routes for dashboard, sign, verify, keys, and history resolve; unimplemented pages show honest placeholders.
- [x] Pytest passes for the health endpoint; Vitest + React Testing Library passes for the dashboard health state.
- [x] No fabricated data, mock cryptography, or hardcoded verification results are introduced.
