import { expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))
const { createShellRoutes } = await import('../src/routes')

const id = '514f6c84-bf26-4a96-b0c9-e8bf49a32327'
const intentId = '65367e2d-86b5-4d97-948a-cfd7b8bdfb1a'
const paymentId = '0a10990d-3348-4ee9-9bf1-74d221b33ded'
const buyer = { id: 'qa-owner', email: 'qa@example.invalid', role: 'customer', status: 'active' }
function setup(user: unknown = buyer) {
  const calls: unknown[] = []
  const reply =
    (method: string) =>
    async (...args: unknown[]) => {
      calls.push({ method, args })
      return { status: 200, body: { ok: true } }
    }
  const routes = createShellRoutes({
    session: { getSession: async () => user },
    payments: {
      getActiveRetryIntent: reply('active'),
      createRetryIntent: reply('create'),
      getRetryIntent: reply('get'),
      paySubscriptionCharge: reply('pay'),
    },
  } as never)
  return { routes, calls }
}
const context = () => ({ params: Promise.resolve({ id, intentId }) })
function request(body?: unknown) {
  return new Request('https://community.example.invalid/api', {
    method: body === undefined ? 'GET' : 'POST',
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}
const execution = {
  paymentToken: 'qa-transient',
  card: { brand: 'visa', last4: '4242' },
  consent: true,
}

test('BFF repassa só identidade e consentimento validados pelo contrato', async () => {
  const { routes, calls } = setup()
  expect((await routes.paymentsMyRetryIntents.GET(request(), context())).status).toBe(200)
  expect((await routes.paymentsMyRetryIntents.POST(request({ paymentId }), context())).status).toBe(
    200,
  )
  expect((await routes.paymentsMyRetryIntent.GET(request(), context())).status).toBe(200)
  expect((await routes.paymentsMyRetryIntent.POST(request(execution), context())).status).toBe(200)
  expect(calls).toEqual([
    { method: 'active', args: [id] },
    { method: 'create', args: [id, paymentId] },
    { method: 'get', args: [id, intentId] },
    { method: 'pay', args: [id, intentId, execution] },
  ])
})

test('BFF rejeita ausência de consentimento, campos de cartão crus e identidade malformada', async () => {
  const { routes, calls } = setup()
  for (const body of [
    { ...execution, consent: false },
    { paymentToken: 'qa-transient', card: execution.card },
    { ...execution, pan: 'qa-raw' },
    { ...execution, card: { ...execution.card, cvv: 'qa-cvv' } },
  ]) {
    const response = await routes.paymentsMyRetryIntent.POST(request(body), context())
    expect(response.status).toBe(400)
    expect(await response.text()).not.toContain('qa-transient')
  }
  expect(
    (await routes.paymentsMyRetryIntents.POST(request({ paymentId, extra: true }), context()))
      .status,
  ).toBe(400)
  expect(
    (
      await routes.paymentsMyRetryIntent.GET(request(), {
        params: Promise.resolve({ id: 'wrong', intentId }),
      })
    ).status,
  ).toBe(400)
  expect(calls).toHaveLength(0)
})

test('BFF recusa suporte inclusive write, criança e sessão ausente antes do gateway', async () => {
  for (const user of [
    null,
    { ...buyer, act: { sub: 'qa-admin', mode: 'readonly' } },
    { ...buyer, act: { sub: 'qa-admin', mode: 'write' } },
    { ...buyer, kids: { kind: 'student' } },
  ]) {
    const { routes, calls } = setup(user)
    const expected = user ? 403 : 401
    expect((await routes.paymentsMyRetryIntents.GET(request(), context())).status).toBe(expected)
    expect(
      (await routes.paymentsMyRetryIntents.POST(request({ paymentId }), context())).status,
    ).toBe(expected)
    expect((await routes.paymentsMyRetryIntent.GET(request(), context())).status).toBe(expected)
    expect((await routes.paymentsMyRetryIntent.POST(request(execution), context())).status).toBe(
      expected,
    )
    expect(calls).toHaveLength(0)
  }
})
