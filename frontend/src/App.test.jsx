import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App.jsx'

const originalFetch = globalThis.fetch

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  globalThis.fetch = vi.fn()
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('dashboard health', () => {
  test('shows backend healthy when the health check succeeds', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    })

    renderApp()

    expect(await screen.findByText(/backend healthy/i)).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.any(Object),
    )
  })

  test('shows backend unavailable when the health check fails', async () => {
    globalThis.fetch.mockRejectedValue(new Error('offline'))

    renderApp()

    expect(await screen.findByText(/backend unavailable/i)).toBeInTheDocument()
  })
})

describe('navigation', () => {
  test('sidebar links reach each page', async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'ok' }),
    })
    const user = userEvent.setup()

    renderApp()

    await user.click(screen.getByRole('link', { name: /generate signature/i }))
    expect(
      await screen.findByRole('heading', { name: /generate signature/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /verify signature/i }))
    expect(
      await screen.findByRole('heading', { name: /verify signature/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /key management/i }))
    expect(
      await screen.findByRole('heading', { name: /key management/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /activity history/i }))
    expect(
      await screen.findByRole('heading', { name: /activity history/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: /dashboard/i }))
    expect(
      await screen.findByRole('heading', { name: /^dashboard$/i }),
    ).toBeInTheDocument()
  })
})
