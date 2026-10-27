import { useEffect, useState } from 'react'
import styles from './Keys.module.css'

export default function Keys() {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [download, setDownload] = useState(null)

  useEffect(() => {
    return () => {
      if (download) {
        URL.revokeObjectURL(download.url)
      }
    }
  }, [download])

  async function handleSubmit(event) {
    event.preventDefault()
    setStatus('generating')
    setError('')
    setDownload(null)

    try {
      const formData = new FormData()
      if (password) {
        formData.append('password', password)
      }

      const response = await fetch('/api/keys/generate', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(
          body?.error?.message || 'Could not generate the key pair.',
        )
      }

      const blob = await response.blob()
      setDownload({
        url: URL.createObjectURL(blob),
        fileName: 'rsa-keypair.zip',
        encrypted: password.length > 0,
      })
      setStatus('success')
    } catch (err) {
      setError(err.message)
      setStatus('error')
    }
  }

  const passwordSupplied = password.length > 0

  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Keys</p>
        <h1>Key Management</h1>
        <p className={styles.intro}>
          Generate an RSA-2048 Key Pair. The ZIP contains{' '}
          <code>public.pem</code> for verification and <code>private.pem</code>{' '}
          for signing.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="key-password">Password (optional)</label>
          <input
            id="key-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            aria-describedby="password-hint"
          />
          <p id="password-hint" className={styles.hint}>
            A password encrypts <code>private.pem</code>. If you leave it blank,
            the key is exported without encryption.
          </p>
        </div>

        {!passwordSupplied && (
          <p className={styles.warning} role="note">
            No password supplied. The private key will be downloaded
            unencrypted.
          </p>
        )}

        <button
          type="submit"
          className={styles.button}
          disabled={status === 'generating'}
        >
          {status === 'generating' ? 'Generating…' : 'Generate key pair'}
        </button>

        {status === 'error' && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </form>

      {status === 'success' && download && (
        <section className={styles.success} aria-labelledby="key-ready">
          <h2 id="key-ready">Key pair ready</h2>
          <p>The ZIP contains public.pem and private.pem.</p>
          <a
            className={styles.download}
            href={download.url}
            download={download.fileName}
          >
            Download key pair (.zip)
          </a>
          {!download.encrypted && (
            <p className={styles.warning} role="note">
              This private key was exported without password protection. Store
              it carefully.
            </p>
          )}
        </section>
      )}

      <section className={styles.guidance} aria-labelledby="key-guidance">
        <h2 id="key-guidance">Using the pair</h2>
        <ul>
          <li>
            <code>private.pem</code> signs Documents. Keep it secret and upload
            it only on the signing page.
          </li>
          <li>
            <code>public.pem</code> verifies Signature Artifacts and is safe to
            share.
          </li>
          <li>Every generated pair is RSA-2048 with public exponent 65537.</li>
          <li>
            If you lose the password, the encrypted private key cannot be
            recovered.
          </li>
        </ul>
      </section>
    </section>
  )
}
