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

function txtFile(content = 'hello') {
  return new File([content], 'note.txt', { type: 'text/plain' })
}

function signatureFile() {
  return new File(['signature'], 'note.sig', {
    type: 'application/octet-stream',
  })
}

function publicKeyFile() {
  return new File(['-----BEGIN PUBLIC KEY-----'], 'public.pem', {
    type: 'application/x-pem-file',
  })
}

async function uploadSupportingFiles(user) {
  await user.upload(screen.getByLabelText(/signature artifact/i), signatureFile())
  await user.upload(screen.getByLabelText(/public key/i), publicKeyFile())
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('Tamper demonstration', () => {
  test('prefills the editor and verifies unchanged text as Valid', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => validResponse,
    })
    const user = userEvent.setup()
    render(<Verify />)

    await user.upload(screen.getByLabelText(/document/i), txtFile('hello'))
    await uploadSupportingFiles(user)

    const editor = await screen.findByLabelText(/tamper text/i)
    expect(editor).toHaveValue('hello')

    await user.click(
      screen.getByRole('button', { name: /tamper & re-verify/i }),
    )

    const body = globalThis.fetch.mock.calls[0][1].body
    expect(await body.get('document').text()).toBe('hello')
    expect(
      await screen.findByRole('heading', { name: /^valid$/i }),
    ).toBeInTheDocument()
  })

  test('editing one character produces Invalid', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => invalidResponse,
    })
    const user = userEvent.setup()
    render(<Verify />)

    await user.upload(screen.getByLabelText(/document/i), txtFile('hello'))
    await uploadSupportingFiles(user)

    const editor = await screen.findByLabelText(/tamper text/i)
    await user.clear(editor)
    await user.type(editor, 'hellp')

    await user.click(
      screen.getByRole('button', { name: /tamper & re-verify/i }),
    )

    const body = globalThis.fetch.mock.calls[0][1].body
    expect(await body.get('document').text()).toBe('hellp')
    expect(
      await screen.findByRole('heading', { name: /^invalid$/i }),
    ).toBeInTheDocument()
  })

  test('disables the editor for a non-UTF-8 TXT Document', async () => {
    const user = userEvent.setup()
    render(<Verify />)

    const invalidUtf8 = new File(
      [new Uint8Array([0xff, 0xfe, 0x00, 0x41])],
      'bad.txt',
      { type: 'text/plain' },
    )

    await user.upload(screen.getByLabelText(/document/i), invalidUtf8)

    expect(await screen.findByText(/not valid UTF-8/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/tamper text/i)).not.toBeInTheDocument()
  })

  test('does not offer the editor for a PDF', async () => {
    const user = userEvent.setup()
    render(<Verify />)

    await user.upload(
      screen.getByLabelText(/document/i),
      new File(['%PDF-1.4\n'], 'report.pdf', { type: 'application/pdf' }),
    )

    expect(screen.queryByLabelText(/tamper text/i)).not.toBeInTheDocument()
  })

  test('requires the Signature Artifact and Public Key before re-verifying', async () => {
    const user = userEvent.setup()
    render(<Verify />)

    await user.upload(screen.getByLabelText(/document/i), txtFile())
    await screen.findByLabelText(/tamper text/i)

    await user.click(
      screen.getByRole('button', { name: /tamper & re-verify/i }),
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/signature artifact/i)
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })
})
