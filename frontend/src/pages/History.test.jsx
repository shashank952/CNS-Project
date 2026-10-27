import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import History from './History.jsx'

const originalFetch = globalThis.fetch

const records = [
  {
    id: 2,
    document_filename: 'note.txt',
    operation_type: 'verify',
    result: 'failure',
    reason_code: 'verification_failed',
    algorithm: 'RSA-PSS-SHA256',
    document_sha256: 'a'.repeat(64),
    created_at: '2026-10-27T06:12:37.020737Z',
  },
  {
    id: 1,
    document_filename: 'report.txt',
    operation_type: 'sign',
    result: 'success',
    reason_code: null,
    algorithm: 'RSA-PSS-SHA256',
    document_sha256: 'b'.repeat(64),
    created_at: '2026-10-27T06:04:51.137452Z',
  },
]

function historyResponse(rows) {
  return { ok: true, json: async () => ({ records: rows }) }
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Activity History', () => {
  test('renders recorded operations from the API', async () => {
    globalThis.fetch.mockResolvedValue(historyResponse(records))
    render(<History />)

    expect(await screen.findByText('note.txt')).toBeInTheDocument()
    expect(screen.getByText('report.txt')).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/history',
      expect.any(Object),
    )

    const table = screen.getByRole('table')
    expect(within(table).getByText('Failure')).toBeInTheDocument()
    expect(within(table).getByText('Success')).toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: /document/i }),
    ).toBeInTheDocument()
  })

  test('filters by operation and result', async () => {
    globalThis.fetch.mockResolvedValue(historyResponse([]))
    const user = userEvent.setup()
    render(<History />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())

    await user.selectOptions(screen.getByLabelText(/operation/i), 'verify')
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        '/api/history?operation=verify',
        expect.any(Object),
      ),
    )

    await user.selectOptions(screen.getByLabelText(/result/i), 'failure')
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        '/api/history?operation=verify&result=failure',
        expect.any(Object),
      ),
    )
  })

  test('refresh reloads the history', async () => {
    globalThis.fetch.mockResolvedValue(historyResponse(records))
    const user = userEvent.setup()
    render(<History />)
    await screen.findByText('note.txt')
    const callsBefore = globalThis.fetch.mock.calls.length

    await user.click(screen.getByRole('button', { name: /refresh/i }))

    await waitFor(() =>
      expect(globalThis.fetch.mock.calls.length).toBeGreaterThan(callsBefore),
    )
  })

  test('clear history requires confirmation and reloads', async () => {
    globalThis.fetch
      .mockResolvedValueOnce(historyResponse(records))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ deleted: 2 }) })
      .mockResolvedValueOnce(historyResponse([]))
    const user = userEvent.setup()
    render(<History />)
    await screen.findByText('note.txt')

    await user.click(screen.getByRole('button', { name: /clear history/i }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      '/api/history',
      expect.objectContaining({ method: 'DELETE' }),
    )

    await user.click(screen.getByRole('button', { name: /clear history/i }))
    await user.click(screen.getByRole('button', { name: /delete all records/i }))

    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/api/history',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    )
    expect(await screen.findByText(/no activity/i)).toBeInTheDocument()
  })

  test('shows an empty state when there are no records', async () => {
    globalThis.fetch.mockResolvedValue(historyResponse([]))
    render(<History />)

    expect(await screen.findByText(/no activity yet/i)).toBeInTheDocument()
  })

  test('shows a backend error', async () => {
    globalThis.fetch.mockRejectedValue(new Error('offline'))
    render(<History />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /backend.*unavailable/i,
    )
  })
})
