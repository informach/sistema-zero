import { expect, test } from 'bun:test'
import { PaymentsHttpClient } from '../../src/infrastructure/gateways/payments-http.client'

type FetchMock = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

async function withFetchMock<T>(mock: FetchMock, run: () => Promise<T>): Promise<T> {
  const original = globalThis.fetch
  Object.defineProperty(globalThis, 'fetch', { configurable: true, value: mock, writable: true })
  try {
    return await run()
  } finally {
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: original,
      writable: true,
    })
  }
}

test('PaymentsHttpClient recusa amountInCents numérico para não arredondar bigint', async () => {
  const impreciseAmountInCents = Number('9007199254740993')
  const fetchMock: FetchMock = async () =>
    Response.json({
      id: 'pay_1',
      status: 'PAID',
      amountInCents: impreciseAmountInCents,
      customer: null,
      metadata: {},
      paidAt: '2026-07-24T12:00:00.000Z',
      refundedAt: null,
    })

  await withFetchMock(fetchMock, async () => {
    const client = new PaymentsHttpClient({ baseUrl: 'http://payments.test', timeoutMs: 1000 })
    await expect(client.getPayment('pay_1')).rejects.toThrow(
      'amountInCents deve ser uma string inteira',
    )
  })
})
