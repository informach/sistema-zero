import { describe, expect, test } from 'bun:test'
import { LEAD_COOKIE } from '../../src/lib/lead-session'
import {
  pixContentFingerprint,
  pixStatus,
  startBoleto,
  startCard,
  startPix,
} from '../../src/server/checkout'
import { makeFulfill } from '../../src/server/fulfillment'
import { makeGrantMembers } from '../../src/server/members-grant'
import { makeSendWelcome } from '../../src/server/welcome-email'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

// CPF válido (dígitos verificadores) para os forms de boleto/cartão.
const CPF = '52998224725'
// Dados pessoais do checkout (corpo de pix/cartão) — o handler atualiza o lead
// e monta o `customer` da cobrança a partir deles.
const CONTACT = { nome: 'Ana Souza', email: 'ana@example.com', cpf: '529.982.247-25' }
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
  log?: (msg: string, meta?: Record<string, unknown>) => void,
) {
  return {
    repo,
    gateway: gw.gateway,
    offerSlug: 'no-comando-da-ia',
    productName: 'No Comando da IA',
    productSku: 'no-comando-da-ia',
    fulfill: makeFulfill({ repo, gateway: gw.gateway }),
    grantMembers: makeGrantMembers({ gateway: gw.gateway, offerRef: 'no-comando-da-ia' }),
    log,
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
    const res = await startPix(req('POST', cookieFor(id), { contact: CONTACT }), deps(repo, gw))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { paymentId: string; pix: { copiaECola: string } | null }
    expect(body.paymentId).toBe('pay-1')
    expect(body.pix?.copiaECola).toContain('br.gov.bcb.pix')

    expect(gw.calls.create).toHaveLength(1)
    // Chave determinística por lead+conteúdo: mesmos dados → MESMA cobrança.
    const fp = await pixContentFingerprint({
      amountInCents: 3700,
      couponCode: null,
      contact: CONTACT,
    })
    expect(gw.calls.create[0]?.idempotencyKey).toBe(`funil-${id}-${fp}`)
    const input = gw.calls.create[0]?.input as {
      amountInCents: number
      customer: { name: string; email: string; document: string; phone?: string }
    }
    expect(input.amountInCents).toBe(3700)
    // Dados pessoais viram o `customer` da cobrança (devedor do Pix na Efí).
    expect(input.customer).toEqual({
      name: 'Ana Souza',
      email: 'ana@example.com',
      document: CPF,
      phone: '11999998888',
    })

    // O lead é atualizado com o contato enviado (incl. CPF sem máscara).
    expect(leads.get(id)?.nome).toBe('Ana Souza')
    expect(leads.get(id)?.document).toBe(CPF)
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
      req('POST', cookieFor(id), { contact: CONTACT, couponCode: 'promo10' }),
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
    const res = await startPix(
      req('POST', cookieFor(id), { contact: CONTACT, couponCode: 'NOPE' }),
      deps(repo, gw),
    )
    expect(res.status).toBe(422)
    expect(gw.calls.create).toHaveLength(0)
  })

  test('registra o uso do cupom só na confirmação (polling)', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    gw.addCoupon('PROMO10', 1000)
    await startPix(
      req('POST', cookieFor(id), { contact: CONTACT, couponCode: 'promo10' }),
      deps(repo, gw),
    )
    expect(gw.calls.redeem).toHaveLength(0) // ainda não pago
    gw.setStatus('PAID')
    await pixStatus(req('GET', cookieFor(id)), 'pay-1', deps(repo, gw))
    expect(gw.calls.redeem).toContain('PROMO10')
  })

  test('400 sem os dados pessoais no corpo (Pix não é gerado sem contato)', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    const res = await startPix(req('POST', cookieFor(id)), deps(repo, gw))
    expect(res.status).toBe(400)
    expect(gw.calls.create).toHaveLength(0)
  })

  test('idempotência por conteúdo: mesmos dados → mesma chave; dados diferentes → chave nova', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    await startPix(req('POST', cookieFor(id), { contact: CONTACT }), deps(repo, gw))
    await startPix(req('POST', cookieFor(id), { contact: CONTACT }), deps(repo, gw))
    expect(gw.calls.create[0]?.idempotencyKey).toBe(gw.calls.create[1]?.idempotencyKey)

    // CPF corrigido (outro CPF válido) → payload muda → chave NOVA (cobrança nova,
    // em vez de 409 IDEMPOTENCY_CONFLICT no payments).
    await startPix(
      req('POST', cookieFor(id), { contact: { ...CONTACT, cpf: '111.444.777-35' } }),
      deps(repo, gw),
    )
    expect(gw.calls.create[2]?.idempotencyKey).not.toBe(gw.calls.create[0]?.idempotencyKey)
    expect(gw.calls.create[2]?.idempotencyKey).toMatch(new RegExp(`^funil-${id}-[0-9a-f]{12}$`))
  })

  test('400 com CPF inválido nos dados pessoais (validação no servidor)', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    const res = await startPix(
      req('POST', cookieFor(id), { contact: { ...CONTACT, cpf: '111.111.111-11' } }),
      deps(repo, gw),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { fields: Record<string, string> }
    expect(body.fields['contact.cpf']).toBe('CPF inválido.')
    expect(gw.calls.create).toHaveLength(0)
  })

  test('falha do provedor → 502 GATEWAY_ERROR + LOGA o erro real; não grava payment', async () => {
    const { repo, leads, events, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setCreateResult(502, { error: { code: 'PROVIDER_ERROR', message: 'Efí indisponível' } })
    const logged: Array<{ msg: string; meta?: Record<string, unknown> }> = []
    const res = await startPix(
      req('POST', cookieFor(id), { contact: CONTACT }),
      deps(repo, gw, (msg, meta) => logged.push({ msg, meta })),
    )
    expect(res.status).toBe(502)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('GATEWAY_ERROR')
    // O erro real (status+code+message do payments) é logado — antes era engolido.
    expect(logged).toEqual([
      {
        msg: 'checkout.pix.gateway_error',
        meta: { leadId: id, status: 502, code: 'PROVIDER_ERROR', message: 'Efí indisponível' },
      },
    ])
    expect(leads.get(id)?.paymentId).toBeNull()
    expect(events.some((e) => e.eventName === 'pagamento_iniciado')).toBe(false)
  })

  test('409 IDEMPOTENCY_IN_FLIGHT (cobrança ainda em criação) → 409 PAYMENT_IN_PROGRESS', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setCreateResult(409, {
      error: { code: 'IDEMPOTENCY_IN_FLIGHT', message: 'Operação em andamento' },
    })
    const res = await startPix(req('POST', cookieFor(id), { contact: CONTACT }), deps(repo, gw))
    expect(res.status).toBe(409)
    const body = (await res.json()) as { error: { code: string; message: string } }
    expect(body.error.code).toBe('PAYMENT_IN_PROGRESS')
    expect(body.error.message).toContain('aguarde')
  })

  test('409 IDEMPOTENCY_CONFLICT NÃO vira "aguarde" — continua 502 (erro de payload)', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setCreateResult(409, {
      error: { code: 'IDEMPOTENCY_CONFLICT', message: 'Payload diferente' },
    })
    const res = await startPix(req('POST', cookieFor(id), { contact: CONTACT }), deps(repo, gw))
    expect(res.status).toBe(502)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('GATEWAY_ERROR')
  })
})

