# 02: Generate and download a Key Pair

**What to build:** A user opens Key Management, enters an optional Password, generates an RSA-2048 Key Pair, and downloads a ZIP containing both PEM files. The Private Key is encrypted when a Password is supplied and the user is warned when it is not.

**Blocked by:** 01 (walking skeleton)

**Status:** done

- [x] The crypto module generates RSA-2048 keys with public exponent 65537 and exports PKCS#8 private PEM (encrypted with `BestAvailableEncryption` when a Password is supplied, unencrypted otherwise) and SubjectPublicKeyInfo public PEM.
- [x] `POST /api/keys/generate` accepts the optional Password and returns `rsa-keypair.zip` containing `public.pem` and `private.pem`; the Private Key never appears in a JSON body, a log, or the database.
- [x] The Key Management page provides a Password field, a clear unencrypted-export warning, a generate action, a ZIP download, RSA-2048 information, and signing-versus-verification guidance.
- [x] Crypto tests cover export and reload round trips, encrypted and unencrypted keys, a wrong Password, and rejection of non-RSA-2048 keys.
- [x] API tests cover success, the optional Password, and the error envelope; page tests cover generation, the warning, and the download.
- [x] The Private Key is never displayed in full and never written to browser storage.
