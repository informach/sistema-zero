import { describe, expect, test } from 'bun:test'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import { pixStatus, startBoleto, startCard, startPix } from '../../src/server/checkout'
import { makeFulfill } from '../../src/server/fulfillment'
import { makeGrantMembers } from '../../src/server/members-grant'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

// CPF válido (dígitos verificadores) para os forms de boleto/cartão.
const CPF = '52998224725'
const ADDRESS = {
  street: 'Rua das Flores',
  number: '100',
  neighborhood: 'Centro',
  zipcode: '01001000',
  city: 'São Paulo',
  state: 'SP',
}

function deps(
  repo: ReturnType<typeof createFakeRepo>['repo'],
  gw: ReturnType<typeof createFakeGateway>,
) {
  return {
    repo,
    gateway: gw.gateway,
    offerSlug: 'no-comando-da-ia',
    productName: 'No Comando da IA',
    productSku: 'no-comando-da-ia',
    fulfill: makeFulfill({ repo, gateway: gw.gateway }),
    grantMembers: makeGrantMembers({ gateway: gw.gateway, offerRef: 'no-comando-da-ia' }),
  }
}

function req(method: string, cookie?: string, body?: unknown): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (cookie) headers.cookie = cookie
  return new Request('http://localhost/api/checkout', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const cookieFor = (id: string) => `${LEAD_COOKIE}=${id}`

async function paidLead() {
  const fake = createFakeRepo()
  const { id } = await fake.repo.createLead()
  await fake.repo.updateLead(id, {
    nome: 'Ana Souza',
    email: 'ana@example.com',
    telefone: '11999998888',
  })
  return { ...fake, id }
}

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

  test('aplica cupom: cobra o valor final, registra offerId/cupom e persiste no lead', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    gw.addCoupon('PROMO10', 1000) // R$10 de desconto
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana', email: 'ana@example.com', telefone: '11999998888' })
    const res = await startPix(
      req('POST', cookieFor(id), { couponCode: 'promo10' }),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    const input = gw.calls.create[0]?.input as {
      amountInCents: number
      metadata: { offerId: string; couponCode: string }
    }
    expect(input.amountInCents).toBe(2700)
    expect(input.metadata.offerId).toBe('offer-1')
    expect(input.metadata.couponCode).toBe('PROMO10')
    expect(leads.get(id)?.couponCode).toBe('PROMO10')
    // O checkout grava a oferta vendida no lead (fundação multi-oferta).
    expect(leads.get(id)?.offerRef).toBe('no-comando-da-ia')
  })

  test('cupom inválido → 422 e não cria cobrança', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana', email: 'ana@example.com', telefone: '11999998888' })
    const res = await startPix(req('POST', cookieFor(id), { couponCode: 'NOPE' }), deps(repo, gw))
    expect(res.status).toBe(422)
    expect(gw.calls.create).toHaveLength(0)
  })

  test('registra o uso do cupom só na confirmação (polling)', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    gw.addCoupon('PROMO10', 1000)
    await startPix(req('POST', cookieFor(id), { couponCode: 'promo10' }), deps(repo, gw))
    expect(gw.calls.redeem).toHaveLength(0) // ainda não pago
    gw.setStatus('PAID')
    await pixStatus(req('GET', cookieFor(id)), 'pay-1', deps(repo, gw))
    expect(gw.calls.redeem).toContain('PROMO10')
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
  test('marca o lead como pago e registra o comprador quando o gateway retorna PAID', async () => {
    const { repo, leads, events, id } = await paidLead()
    const gw = createFakeGateway()
    await startPix(req('POST', cookieFor(id)), deps(repo, gw))

    gw.setStatus('PAID')
    const res = await pixStatus(req('GET', cookieFor(id)), 'pay-1', deps(repo, gw))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { status: string }).status).toBe('PAID')
    expect(leads.get(id)?.paidAt).not.toBeNull()
    expect(events.some((e) => e.eventName === 'pagamento_confirmado')).toBe(true)
    expect(leads.get(id)?.buyerRegisteredAt).not.toBeNull()
    // Concede o acesso na área de membros (best-effort) após o registro.
    expect(gw.calls.grant).toHaveLength(1)
    expect(gw.calls.grant[0]?.input).toMatchObject({
      userId: leads.get(id)?.buyerUserId,
      paymentId: 'pay-1',
    })
  })

  test('404 quando o paymentId não pertence ao lead', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    const res = await pixStatus(req('GET', cookieFor(id)), 'pay-outro', deps(repo, gw))
    expect(res.status).toBe(404)
  })
})