describe('GET /api/checkout/:paymentId', () => {
  test('marca o lead como pago e registra o comprador quando o gateway retorna PAID', async () => {
    const { repo, leads, events, id } = await paidLead()
    const gw = createFakeGateway()
    await startPix(req('POST', cookieFor(id), { contact: CONTACT }), deps(repo, gw))

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

  test('409 IDEMPOTENCY_IN_FLIGHT → 409 PAYMENT_IN_PROGRESS; 502 loga o evento do boleto', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setCreateResult(409, { error: { code: 'IDEMPOTENCY_IN_FLIGHT', message: 'Em andamento' } })
    const inFlight = await startBoleto(
      req('POST', cookieFor(id), { cpf: CPF, address: ADDRESS }),
      deps(repo, gw),
    )
    expect(inFlight.status).toBe(409)
    expect(((await inFlight.json()) as { error: { code: string } }).error.code).toBe(
      'PAYMENT_IN_PROGRESS',
    )

    gw.setCreateResult(502, { error: { code: 'PROVIDER_ERROR', message: 'Efí fora' } })
    const logged: string[] = []
    const failed = await startBoleto(
      req('POST', cookieFor(id), { cpf: CPF, address: ADDRESS }),
      deps(repo, gw, (msg) => logged.push(msg)),
    )
    expect(failed.status).toBe(502)
    expect(logged).toEqual(['checkout.boleto.gateway_error'])
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
      contact: CONTACT,
      address: ADDRESS,
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
    const input = gw.calls.create[0]?.input as {
      method: string
      customer: { name: string; document: string; phone: string }
    }
    expect(input.method).toBe('CREDIT_CARD')
    // Dados pessoais compartilhados viram o customer do cartão (CPF sem máscara).
    expect(input.customer).toMatchObject({
      name: 'Ana Souza',
      document: CPF,
      phone: '11999998888',
    })
    expect(leads.get(id)?.document).toBe(CPF)
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

  test('falha do provedor → 502 + loga o evento do cartão; não marca pago nem concede', async () => {
    const { repo, leads, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setCreateResult(502, { error: { code: 'PROVIDER_ERROR', message: 'Efí fora' } })
    const logged: string[] = []
    const res = await startCard(
      req('POST', cookieFor(id), cardBody()),
      deps(repo, gw, (msg) => logged.push(msg)),
    )
    expect(res.status).toBe(502)
    expect(logged).toEqual(['checkout.card.gateway_error'])
    expect(leads.get(id)?.paidAt).toBeNull()
    expect(gw.calls.grant).toHaveLength(0)
  })
})

describe('409 ALREADY_PAID — lead pago não inicia nova cobrança', () => {
  // O guard roda ANTES da validação do corpo (por isso `{}` basta): pelo
  // endpoint direto, um lead pago geraria nova cobrança sobrescrevendo o
  // paymentId pago — pagar 2x pela mesma entrega. A página de checkout cria
  // lead NOVO p/ recompra; a API agora barra também.
  async function alreadyPaid() {
    const fake = createFakeRepo()
    const { id } = await fake.repo.createLead()
    await fake.repo.updateLead(id, {
      nome: 'Ana Souza',
      email: 'ana@example.com',
      telefone: '11999998888',
    })
    await fake.repo.markPaid(id, new Date())
    return { ...fake, id }
  }

  async function expectAlreadyPaid(res: Response, gw: ReturnType<typeof createFakeGateway>) {
    expect(res.status).toBe(409)
    expect(((await res.json()) as { error: { code: string } }).error.code).toBe('ALREADY_PAID')
    expect(gw.calls.create).toHaveLength(0)
  }

  test('pix', async () => {
    const { repo, id } = await alreadyPaid()
    const gw = createFakeGateway()
    await expectAlreadyPaid(await startPix(req('POST', cookieFor(id), {}), deps(repo, gw)), gw)
  })

  test('boleto', async () => {
    const { repo, id } = await alreadyPaid()
    const gw = createFakeGateway()
    await expectAlreadyPaid(await startBoleto(req('POST', cookieFor(id), {}), deps(repo, gw)), gw)
  })

  test('cartão', async () => {
    const { repo, id } = await alreadyPaid()
    const gw = createFakeGateway()
    await expectAlreadyPaid(await startCard(req('POST', cookieFor(id), {}), deps(repo, gw)), gw)
  })
})

describe('welcome no caminho síncrono (simetria com o webhook)', () => {
  test('cartão aprovado (PAID) dispara grant E welcome (e-mail + WhatsApp)', async () => {
    const { repo, id } = await paidLead()
    const gw = createFakeGateway()
    gw.setStatus('PAID')
    const res = await startCard(
      req('POST', cookieFor(id), {
        token: 'card-token-xyz',
        brand: 'visa',
        last4: '0087',
        installments: 1,
        attemptId: 'att-1',
        contact: CONTACT,
        address: ADDRESS,
      }),
      {
        ...deps(repo, gw),
        sendWelcome: makeSendWelcome({
          gateway: gw.gateway,
          communityUrl: 'http://localhost:3007',
        }),
      },
    )
    expect(res.status).toBe(200)
    expect(gw.calls.grant).toHaveLength(1)
    // Welcome saiu já no caminho síncrono (webhook segue como backstop; o
    // messaging deduplica por Idempotency-Key, então o replay não duplica).
    expect(gw.calls.passwordTokens).toEqual(['ana@example.com'])
    expect(gw.calls.messages.map((m) => m.input.channel)).toEqual(['email', 'whatsapp'])
  })
})
