import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { act } from 'react'
import type { PendingSubscriptionOperationView } from '../src/lib/subscription-card'

GlobalRegistrator.register({ url: 'https://kids.test/' })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const tokenization = mock(async () => ({
  payment_token: 'qa-token-only',
  card_mask: '************4242',
}))
const sdk = {
  CreditCard: {
    isScriptBlocked: async () => false,
    setCardNumber: () => ({ verifyCardBrand: async () => 'visa' }),
  },
}
mock.module('@sistemazero/ui/efi-card-token', () => ({
  loadEfi: async () => sdk,
  tokenizeEfiCard: tokenization,
}))
const { createRoot } = await import('react-dom/client')
const { SubscriptionCardUpdate, SubscriptionChargeRetry, SubscriptionOperationNotice } =
  await import('../src/components/billing/subscription-card-update')
const { useMySubscriptions } = await import('../src/components/billing/use-my-subscriptions')
const nativeFetch = globalThis.fetch
const subscriptionId = '514f6c84-bf26-4a96-b0c9-e8bf49a32327'
const intent = {
  id: '65367e2d-86b5-4d97-948a-cfd7b8bdfb1a',
  subscriptionId,
  state: 'READY',
  expiresAt: new Date(Date.now() + 600_000).toISOString(),
  chargesNow: false,
  result: null,
}
const retryIntent = {
  ...intent,
  chargesNow: true,
  amountInCents: '9700',
  currency: 'BRL',
  terms: {
    period: { startsAt: '2026-10-16T12:00:00.000Z', endsAt: '2026-11-16T12:00:00.000Z' },
    nextExecution: '2026-11-16',
  },
}
let unmount: (() => Promise<void>) | undefined
afterEach(async () => {
  await unmount?.()
  unmount = undefined
  globalThis.fetch = nativeFetch
  tokenization.mockReset()
  tokenization.mockResolvedValue({ payment_token: 'qa-token-only', card_mask: '************4242' })
})

async function until(check: () => boolean) {
  for (let index = 0; index < 100 && !check(); index++)
    await act(async () => {
      await Bun.sleep(1)
    })
  expect(check()).toBe(true)
}
function button(label: string) {
  const found = [...document.querySelectorAll('button')].find((node) => node.textContent === label)
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
async function mount(
  currentIntent: unknown = null,
  execution?: () => Promise<Response>,
  availability = { canUpdate: true, tokenization: true },
  retry = false,
  blockedBy: PendingSubscriptionOperationView | null = null,
) {
  const displayIntent = retry ? retryIntent : intent
  const calls: Array<{ path: string; method: string; body: unknown }> = []
  globalThis.fetch = Object.assign(
    async (input: string | URL | Request, init?: RequestInit) => {
      const path = String(input)
      const method = init?.method ?? 'GET'
      calls.push({ path, method, body: init?.body ? JSON.parse(String(init.body)) : null })
      if (path.endsWith('/card-config'))
        return Response.json({
          available: availability.tokenization,
          accountIdentifier: availability.tokenization ? 'qa-public-account' : null,
          environment: 'sandbox',
        })
      if (path.endsWith('/card-intents') || path.endsWith('/retry-intents'))
        return Response.json(
          method === 'GET'
            ? retry
              ? { intent: currentIntent, canRegularize: availability.canUpdate, blockedBy }
              : { intent: currentIntent, canUpdate: availability.canUpdate, blockedBy }
            : displayIntent,
        )
      if (method === 'GET') return Response.json({ ...displayIntent, state: 'UNKNOWN' })
      return execution ? execution() : Response.json({ ...displayIntent, state: 'SUCCEEDED' })
    },
    { preconnect: nativeFetch.preconnect },
  )
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let updated = 0
  unmount = async () => {
    await act(async () => root.unmount())
    host.remove()
  }
  await act(async () =>
    root.render(
      retry ? (
        <SubscriptionChargeRetry
          subscriptionId={subscriptionId}
          paymentId="qa-payment"
          onUpdated={() => {
            updated++
          }}
        />
      ) : (
        <SubscriptionCardUpdate
          subscriptionId={subscriptionId}
          onUpdated={() => {
            updated++
          }}
        />
      ),
    ),
  )
  expect(calls).toHaveLength(0)
  await act(async () => button(retry ? 'Conferir regularização' : 'Alterar cartão').click())
  await until(() => !host.textContent?.includes('Consultando assinatura'))
  if (
    retry &&
    !currentIntent &&
    !blockedBy &&
    availability.canUpdate &&
    availability.tokenization
  ) {
    expect(calls.every((call) => call.method === 'GET')).toBe(true)
    await act(async () => button('Conferir cobrança').click())
    await until(() => !host.textContent?.includes('Conferindo valor e período'))
  }
  return { calls, updated: () => updated }
}
async function fillAndSubmit(confirm = false) {
  const values = ['4242424242424242', 'Titular QA', '52998224725', '12', '2030', '123']
  const inputs = [...document.querySelectorAll<HTMLInputElement>('input:not([type=checkbox])')]
  expect(inputs).toHaveLength(values.length)
  for (let index = 0; index < values.length; index++) {
    const input = inputs[index]!
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    await act(async () => {
      setter?.call(input, values[index])
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
      input.dispatchEvent(new window.Event('change', { bubbles: true }))
    })
  }
  if (confirm)
    await act(async () => document.querySelector<HTMLInputElement>('input[type=checkbox]')!.click())
  await act(async () =>
    document
      .querySelector('form')!
      .dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })),
  )
}

