# 06: Tamper demonstration on the Verify page

**What to build:** On the Verify page, a user edits a TXT Document inline and re-verifies it against the same Signature Artifact and Public Key, seeing Invalid. When the Document is not valid UTF-8, the editor is disabled with an explanation.

**Blocked by:** 04 (verify a Document)

**Status:** ready-for-agent

- [ ] The TXT tamper editor prefills the uploaded Document content and submits the edited bytes against the same Signature Artifact and Public Key.
- [ ] A one-character edit produces Invalid with `verification_failed` and the honest multi-cause explanation.
- [ ] Non-UTF-8 TXT Documents disable the editor with a clear explanation; PDFs do not offer the editor.
- [ ] Unchanged text still verifies Valid.
- [ ] Tests cover edit-fails, unchanged-passes, non-UTF-8 handling, and the page interaction.
