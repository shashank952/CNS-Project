import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Dashboard from './Dashboard.jsx'

const originalFetch = globalThis.fetch

const statsResponse = {
  total_signing_operations: 3,
  total_verification_attempts: 4,
  successful_verifications: 2,
  failed_verifications: 2,
  recent_activity: [
    {
      id: 7,
      document_filename: 'note.txt',
      operation_type: 'verify',
      result: 'failure',
      reason_code: 'verification_failed',
      algorithm: 'RSA-PSS-SHA256',
      document_sha256: 'a'.repeat(64),
      created_at: '2026-10-27T06:12:37.020737Z',
    },
    {
      id: 6,
      document_filename: 'doc.pdf',
      operation_type: 'sign',
      result: 'success',
      reason_code: null,
      algorithm: 'RSA-PSS-SHA256',
      document_sha256: 'b'.repeat(64),
      created_at: '2026-10-27T06:12:36.836808Z',
    },
  ],
}

const emptyStats = {
  total_signing_operations: 0,
  total_verification_attempts: 0,
  successful_verifications: 0,
  failed_verifications: 0,
  recent_activity: [],
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Dashboard', () => {
  test('shows a loading state while statistics load', () => {
    globalThis.fetch.mockReturnValue(new Promise(() => {}))
    renderDashboard()

    expect(screen.getByText(/loading activity/i)).toBeInTheDocument()
  })

  test('renders the four summary cards and recent activity', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => statsResponse,
    })
    renderDashboard()

    expect(
      await screen.findByText('Total signing operations'),
    ).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getAllByText('2')).toHaveLength(2)
    expect(screen.getByText('note.txt')).toBeInTheDocument()
    expect(screen.getByText('doc.pdf')).toBeInTheDocument()
    expect(screen.getByText('Failure')).toBeInTheDocument()
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/dashboard/stats',
      expect.any(Object),
    )
  })

  test('offers quick actions to the other workflows', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => statsResponse,
    })
    renderDashboard()
    await screen.findByText('Total signing operations')

    expect(
      screen.getByRole('link', { name: /generate signature/i }),
    ).toHaveAttribute('href', '/sign')
    expect(
      screen.getByRole('link', { name: /verify signature/i }),
    ).toHaveAttribute('href', '/verify')
    expect(
      screen.getByRole('link', { name: /key management/i }),
    ).toHaveAttribute('href', '/keys')
  })

  test('shows an empty state when there is no activity', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => emptyStats,
    })
    renderDashboard()

    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(4)
  })

  test('shows a backend error and retries', async () => {
    globalThis.fetch
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => statsResponse,
      })
    const user = userEvent.setup()
    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /backend.*unavailable/i,
    )

    await user.click(screen.getByRole('button', { name: /retry/i }))

    expect(
      await screen.findByText('Total signing operations'),
    ).toBeInTheDocument()
  })
})
