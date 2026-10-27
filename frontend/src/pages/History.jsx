import { useEffect, useState } from 'react'
import OperationTable from '../components/OperationTable.jsx'
import styles from './History.module.css'

export default function History() {
  const [records, setRecords] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [operation, setOperation] = useState('')
  const [result, setResult] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [clearing, setClearing] = useState(false)

  async function loadHistory(signal) {
    setStatus('loading')
    setError('')

    const params = new URLSearchParams()
    if (operation) {
      params.set('operation', operation)
    }
    if (result) {
      params.set('result', result)
    }
    const query = params.toString()

    try {
      const response = await fetch(
        `/api/history${query ? `?${query}` : ''}`,
        { signal },
      )

      if (!response.ok) {
        throw new Error('History request failed')
      }

      const body = await response.json()
      setRecords(body.records)
      setStatus('success')
    } catch (err) {
      if (err.name === 'AbortError') {
        return
      }
      setError('The backend is unavailable. Try again.')
      setStatus('error')
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadHistory(controller.signal)
    return () => controller.abort()
  }, [operation, result])

  async function handleClear() {
    setClearing(true)
    setError('')

    try {
      const response = await fetch('/api/history', { method: 'DELETE' })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        throw new Error(
          body?.error?.message || 'Could not clear the activity history.',
        )
      }

      setConfirmOpen(false)
      await loadHistory()
    } catch (err) {
      setError(err.message)
      setStatus('error')
      setConfirmOpen(false)
    } finally {
      setClearing(false)
    }
  }

  return (
    <section>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Activity</p>
        <h1>Activity History</h1>
        <p className={styles.intro}>
          Review Signing Operations and Verification Attempts recorded by the
          backend.
        </p>
      </header>

      <div className={styles.filters}>
        <div className={styles.field}>
          <label htmlFor="history-operation">Operation</label>
          <select
            id="history-operation"
            value={operation}
            onChange={(event) => setOperation(event.target.value)}
          >
            <option value="">All operations</option>
            <option value="sign">Sign</option>
            <option value="verify">Verify</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="history-result">Result</label>
          <select
            id="history-result"
            value={result}
            onChange={(event) => setResult(event.target.value)}
          >
            <option value="">All results</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => loadHistory()}
          >
            Refresh
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={() => setConfirmOpen(true)}
            disabled={records.length === 0 || status === 'loading'}
          >
            Clear history
          </button>
        </div>
      </div>

      {confirmOpen && (
        <section
          className={styles.confirm}
          role="alertdialog"
          aria-labelledby="clear-history-title"
          aria-describedby="clear-history-description"
        >
          <h2 id="clear-history-title">Clear all activity?</h2>
          <p id="clear-history-description">
            This removes every Operation Record. It cannot be undone.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.danger}
              onClick={handleClear}
              disabled={clearing}
            >
              {clearing ? 'Clearing…' : 'Delete all records'}
            </button>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => setConfirmOpen(false)}
              disabled={clearing}
            >
              Cancel
            </button>
          </div>
        </section>
      )}

      {status === 'loading' && (
        <p className={styles.state} role="status">
          Loading activity…
        </p>
      )}

      {status === 'error' && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {status === 'success' &&
        (records.length === 0 ? (
          <p className={styles.empty}>
            No activity yet. Sign or verify a Document to create a record.
          </p>
        ) : (
          <OperationTable records={records} />
        ))}
    </section>
  )
}
