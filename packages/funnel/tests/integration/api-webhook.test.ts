import { describe, expect, test } from 'bun:test'
import { handlePaymentWebhook } from '../../src/server/webhook'
import { createFakeRepo } from '../fakes/fake-db'

const TOKEN = 'token-interno-do-gateway'

function req(
  body: unknown,
  opts: { token?: string; deliveryId?: string; event?: string } = {},
): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.token) headers['x-internal-token'] = opts.token
  if (opts.deliveryId) headers['x-delivery-id'] = opts.deliveryId
  if (opts.event) headers['x-event-type'] = opts.event
  return new Request('http://localhost/api/webhooks/payments', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('POST /api/webhooks/payments', () => {
  test('401 com token interno inválido', async () => {
    const { repo } = createFakeRepo()
    const res = await handlePaymentWebhook(
      req({ event: 'payment.paid', data: { paymentId: 'pay-1' } }, { token: 'errado' }),
      { repo, internalToken: TOKEN },
    )
    expect(res.status).toBe(401)
  })

  test('payment.paid marca o lead como pago + evento pagamento_confirmado', async () => {
    const { repo, leads, events } = createFakeRepo()
    const { id } = await repo.createLead()
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1', event: 'payment.paid' },
      ),
      { repo, internalToken: TOKEN },
    )
    expect(res.status).toBe(200)
    expect(leads.get(id)?.paidAt).not.toBeNull()
    expect(events.filter((e) => e.eventName === 'pagamento_confirmado')).toHaveLength(1)
  })

  test('entregas com delivery-ids diferentes (mesmo pagamento) confirmam só uma vez', async () => {
    const { repo, leads, events } = createFakeRepo()
    const { id } = await repo.createLead()
    await repo.setPayment(id, 'pay-1')
    const make = (deliveryId: string) =>
      handlePaymentWebhook(
        req(
          { id: deliveryId, event: 'payment.paid', data: { paymentId: 'pay-1' } },
          { token: TOKEN, deliveryId },
        ),
        { repo, internalToken: TOKEN },
      )
    await make('d1')
    await make('d2') // retry do gateway com outro id → markPaid idempotente
    expect(leads.get(id)?.paidAt).not.toBeNull()
    expect(events.filter((e) => e.eventName === 'pagamento_confirmado')).toHaveLength(1)
  })

  test('entrega duplicada (mesmo x-delivery-id) não escreve de novo', async () => {
    const { repo, events } = createFakeRepo()
    const { id } = await repo.createLead()
    await repo.setPayment(id, 'pay-1')
    const make = () =>
      handlePaymentWebhook(
        req(
          { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
          { token: TOKEN, deliveryId: 'd1' },
        ),
        { repo, internalToken: TOKEN },
      )
    await make()
    const second = await make()
    expect(second.status).toBe(200)
    expect(((await second.json()) as { deduped?: boolean }).deduped).toBe(true)
    expect(events.filter((e) => e.eventName === 'pagamento_confirmado')).toHaveLength(1)
  })
})
