import { afterEach, expect, mock, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import {
  ArquipelagoLimitCard,
  duracaoPorExtenso,
} from '../src/app/pais/_components/arquipelago-limit-card'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

function servidor(responder: (init?: RequestInit) => Response) {
  const calls: Array<{ method: string; body?: string }> = []
  globalThis.fetch = Object.assign(
    mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ method: init?.method ?? 'GET', body: init?.body?.toString() })
      return responder(init)
    }),
    { preconnect: originalFetch.preconnect },
  )
  return calls
}

test('fala de tempo como a família fala', () => {
  expect(duracaoPorExtenso(10)).toBe('10 min')
  expect(duracaoPorExtenso(60)).toBe('1 h')
  expect(duracaoPorExtenso(90)).toBe('1 h 30 min')
  expect(duracaoPorExtenso(240)).toBe('4 h')
})

test('carrega, ajusta de 5 em 5 e salva o limite confirmado pelo servidor', async () => {
  const calls = servidor((init) =>
    Response.json({ limiteDiarioMinutos: init?.method === 'PUT' ? 40 : 30 }),
  )
  render(<ArquipelagoLimitCard />)
  await screen.findByText('Tempo livre no Arquipélago')
  expect(screen.getByText('30 min')).toBeTruthy()
  const salvar = screen.getByRole('button', { name: 'Salvar' }) as HTMLButtonElement
  expect(salvar.disabled).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar 5 minutos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Aumentar 5 minutos' }))
  expect(screen.getByText('40 min')).toBeTruthy()
  fireEvent.click(salvar)
  await screen.findByText('Pronto. Agora cada criança tem 40 min por dia.')
  expect(calls.at(-1)).toEqual({ method: 'PUT', body: '{"limiteDiarioMinutos":40}' })
})

test('não passa dos limites do serviço', async () => {
  servidor(() => Response.json({ limiteDiarioMinutos: 10 }))
  render(<ArquipelagoLimitCard />)
  const menos = (await screen.findByRole('button', {
    name: 'Diminuir 5 minutos',
  })) as HTMLButtonElement
  expect(menos.disabled).toBe(true)
})

test('sem o serviço do jogo o cartão não aparece (nada de erro para a família)', async () => {
  const calls = servidor(() => Response.json({}, { status: 503 }))
  const { container } = render(<ArquipelagoLimitCard />)
  await waitFor(() => expect(calls.length).toBe(1))
  expect(container.textContent).toBe('')
  expect(screen.queryByRole('alert')).toBeNull()
})

test('falha ao salvar avisa e mantém o valor escolhido', async () => {
  servidor((init) =>
    init?.method === 'PUT'
      ? Response.json({}, { status: 503 })
      : Response.json({ limiteDiarioMinutos: 30 }),
  )
  render(<ArquipelagoLimitCard />)
  fireEvent.click(await screen.findByRole('button', { name: 'Aumentar 5 minutos' }))
  fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Não consegui salvar')
  expect(screen.getByText('35 min')).toBeTruthy()
})