describe('POST /api/checkout/boleto', () => {
  test('gera boleto via gateway com idempotency por método e devolve a linha digitável', async () => {
    const { repo, leads, events, id } = await paidLead()
    const gw = createFakeGateway()
    const res = await startBoleto(
      req('POST', cookieFor(id), { cpf: CPF, address: ADDRESS }),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { boleto: { digitableLine: string } | null }
    expect(body.boleto?.digitableLine).toBeTruthy()

    expect(gw.calls.create[0]?.idempotencyKey).toBe(`funil-${id}-boleto`)
    const input = gw.calls.create[0]?.input as {
      method: string
      customer: { document: string; phone: string }
    }
    expect(input.method).toBe('BOLETO')
    expect(input.customer.document).toBe(CPF)
    expect(leads.get(id)?.paymentId).toBe('pay-1')
    expect(events.some((e) => e.step === 'checkout_boleto')).toBe(true)
  })

  test('400 com CPF inválido (validação no servidor)', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    const res = await startBoleto(
      req('POST', cookieFor(id), { cpf: '11111111111', address: ADDRESS }),
      deps(repo, gw),
    )
    expect(res.status).toBe(400)
    expect(gw.calls.create).toHaveLength(0)
  })

  test('409 quando o lead não tem telefone (exigido pelo boleto)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana', email: 'ana@example.com' })
    const res = await startBoleto(
      req('POST', cookieFor(id), { cpf: CPF, address: ADDRESS }),
      deps(repo, gw),
    )
    expect(res.status).toBe(409)
  })
})

describe('POST /api/checkout/card', () => {
  function cardBody(attemptId = 'att-1') {
    return {
      token: 'card-token-xyz',
      brand: 'visa',
      last4: '0087',
      installments: 1,
      attemptId,
      customer: { document: CPF, birth: '1990-01-31', address: ADDRESS },
    }
  }

  test('cartão aprovado (PAID): confirma na hora e registra o comprador', async () => {
    const { repo, leads, events, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setStatus('PAID')
    const res = await startCard(req('POST', cookieFor(id), cardBody()), deps(repo, gw))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { status: string; card: { last4: string } | null }
    expect(body.status).toBe('PAID')
    expect(body.card?.last4).toBe('0087')

    expect(gw.calls.create[0]?.idempotencyKey).toBe(`funil-${id}-card-att-1`)
    expect((gw.calls.create[0]?.input as { method: string }).method).toBe('CREDIT_CARD')
    expect(leads.get(id)?.paidAt).not.toBeNull()
    expect(events.some((e) => e.step === 'checkout_card')).toBe(true)
    expect(leads.get(id)?.buyerRegisteredAt).not.toBeNull()
    // Concede o acesso na área de membros (best-effort) após o registro.
    expect(gw.calls.grant).toHaveLength(1)
    expect(gw.calls.grant[0]?.input).toMatchObject({
      userId: leads.get(id)?.buyerUserId,
      paymentId: 'pay-1',
    })
  })

  test('cartão recusado (FAILED): não marca pago, não registra, não concede', async () => {
    const { repo, leads, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setStatus('FAILED')
    const res = await startCard(req('POST', cookieFor(id), cardBody()), deps(repo, gw))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { status: string }).status).toBe('FAILED')
    expect(leads.get(id)?.paidAt).toBeNull()
    expect(leads.get(id)?.buyerRegisteredAt).toBeNull()
    expect(gw.calls.grant).toHaveLength(0)
  })

  test('nova tentativa usa attemptId diferente (chave de idempotência distinta)', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setStatus('FAILED')
    await startCard(req('POST', cookieFor(id), cardBody('att-1')), deps(repo, gw))
    await startCard(req('POST', cookieFor(id), cardBody('att-2')), deps(repo, gw))
    expect(gw.calls.create[0]?.idempotencyKey).toBe(`funil-${id}-card-att-1`)
    expect(gw.calls.create[1]?.idempotencyKey).toBe(`funil-${id}-card-att-2`)
  })
})
