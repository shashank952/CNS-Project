import { useEffect, useState } from 'react'
import styles from './Sign.module.css'

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
const MAX_KEY_BYTES = 64 * 1024
const ALLOWED_EXTENSIONS = ['pdf', 'txt']

function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Sign() {
  const [formKey, setFormKey] = useState(0)
  const [documentFile, setDocumentFile] = useState(null)
  const [privateKeyFile, setPrivateKeyFile] = useState(null)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)

  useEffect(() => {
    if (!result) {
      setDownloadUrl(null)
      return undefined
    }

    const binary = atob(result.signature_base64)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index)
    }

    const url = URL.createObjectURL(
      new Blob([bytes], { type: 'application/octet-stream' }),
    )
    setDownloadUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [result])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!documentFile) {
      setStatus('error')
      setError('Choose a PDF or TXT Document.')
      return
    }

    if (!privateKeyFile) {
      setStatus('error')
      setError('Choose a Private Key PEM file.')
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

    if (privateKeyFile.size > MAX_KEY_BYTES) {
      setStatus('error')
      setError('The Private Key exceeds the 64 KB limit.')
      return
    }

    setStatus('signing')

    try {
      const formData = new FormData()
      formData.append('document', documentFile)
      formData.append('private_key', privateKeyFile)
      if (password) {
        formData.append('password', password)
      }

      const response = await fetch('/api/sign', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(body?.error?.message || 'Could not sign the Document.')
      }

      setResult(await response.json())
      setStatus('success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  function handleClear() {
    setDocumentFile(null)
    setPrivateKeyFile(null)
    setPassword('')
    setError('')
    setResult(null)
    setStatus('idle')
    setFormKey((value) => value + 1)
  }

  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Sign</p>
        <h1>Generate Signature</h1>
        <p className={styles.intro}>
          Upload a PDF or TXT Document and the Private Key from your Key Pair.
          The signature is produced over the Document's exact bytes.
        </p>
      </header>

      {/* Remount so native file inputs clear; state alone cannot reset them. */}
      <form key={formKey} className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="sign-document">Document (PDF or TXT)</label>
          <input
            id="sign-document"
            type="file"
            accept=".pdf,.txt"
            onChange={(event) =>
              setDocumentFile(event.target.files?.[0] ?? null)
            }
          />
          {documentFile && (
            <p className={styles.fileInfo}>
              {documentFile.name} · {formatBytes(documentFile.size)}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="sign-key">Private Key (PEM)</label>
          <input
            id="sign-key"
            type="file"
            accept=".pem"
            onChange={(event) =>
              setPrivateKeyFile(event.target.files?.[0] ?? null)
            }
          />
          {privateKeyFile && (
            <p className={styles.fileInfo}>
              {privateKeyFile.name} · {formatBytes(privateKeyFile.size)}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="sign-password">Password (optional)</label>
          <input
            id="sign-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="off"
            aria-describedby="sign-password-hint"
          />
          <p id="sign-password-hint" className={styles.hint}>
            Required only when the Private Key is encrypted.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.button}
            disabled={status === 'signing'}
          >
            {status === 'signing' ? 'Signing…' : 'Sign Document'}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={handleClear}
          >
            Clear form
          </button>
        </div>

        {status === 'error' && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>

      {status === 'success' && result && (
        <section className={styles.success} aria-labelledby="signature-created">
          <h2 id="signature-created">Signature created</h2>
          <dl className={styles.details}>
            <dt>Document</dt>
            <dd>{result.document_filename}</dd>
            <dt>Size</dt>
            <dd>{formatBytes(result.document_size)}</dd>
            <dt>SHA-256</dt>
            <dd>
              <code className={styles.fingerprint}>
                {result.document_sha256}
              </code>
            </dd>
            <dt>Algorithm</dt>
            <dd>{result.algorithm}</dd>
            <dt>Signed at</dt>
            <dd>{new Date(result.signed_at).toLocaleString()}</dd>
          </dl>

          {downloadUrl && (
            <a
              className={styles.download}
              href={downloadUrl}
              download={result.signature_filename}
            >
              Download signature ({result.signature_filename})
            </a>
          )}

          <p className={styles.note}>
            The signature is tied to these exact Document bytes. Keep it with
            the Document so the pair can be verified later.
          </p>
        </section>
      )}

      <p className={styles.security}>
        The Private Key is sent to the local backend only for this operation and
        is never stored.
      </p>
    </section>
  )
}
