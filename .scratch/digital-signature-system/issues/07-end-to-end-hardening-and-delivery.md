# 07: End-to-end hardening and delivery

**What to build:** The complete workflow runs against real servers and real cryptography. Security constraints are verified, and the README and final report document what was actually executed.

**Blocked by:** 05 (Activity History and dashboard statistics), 06 (tamper demonstration)

**Status:** done

- [x] The full workflow passes: generate a Key Pair, sign TXT and PDF Documents, download the artifacts, re-upload them, and verify Valid.
- [x] A tampered Document and a wrong Public Key both fail safely as Invalid.
- [x] No Private Key or Password appears in logs, the database, Git, or browser storage; SQL is parameterized; Flask debug is off; responses leak no stack traces or internal paths.
- [x] The README documents setup, run commands, API endpoints, the workflow, executed test results, screenshots, and the identity-verification limitation.
- [x] The backend and frontend suites pass and their actual results are recorded.
- [x] The final report lists completed features, files, commands, test results, and known issues.
- [x] The optional Playwright suite was not adopted; end-to-end checks used curl against real servers and headless Chrome screenshots.
