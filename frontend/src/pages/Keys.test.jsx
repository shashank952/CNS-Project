import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Keys from './Keys.jsx'

const originalFetch = globalThis.fetch
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

beforeEach(() => {
  globalThis.fetch = vi.fn()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
})

describe('Key Management', () => {
  test('warns when no password is supplied', async () => {
    const user = userEvent.setup()
    render(<Keys />)

    expect(screen.getByText(/unencrypted/i)).toBeInTheDocument()

    await user.type(screen.getByLabelText(/password/i), 'secret')

    expect(screen.queryByText(/unencrypted/i)).not.toBeInTheDocument()
  })

  test('generates a key pair and offers the ZIP download', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['zip']),
    })
    const user = userEvent.setup()
    render(<Keys />)

    await user.click(screen.getByRole('button', { name: /generate key pair/i }))

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/keys/generate',
      expect.objectContaining({ method: 'POST' }),
    )

    const link = await screen.findByRole('link', {
      name: /download key pair/i,
    })
    expect(link).toHaveAttribute('download', 'rsa-keypair.zip')
    expect(link).toHaveAttribute('href', 'blob:mock-url')
    expect(URL.createObjectURL).toHaveBeenCalled()
  })

  test('sends the supplied password with the request', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['zip']),
    })
    const user = userEvent.setup()
    render(<Keys />)

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await user.click(screen.getByRole('button', { name: /generate key pair/i }))

    const body = globalThis.fetch.mock.calls[0][1].body
    expect(body.get('password')).toBe('secret')
  })

  test('shows the backend error message when generation fails', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: 'internal_error',
          message: 'Could not generate the key pair.',
        },
      }),
    })
    const user = userEvent.setup()
    render(<Keys />)

    await user.click(screen.getByRole('button', { name: /generate key pair/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not generate the key pair.',
    )
  })
})
