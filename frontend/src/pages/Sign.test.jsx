import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Sign from './Sign.jsx'

const originalFetch = globalThis.fetch
const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

const signedResponse = {
  operation_id: 1,
  document_filename: 'note.txt',
  document_size: 5,
  document_sha256: 'a'.repeat(64),
  algorithm: 'RSA-PSS-SHA256',
  signed_at: '2026-10-27T00:00:00.000000Z',
  signature_filename: 'note.sig',
  signature_base64: btoa('signature-bytes'),
}

function sampleFiles() {
  return {
    document: new File(['hello'], 'note.txt', { type: 'text/plain' }),
    privateKey: new File(['-----BEGIN PRIVATE KEY-----'], 'private.pem', {
      type: 'application/x-pem-file',
    }),
  }
}

async function fillAndSubmit(user) {
  const { document, privateKey } = sampleFiles()
  await user.upload(screen.getByLabelText(/document/i), document)
  await user.upload(screen.getByLabelText(/private key/i), privateKey)
  await user.click(screen.getByRole('button', { name: /sign document/i }))
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
  URL.createObjectURL = vi.fn(() => 'blob:signature-url')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
})

describe('Generate Signature', () => {
  test('requires a Document and Private Key before submitting', async () => {
    const user = userEvent.setup()
    render(<Sign />)

    await user.click(screen.getByRole('button', { name: /sign document/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/document/i)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('signs a Document and offers the .sig download', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => signedResponse,
    })
    const user = userEvent.setup()
    render(<Sign />)

    await fillAndSubmit(user)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/sign',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = globalThis.fetch.mock.calls[0][1].body
    expect(body.get('document')).toBeInstanceOf(File)
    expect(body.get('private_key')).toBeInstanceOf(File)

    expect(
      await screen.findByRole('heading', { name: /signature created/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('a'.repeat(64))).toBeInTheDocument()
    expect(screen.getByText('RSA-PSS-SHA256')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: /download signature/i })
    expect(link).toHaveAttribute('download', 'note.sig')
    expect(link).toHaveAttribute('href', 'blob:signature-url')
  })

  test('sends the password when one is supplied', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => signedResponse,
    })
    const user = userEvent.setup()
    render(<Sign />)

    await user.type(screen.getByLabelText(/password/i), 'secret')
    await fillAndSubmit(user)

    const body = globalThis.fetch.mock.calls[0][1].body
    expect(body.get('password')).toBe('secret')
  })

  test('shows the backend error message when signing fails', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: 'invalid_private_key',
          message: 'The Private Key must be an RSA-2048 PEM file.',
        },
      }),
    })
    const user = userEvent.setup()
    render(<Sign />)

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Private Key must be an RSA-2048 PEM file.',
    )
  })

  test('clear resets the form and removes the result', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => signedResponse,
    })
    const user = userEvent.setup()
    render(<Sign />)

    await fillAndSubmit(user)
    await screen.findByRole('heading', { name: /signature created/i })

    await user.click(screen.getByRole('button', { name: /clear form/i }))

    expect(
      screen.queryByRole('heading', { name: /signature created/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText(/document/i).files).toHaveLength(0)
  })
})