test('troca preventiva só envia token e máscara e não chama débito', async () => {
  const view = await mount()
  await fillAndSubmit()
  await until(() => view.updated() === 1)
  const writes = view.calls.filter((call) => call.method === 'POST')
  expect(writes).toHaveLength(2)
  expect(writes[1]?.body).toEqual({
    paymentToken: 'qa-token-only',
    card: { brand: 'visa', last4: '4242' },
  })
  expect(JSON.stringify(writes)).not.toContain('4242424242424242')
  expect(JSON.stringify(writes)).not.toContain('52998224725')
  expect(view.calls.every((call) => !/retry|checkout/.test(call.path))).toBe(true)
  expect(document.querySelector('form')).toBeNull()
  expect(document.body.textContent).toContain('Não fizemos uma cobrança imediata')
})

test('solicitação desconhecida bloqueia dados e apenas consulta, inclusive ao reabrir', async () => {
  const view = await mount({ ...intent, state: 'UNKNOWN' })
  expect(document.querySelector('form')).toBeNull()
  await act(async () => button('Conferir solicitação').click())
  expect(view.calls.every((call) => call.method === 'GET')).toBe(true)
  expect(tokenization).not.toHaveBeenCalled()
  expect(view.updated()).toBe(0)
})

test('estado fresco de cancelamento recusa formulário apesar do cartão antigo na página', async () => {
  const view = await mount(null, undefined, { canUpdate: false, tokenization: true })
  expect(document.querySelector('form')).toBeNull()
  expect(document.body.textContent).toContain('cancelamento solicitado')
  expect(view.calls.every((call) => call.method === 'GET')).toBe(true)
  expect(tokenization).not.toHaveBeenCalled()
})

test('consulta de solicitação pendente funciona mesmo sem configuração para novo cartão', async () => {
  const view = await mount({ ...intent, state: 'UNKNOWN' }, undefined, {
    canUpdate: false,
    tokenization: false,
  })
  expect(document.querySelector('form')).toBeNull()
  await act(async () => button('Conferir solicitação').click())
  expect(view.calls.every((call) => call.method === 'GET')).toBe(true)
  expect(tokenization).not.toHaveBeenCalled()
})

test('resposta perdida consulta o estado e não repete a alteração', async () => {
  const view = await mount(null, async () => {
    throw new Error('Rede QA')
  })
  await fillAndSubmit()
  await until(() => Boolean(document.body.textContent?.includes('em conferência')))
  expect(view.calls.filter((call) => call.method === 'POST')).toHaveLength(2)
  expect(
    view.calls.filter((call) => call.path.endsWith(intent.id) && call.method === 'GET'),
  ).toHaveLength(1)
  expect(view.updated()).toBe(0)
})

