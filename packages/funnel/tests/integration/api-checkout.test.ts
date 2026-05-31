import { describe, expect, test } from 'bun:test'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { pixStatus, startPix } from '../../src/server/checkout'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

function deps(
  repo: ReturnType<typeof createFakeRepo>['repo'],
  gw: ReturnType<typeof createFakeGateway>,
) {
  return {
    repo,
    gateway: gw.gateway,
    productPriceCents: 3700,
    productName: 'No Comando da IA',
    productSku: 'no-comando-da-ia',
  }
}

function req(method: string, cookie?: string): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  return new Request('http://localhost/api/checkout', { method, headers })
}

const cookieFor = (id: string) => `${LEAD_COOKIE}=${id}`

describe('POST /api/checkout/pix', () => {
  test('cria cobrança via gateway, grava payment_id e devolve o pix', async () => {
    const { repo, leads, events } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana', email: 'ana@example.com', telefone: '11999998888' })
    const res = await startPix(req('POST', cookieFor(id)), deps(repo, gw))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { paymentId: string; pix: { copiaECola: string } | null }
    expect(body.paymentId).toBe('pay-1')
    expect(body.pix?.copiaECola).toContain('br.gov.bcb.pix')

    // gateway recebeu o valor correto + idempotency determinístico por lead
    expect(gw.calls.create).toHaveLength(1)
    expect(gw.calls.create[0]?.idempotencyKey).toBe(`funil-${id}`)
    expect((gw.calls.create[0]?.input as { amountInCents: number }).amountInCents).toBe(3700)

    expect(leads.get(id)?.paymentId).toBe('pay-1')
    expect(events.some((e) => e.eventName === 'pagamento_iniciado')).toBe(true)
  })

  test('401 sem lead na sessão', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const res = await startPix(req('POST'), deps(repo, gw))
    expect(res.status).toBe(401)
  })

  test('409 quando o lead ainda não tem e-mail (sem contato para entregar o ebook)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    const res = await startPix(req('POST', cookieFor(id)), deps(repo, gw))
    expect(res.status).toBe(409)
    expect(gw.calls.create).toHaveLength(0)
  })
})

describe('GET /api/checkout/:paymentId', () => {
  test('marca o lead como pago quando o gateway retorna PAID', async () => {
    const { repo, leads, events } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { email: 'ana@example.com' })
    await startPix(req('POST', cookieFor(id)), deps(repo, gw))

    gw.setStatus('PAID')
    const res = await pixStatus(req('GET', cookieFor(id)), 'pay-1', deps(repo, gw))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { status: string }).status).toBe('PAID')
    expect(leads.get(id)?.paidAt).not.toBeNull()
    expect(events.some((e) => e.eventName === 'pagamento_confirmado')).toBe(true)
  })

  test('404 quando o paymentId não pertence ao lead', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    const res = await pixStatus(req('GET', cookieFor(id)), 'pay-outro', deps(repo, gw))
    expect(res.status).toBe(404)
  })
})
