import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import App from './App.jsx'

const originalFetch = globalThis.fetch

const emptyData = {
  total_signing_operations: 0,
  total_verification_attempts: 0,
  successful_verifications: 0,
  failed_verifications: 0,
  recent_activity: [],
  records: [],
}

function renderApp() {
  return render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => emptyData,
  })
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('navigation', () => {
  test('sidebar links reach each page', async () => {
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