test('fechar durante tokenização descarta o resultado sem POST de execução', async () => {
  const pending = Promise.withResolvers<{ payment_token: string; card_mask: string }>()
  tokenization.mockImplementation(() => pending.promise)
  const view = await mount()
  await fillAndSubmit()
  await until(() => tokenization.mock.calls.length === 1)
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Fechar"]')!.click())
  await act(async () =>
    pending.resolve({ payment_token: 'late-qa-token', card_mask: '************4242' }),
  )
  expect(view.calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  expect(view.updated()).toBe(0)
  expect(document.querySelector('input')).toBeNull()
})

test('regularização mostra termos e exige consentimento antes de tokenizar e cobrar', async () => {
  const view = await mount(null, undefined, undefined, true)
  expect(document.body.textContent).toContain('97,00')
  expect(document.body.textContent).toContain('16/10/2026')
  expect(document.body.textContent).toContain('16/11/2026')
  expect(button('Atualizar cartão e pagar').disabled).toBe(true)
  await fillAndSubmit()
  expect(tokenization).not.toHaveBeenCalled()
  expect(view.calls.filter((call) => call.method === 'POST')).toHaveLength(1)
  await fillAndSubmit(true)
  await until(() => view.updated() === 1)
  const writes = view.calls.filter((call) => call.method === 'POST')
  expect(writes).toHaveLength(2)
  expect(writes[0]?.body).toEqual({ paymentId: 'qa-payment' })
  expect(writes[1]?.body).toEqual({
    paymentToken: 'qa-token-only',
    card: { brand: 'visa', last4: '4242' },
    consent: true,
  })
  expect(JSON.stringify(writes)).not.toContain('4242424242424242')
  expect(JSON.stringify(writes)).not.toContain('52998224725')
  expect(document.body.textContent).toContain('Pagamento confirmado')
  expect(document.querySelector('input')).toBeNull()
})

test.each([
  false,
  true,
])('outra operação pendente aparece sem formulário, token ou POST: retry=%s', async (retry) => {
  const pending: PendingSubscriptionOperationView = {
    kind: retry ? 'CARD_UPDATE' : 'RETRY',
    state: 'UNKNOWN',
  }
  const view = await mount(null, undefined, undefined, retry, pending)
  expect(document.querySelector('form')).toBeNull()
  expect(document.body.textContent).toContain(
    retry ? 'alteração de cartão está em conferência' : 'pagamento está em conferência',
  )
  expect(document.body.textContent).not.toContain('Não foi possível consultar')
  expect(view.calls.every((call) => call.method === 'GET')).toBe(true)
  expect(tokenization).not.toHaveBeenCalled()
})

test('aviso da assinatura não depende da presença de uma cobrança recusada no histórico', async () => {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  unmount = async () => {
    await act(async () => root.unmount())
    host.remove()
  }
  await act(async () =>
    root.render(<SubscriptionOperationNotice operation={{ kind: 'RETRY', state: 'UNKNOWN' }} />),
  )
  expect(host.querySelector('[role=status]')?.textContent).toContain('Não repita a cobrança')
  expect(host.querySelector('button, input, form')).toBeNull()
  await act(async () => root.render(<SubscriptionOperationNotice operation={null} />))
  expect(host.textContent).toBe('')
  expect(tokenization).not.toHaveBeenCalled()
})

test('leitura antiga não substitui a nova lista nem remove pendência da leitura atual', async () => {
  const old = Promise.withResolvers<Response>()
  let calls = 0
  const signals: Array<AbortSignal | null | undefined> = []
  globalThis.fetch = Object.assign(
    async (_input: RequestInfo | URL, init?: RequestInit) => {
      signals.push(init?.signal)
      expect(new Headers(init?.headers).has('signal')).toBe(false)
      return ++calls === 1
        ? old.promise
        : Response.json({
            items: [
              {
                id: 'newer',
                pendingOperation: { kind: 'RETRY', state: 'UNKNOWN' },
              },
            ],
          })
    },
    { preconnect: nativeFetch.preconnect },
  )
  function Probe() {
    const { subscriptions, refresh } = useMySubscriptions()
    return (
      <>
        <button type="button" onClick={() => void refresh()}>
          Refresh QA
        </button>
        <pre>{JSON.stringify(subscriptions)}</pre>
      </>
    )
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  unmount = async () => {
    await act(async () => root.unmount())
    host.remove()
  }
  await act(async () => root.render(<Probe />))
  await act(async () => button('Refresh QA').click())
  expect(signals).toHaveLength(2)
  expect(signals[0]?.aborted).toBe(true)
  expect(signals[1]?.aborted).toBe(false)
  expect(host.textContent).toContain('newer')
  expect(host.textContent).toContain('UNKNOWN')
  await act(async () =>
    old.resolve(Response.json({ items: [{ id: 'stale', pendingOperation: null }] })),
  )
  expect(host.textContent).not.toContain('stale')
  expect(host.textContent).toContain('UNKNOWN')
  expect(calls).toBe(2)
})

test('regularização incerta ao reabrir consulta sem recriar intenção ou débito', async () => {
  const view = await mount({ ...retryIntent, state: 'UNKNOWN' }, undefined, undefined, true)
  expect(document.querySelector('form')).toBeNull()
  await act(async () => button('Conferir solicitação').click())
  expect(view.calls.every((call) => call.method === 'GET')).toBe(true)
  expect(tokenization).not.toHaveBeenCalled()
})

test('termos vencidos não são renovados silenciosamente após consentimento', async () => {
  const view = await mount(
    { ...retryIntent, expiresAt: new Date(Date.now() - 1).toISOString() },
    undefined,
    undefined,
    true,
  )
  await fillAndSubmit(true)
  expect(tokenization).not.toHaveBeenCalled()
  expect(view.calls.every((call) => call.method === 'GET')).toBe(true)
  expect(document.querySelector('form')).toBeNull()
  expect(document.body.textContent).toContain('pode ter vencido')
})

test('regularização com resposta perdida só consulta e não repete o débito', async () => {
  const view = await mount(
    null,
    async () => {
      throw new Error('QA lost response')
    },
    undefined,
    true,
  )
  await fillAndSubmit(true)
  await until(() => Boolean(document.body.textContent?.includes('em conferência')))
  expect(view.calls.filter((call) => call.method === 'POST')).toHaveLength(2)
  expect(
    view.calls.filter((call) => call.path.endsWith(intent.id) && call.method === 'GET'),
  ).toHaveLength(1)
  expect(view.updated()).toBe(0)
})
