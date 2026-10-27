import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import Verify from './Verify.jsx'

const originalFetch = globalThis.fetch

const validResponse = {
  valid: true,
  reason: null,
  message: 'The Signature Artifact matches the Document and Public Key.',
  document_filename: 'note.txt',
  document_sha256: 'b'.repeat(64),
  verified_at: '2026-10-27T00:00:00.000000Z',
}

const invalidResponse = {
  valid: false,
  reason: 'verification_failed',
  message:
    'The Signature Artifact does not match the Document or Public Key. The Document may have changed, or the Signature Artifact or Public Key may be wrong.',
  document_filename: 'note.txt',
  document_sha256: 'b'.repeat(64),
  verified_at: '2026-10-27T00:00:00.000000Z',
}

function sampleFiles() {
  return {
    document: new File(['hello'], 'note.txt', { type: 'text/plain' }),
    signature: new File(['signature'], 'note.sig', {
      type: 'application/octet-stream',
    }),
    publicKey: new File(['-----BEGIN PUBLIC KEY-----'], 'public.pem', {
      type: 'application/x-pem-file',
    }),
  }
}

async function fillAndSubmit(user) {
  const { document, signature, publicKey } = sampleFiles()
  await user.upload(screen.getByLabelText(/document/i), document)
  await user.upload(screen.getByLabelText(/signature artifact/i), signature)
  await user.upload(screen.getByLabelText(/public key/i), publicKey)
  await user.click(screen.getByRole('button', { name: /verify signature/i }))
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Verify Signature', () => {
  test('requires a Document, Signature Artifact, and Public Key', async () => {
    const user = userEvent.setup()
    render(<Verify />)

    await user.click(screen.getByRole('button', { name: /verify signature/i }))

    expect(screen.getByRole('alert')).toHaveTextContent(/document/i)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  test('renders a Valid result from the backend response', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => validResponse,
    })
    const user = userEvent.setup()
    render(<Verify />)

    await fillAndSubmit(user)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/verify',
      expect.objectContaining({ method: 'POST' }),
    )
    const body = globalThis.fetch.mock.calls[0][1].body
    expect(body.get('document')).toBeInstanceOf(File)
    expect(body.get('signature')).toBeInstanceOf(File)
    expect(body.get('public_key')).toBeInstanceOf(File)

    expect(
      await screen.findByRole('heading', { name: /^valid$/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(validResponse.message)).toBeInTheDocument()
    expect(screen.getByText('b'.repeat(64))).toBeInTheDocument()
    expect(screen.getByText('note.txt')).toBeInTheDocument()
  })

  test('renders an Invalid result without guessing the cause', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => invalidResponse,
    })
    const user = userEvent.setup()
    render(<Verify />)

    await fillAndSubmit(user)

    expect(
      await screen.findByRole('heading', { name: /^invalid$/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/does not match/i)).toBeInTheDocument()
    expect(screen.getByText(/does not reveal/i)).toBeInTheDocument()
  })

  test('shows the backend error message when verification cannot run', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: 'invalid_public_key',
          message: 'The Public Key must be an RSA-2048 PEM file.',
        },
      }),
    })
    const user = userEvent.setup()
    render(<Verify />)

    await fillAndSubmit(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Public Key must be an RSA-2048 PEM file.',
    )
  })

  test('verify another resets the form and the result', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => validResponse,
    })
    const user = userEvent.setup()
    render(<Verify />)

    await fillAndSubmit(user)
    await screen.findByRole('heading', { name: /^valid$/i })

    await user.click(screen.getByRole('button', { name: /verify another/i }))

    expect(
      screen.queryByRole('heading', { name: /^valid$/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText(/document/i).files).toHaveLength(0)
  })
})
