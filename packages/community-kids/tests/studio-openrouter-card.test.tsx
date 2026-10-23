import { afterEach, expect, test } from 'bun:test'
import type { StudioAiAccountView } from '@sistemazero/core/ai-credits'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StudioOpenRouterCard } from '../src/app/pais/_components/studio-openrouter-card'

const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup()
  globalThis.fetch = originalFetch
})
const account: StudioAiAccountView = {
  available: true,
  connected: true,
  source: 'platform',
  connectedAt: '2026-10-15T12:00:00Z',
  externalDailyLimitMicroUsd: 1_000_000,
  externalMonthlyLimitMicroUsd: 5_000_000,
  keyManagementUrl: 'https://openrouter.ai/settings/keys',
}
test('parent explicitly selects external funding and saves decimal USD limits without seeing a key', async () => {
  let saved: unknown
  globalThis.fetch = Object.assign(
    async (_url: unknown, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        saved = JSON.parse(init.body as string)
        return Response.json({ account: { ...account, ...(saved as object) } })
      }
      return Response.json({ account, costs: null })
    },
    { preconnect: originalFetch.preconnect },
  )
  render(<StudioOpenRouterCard />)
  const select = await screen.findByLabelText('Fonte de consumo')
  fireEvent.change(select, { target: { value: 'openrouter' } })
  fireEvent.change(screen.getByLabelText('Limite diário (US$)'), { target: { value: '0,25' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar preferências' }))
  await screen.findByText('Preferências salvas.')
  expect(saved).toEqual({
    source: 'openrouter',
    externalDailyLimitMicroUsd: 250_000,
    externalMonthlyLimitMicroUsd: 5_000_000,
  })
  expect(screen.getByRole('heading', { name: 'Assistentes no Estúdio' })).toBeTruthy()
  expect(screen.getByText(/seu próprio saldo no OpenRouter/)).toBeTruthy()
  expect(document.querySelector('input[type="password"]')).toBeNull()
})
test('disabled external integration still lets the responsible adult choose included funding', async () => {
  globalThis.fetch = Object.assign(
    async () => Response.json({ account: { ...account, available: false, source: 'openrouter' } }),
    { preconnect: originalFetch.preconnect },
  )
  render(<StudioOpenRouterCard />)
  await screen.findByLabelText('Fonte de consumo')
  expect(
    (screen.getByRole('button', { name: 'Trocar conexão' }) as HTMLButtonElement).disabled,
  ).toBe(true)
  expect(
    (screen.getByRole('button', { name: 'Salvar preferências' }) as HTMLButtonElement).disabled,
  ).toBe(false)
})
test('cost display distinguishes actual charges, uncertain estimates and pending reservations', async () => {
  const empty = { confirmedMicroUsd: 0, uncertainMicroUsd: 0, reservedMicroUsd: 0, calls: 0 }
  globalThis.fetch = Object.assign(
    async () =>
      Response.json({
        account,
        costs: {
          day: '2026-10-15',
          month: '2026-10',
          platform: { today: empty, month: empty },
          openrouter: {
            today: empty,
            month: {
              confirmedMicroUsd: 1200,
              uncertainMicroUsd: 3000,
              reservedMicroUsd: 6000,
              calls: 3,
            },
          },
        },
      }),
    { preconnect: originalFetch.preconnect },
  )
  render(<StudioOpenRouterCard />)
  await waitFor(() => expect(screen.getByText(/ainda não confirmados pelo provedor/)).toBeTruthy())
  expect(screen.getByText(/reservados para operações em andamento/)).toBeTruthy()
  expect(screen.getByText(/custo confirmado · 3 chamadas/)).toBeTruthy()
})
