import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import OperationTable from '../components/OperationTable.jsx'
import styles from './Dashboard.module.css'

const CARDS = [
  { key: 'total_signing_operations', label: 'Total signing operations' },
  { key: 'total_verification_attempts', label: 'Total verification attempts' },
  { key: 'successful_verifications', label: 'Successful verifications' },
  { key: 'failed_verifications', label: 'Failed verifications' },
]

export default function Dashboard() {
  const [status, setStatus] = useState('loading')
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  async function loadStats(signal) {
    setStatus('loading')
    setError('')

    try {
      const response = await fetch('/api/dashboard/stats', { signal })

      if (!response.ok) {
        throw new Error('Statistics request failed')
      }

      setStats(await response.json())
      setStatus('success')
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }
      setError('The backend is unavailable. Start the backend and try again.')
      setStatus('error')
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadStats(controller.signal)
    return () => controller.abort()
  }, [])

  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Overview</p>
        <h1>Dashboard</h1>
        <p className={styles.intro}>
          Generate a Key Pair, sign a Document, and verify that its exact bytes
          still match the Signature Artifact.
        </p>
      </header>

      {status === 'loading' && (
        <p className={styles.state} role="status">
          Loading activity…
        </p>
      )}

      {status === 'error' && (
        <div className={styles.errorPanel}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button
            type="button"
            className={styles.retry}
            onClick={() => loadStats()}
          >
            Retry
          </button>
        </div>
      )}

      {status === 'success' && stats && (
        <>
          <div className={styles.cards}>
            {CARDS.map((card) => (
              <article key={card.key} className={styles.card}>
                <p className={styles.cardLabel}>{card.label}</p>
                <p className={styles.cardValue}>{stats[card.key]}</p>
              </article>
            ))}
          </div>

          <nav className={styles.quickActions} aria-label="Quick actions">
            <Link to="/sign">Generate Signature</Link>
            <Link to="/verify">Verify Signature</Link>
            <Link to="/keys">Key Management</Link>
          </nav>

          <section className={styles.recent} aria-labelledby="recent-activity">
            <h2 id="recent-activity">Recent activity</h2>
            {stats.recent_activity.length === 0 ? (
              <p className={styles.empty}>
                No activity yet. Generate a Key Pair, sign a Document, then
                verify it.
              </p>
            ) : (
              <OperationTable records={stats.recent_activity} />
            )}
          </section>
        </>
      )}
    </section>
  )
}
