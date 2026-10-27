import { afterEach, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ArquipelagoLimitCard } from '../src/app/pais/_components/arquipelago-limit-card'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

test('carrega e salva o limite confirmado pelo servidor', async () => {
  const calls: Array<{ method: string; body?: string }> = []
  globalThis.fetch = Object.assign(
    mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ method: init?.method ?? 'GET', body: init?.body?.toString() })
      return Response.json({ limiteDiarioMinutos: init?.method === 'PUT' ? 45 : 30 })
    }),
    { preconnect: originalFetch.preconnect },
  )
  render(<ArquipelagoLimitCard />)
  const input = await screen.findByRole('spinbutton', { name: 'Minutos por dia' })
  expect((input as HTMLInputElement).value).toBe('30')
  fireEvent.change(input, { target: { value: '45' } })
  fireEvent.click(screen.getByRole('button', { name: 'Salvar limite' }))
  await screen.findByText('Limite salvo.')
  expect(calls.at(-1)).toEqual({ method: 'PUT', body: '{"limiteDiarioMinutos":45}' })
})

test('falha de leitura oferece nova tentativa sem inventar limite', async () => {
  let attempts = 0
  globalThis.fetch = Object.assign(
    mock(async () => {
      attempts++
      return attempts === 1
        ? Response.json({}, { status: 503 })
        : Response.json({ limiteDiarioMinutos: 30 })
    }),
    { preconnect: originalFetch.preconnect },
  )
  render(<ArquipelagoLimitCard />)
  await screen.findByRole('alert')
  expect(screen.queryByRole('spinbutton')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  await waitFor(() => expect(screen.getByRole('spinbutton')).toBeTruthy())
})
