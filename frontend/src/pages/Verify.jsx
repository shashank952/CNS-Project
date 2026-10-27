import { useState } from 'react'
import styles from './Verify.module.css'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const MAX_SIGNATURE_BYTES = 64 * 1024
const MAX_KEY_BYTES = 64 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'txt']

export default function Verify() {
  const [formKey, setFormKey] = useState(0)
  const [documentFile, setDocumentFile] = useState(null)
  const [signatureFile, setSignatureFile] = useState(null)
  const [publicKeyFile, setPublicKeyFile] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!documentFile) {
      setStatus('error')
      setError('Choose a PDF or TXT Document.')
      return
    }

    if (!signatureFile) {
      setStatus('error')
      setError('Choose the Signature Artifact (.sig).')
      return
    }

    if (!publicKeyFile) {
      setStatus('error')
      setError('Choose the Public Key PEM file.')
      return
    }

    const extension = documentFile.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setStatus('error')
      setError('Only PDF and TXT Documents are supported.')
      return
    }

    if (documentFile.size > MAX_DOCUMENT_BYTES) {
      setStatus('error')
      setError('The Document exceeds the 10 MB limit.')
      return
    }

    if (signatureFile.size > MAX_SIGNATURE_BYTES) {
      setStatus('error')
      setError('The Signature Artifact exceeds the 64 KB limit.')
      return
    }

    if (publicKeyFile.size > MAX_KEY_BYTES) {
      setStatus('error')
      setError('The Public Key exceeds the 64 KB limit.')
      return
    }

    setStatus('verifying')

    try {
      const formData = new FormData()
      formData.append('document', documentFile)
      formData.append('signature', signatureFile)
      formData.append('public_key', publicKeyFile)

      const response = await fetch('/api/verify', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(
          body?.error?.message || 'Could not verify the Signature Artifact.',
        )
      }

      setResult(await response.json())
      setStatus('success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function handleReset() {
    setDocumentFile(null)
    setSignatureFile(null)
    setPublicKeyFile(null)
    setError('')
    setResult(null)
    setStatus('idle')
    setFormKey((value) => value + 1)
  }

  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Verify</p>
        <h1>Verify Signature</h1>
        <p className={styles.intro}>
          Upload the Document, its Signature Artifact, and the Public Key from
          the Key Pair. The backend performs the cryptographic verification.
        </p>
      </header>

      {/* Remount so native file inputs clear; state alone cannot reset them. */}
      <form key={formKey} className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="verify-document">Document (PDF or TXT)</label>
          <input
            id="verify-document"
            type="file"
            accept=".pdf,.txt"
            onChange={(event) =>
              setDocumentFile(event.target.files?.[0] ?? null)
            }
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="verify-signature">Signature Artifact (.sig)</label>
          <input
            id="verify-signature"
            type="file"
            accept=".sig"
            onChange={(event) =>
              setSignatureFile(event.target.files?.[0] ?? null)
            }
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="verify-public-key">Public Key (PEM)</label>
          <input
            id="verify-public-key"
            type="file"
            accept=".pem"
            onChange={(event) =>
              setPublicKeyFile(event.target.files?.[0] ?? null)
            }
          />
        </div>

        <button
          type="submit"
          className={styles.button}
          disabled={status === 'verifying'}
        >
          {status === 'verifying' ? 'Verifying…' : 'Verify Signature'}
        </button>

        {status === 'error' && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>

      {status === 'success' && result && (
        <section
          className={`${styles.result} ${
            result.valid ? styles.validPanel : styles.invalidPanel
          }`}
          aria-labelledby="verification-result"
        >
          <h2 id="verification-result">
            {result.valid ? 'Valid' : 'Invalid'}
          </h2>
          <p className={styles.message}>{result.message}</p>

          <dl className={styles.details}>
            <dt>Document</dt>
            <dd>{result.document_filename}</dd>
            <dt>SHA-256</dt>
            <dd>
              <code className={styles.fingerprint}>
                {result.document_sha256}
              </code>
            </dd>
            <dt>Verified at</dt>
            <dd>{new Date(result.verified_at).toLocaleString()}</dd>
          </dl>

          {!result.valid && (
            <p className={styles.honesty}>
              Invalid does not reveal whether the Document, the Signature
              Artifact, or the Public Key is wrong. Check that the three files
              belong together and that the Document has not changed.
            </p>
          )}

          <button
            type="button"
            className={styles.secondary}
            onClick={handleReset}
          >
            Verify another
          </button>
        </section>
      )}

      <p className={styles.security}>
        Verification runs on the backend. The browser never decides whether a
        Signature Artifact is valid.
      </p>
    </section>
  )
}
