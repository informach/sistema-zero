import { afterEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { act } from 'react'

GlobalRegistrator.register({ url: 'https://community.test/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = await import('react-dom/client')
const { SubscriptionsSection } = await import('../../src/app/(app)/compras/purchases-client')
const nativeFetch = globalThis.fetch
let dispose: (() => Promise<void>) | undefined
afterEach(async () => {
  await dispose?.()
  globalThis.fetch = nativeFetch
})

test('adulto distingue leitura indisponível, lista com pagamento incerto e atualização sem cobrar', async () => {
  const calls: string[] = []
  let read = 0
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/payments/my/subscriptions')
      calls.push(init?.method ?? 'GET')
      if (++read !== 2) return Response.json({ error: { code: 'QA_UNAVAILABLE' } }, { status: 503 })
      return Response.json({
        items: [
          {
            id: 'qa-subscription',
            status: 'ACTIVE',
            amountInCents: '9700',
            currency: 'BRL',
            card: { brand: 'visa', last4: '4242' },
            intervalMonths: 1,
            repeats: null,
            cyclesCompleted: 2,
            lastChargeAt: null,
            description: 'Comunidade dos Criadores (adultos)',
            createdAt: '2026-10-01T12:00:00.000Z',
            canceledAt: null,
            cancelRequestedAt: null,
            pendingOperation: { kind: 'RETRY', state: 'UNKNOWN' },
          },
        ],
      })
    },
    { preconnect: nativeFetch.preconnect },
  )
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  dispose = async () => {
    await act(async () => root.unmount())
    host.remove()
  }
  await act(async () => root.render(<SubscriptionsSection />))
  expect(host.querySelector('[role=alert]')?.textContent).toContain('Não foi possível consultar')
  const refresh = () => {
    const button = [...host.querySelectorAll('button')].find(
      (b) => b.textContent === 'Atualizar assinaturas',
    )
    if (!button) throw new Error('Missing refresh action')
    return button
  }
  await act(async () => refresh().click())
  expect(host.textContent).toContain('Não repita a cobrança')
  expect(host.textContent).toContain('Alterar cartão')
  expect(host.textContent).not.toContain('Conferir regularização')
  await act(async () => refresh().click())
  expect(host.querySelector('[role=alert]')).not.toBeNull()
  expect(host.textContent).not.toContain('Alterar cartão')
  expect(calls).toEqual(['GET', 'GET', 'GET'])
})
