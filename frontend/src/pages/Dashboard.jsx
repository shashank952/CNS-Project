import { useEffect, useState } from 'react'
import styles from './Dashboard.module.css'

const STATUS_TEXT = {
  loading: 'Checking backend status…',
  healthy: 'Backend healthy',
  unavailable: 'Backend unavailable',
}

export default function Dashboard() {
  const [health, setHealth] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()

    async function checkHealth() {
      try {
        const response = await fetch('/api/health', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Health check failed')
        }

        const body = await response.json()
        setHealth(body.status === 'ok' ? 'healthy' : 'unavailable')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setHealth('unavailable')
        }
      }
    }

    checkHealth()

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

      <p className={`${styles.status} ${styles[health]}`} role="status">
        {STATUS_TEXT[health]}
      </p>

      <div className={styles.placeholder}>
        <h2>Summary cards are not implemented yet</h2>
        <p>
          This build wires the application shell and the backend health check.
          Signing, verification, and activity statistics are not implemented
          yet.
        </p>
      </div>
    </section>
  )
}
