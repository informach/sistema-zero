import { describe, expect, test } from 'bun:test'
import { makeFulfill } from '../../src/server/fulfillment'
import { makeGrantMembers } from '../../src/server/members-grant'
import { handlePaymentWebhook } from '../../src/server/webhook'
import { makeSendWelcome } from '../../src/server/welcome-email'
import { createFakeRepo } from '../fakes/fake-db'
import { createFakeGateway } from '../fakes/fake-gateway'

const TOKEN = 'token-interno-do-gateway'
const OFFER = 'no-comando-da-ia'
const COMMUNITY_URL = 'http://localhost:3007'

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

function deps(
  repo: ReturnType<typeof createFakeRepo>['repo'],
  gw: ReturnType<typeof createFakeGateway>,
) {
  return {
    repo,
    internalToken: TOKEN,
    fulfill: makeFulfill({ repo, gateway: gw.gateway }),
    grantMembers: makeGrantMembers({
      gateway: gw.gateway,
      resolveOffer: () => ({ offerSlug: OFFER }),
      repo,
    }),
  }
}

describe('POST /api/webhooks/payments', () => {
  test('401 com token interno inválido', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    const res = await handlePaymentWebhook(
      req({ event: 'payment.paid', data: { paymentId: 'pay-1' } }, { token: 'errado' }),
      deps(repo, gw),
    )
    expect(res.status).toBe(401)
  })

  test('payment.paid marca o lead como pago + registra o comprador no IdP', async () => {
    const { repo, leads, events } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, {
      nome: 'Ana Souza',
      email: 'ana@example.com',
      telefone: '11999998888',
    })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1', event: 'payment.paid' },
      ),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    expect(leads.get(id)?.paidAt).not.toBeNull()
    expect(events.filter((e) => e.eventName === 'pagamento_confirmado')).toHaveLength(1)

    // Comprador garantido via gateway → auth (201 default → guarda o user id).
    expect(gw.calls.ensureBuyer).toHaveLength(1)
    expect(gw.calls.ensureBuyer[0]?.input.email).toBe('ana@example.com')
    expect(leads.get(id)?.buyerRegisteredAt).not.toBeNull()
    expect(leads.get(id)?.buyerUserId).toBe('user-1')
  })

  test('payment.paid concede acesso na área de membros DEPOIS do registro', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ana', email: 'ana@example.com', telefone: '11999998888' })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    // Concedido com o userId recém-registrado + o pagamento + a oferta vendida.
    expect(gw.calls.grant).toHaveLength(1)
    expect(gw.calls.grant[0]?.input).toMatchObject({
      userId: leads.get(id)?.buyerUserId,
      paymentId: 'pay-1',
      offerRef: OFFER,
    })
  })

  test('a concessão usa a oferta gravada no lead (offer_ref), não o fallback do env', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, {
      nome: 'Noa',
      email: 'noa@example.com',
      telefone: '11922223333',
      offerRef: 'plano-assinatura-pro', // oferta diferente do fallback OFFER
    })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    expect(gw.calls.grant).toHaveLength(1)
    expect(gw.calls.grant[0]?.input).toMatchObject({
      userId: leads.get(id)?.buyerUserId,
      offerRef: 'plano-assinatura-pro',
    })
  })

  test('falha na concessão → 502 GRANT_RETRY e NÃO marca a entrega (gateway re-entrega)', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setGrantStatus(502)
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Ivo', email: 'ivo@example.com', telefone: '11900001111' })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      deps(repo, gw),
    )
    expect(res.status).toBe(502)
    // Registro já concluído (não se repete no retry); concessão fica retryável.
    expect(leads.get(id)?.buyerRegisteredAt).not.toBeNull()
    expect(await repo.isWebhookProcessed('d1')).toBe(false)
  })

  test('comprador RECORRENTE (e-mail já existe) → recebe o userId e o acesso é concedido', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    // ensure-buyer reaproveita o usuário existente (200, created:false).
    gw.setEnsureBuyerStatus(200, { userId: 'user-existing', created: false })
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Bia', email: 'bia@example.com', telefone: '11988887777' })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      {
        ...deps(repo, gw),
        sendWelcome: makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo }),
      },
    )
    expect(res.status).toBe(200)
    expect(leads.get(id)?.buyerRegisteredAt).not.toBeNull()
    // O FIX: recorrente agora tem userId → o grant roda (antes ficava null e era pulado).
    expect(leads.get(id)?.buyerUserId).toBe('user-existing')
    expect(leads.get(id)?.buyerIsNew).toBe(false)
    expect(gw.calls.grant).toHaveLength(1)
    expect(gw.calls.grant[0]?.input).toMatchObject({ userId: 'user-existing', paymentId: 'pay-1' })
    // Recorrente NÃO recebe o e-mail de boas-vindas (já tem credenciais).
    expect(gw.calls.messages).toHaveLength(0)
  })

  test('falha transitória no registro → 502 e NÃO marca a entrega (gateway re-entrega)', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setEnsureBuyerStatus(500, { error: { code: 'INTERNAL' } })
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Caio', email: 'caio@example.com', telefone: '11977776666' })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      deps(repo, gw),
    )
    expect(res.status).toBe(502)
    expect(leads.get(id)?.paidAt).not.toBeNull() // markPaid já rodou (idempotente)
    expect(leads.get(id)?.buyerRegisteredAt).toBeNull() // ainda não registrado
    expect(await repo.isWebhookProcessed('d1')).toBe(false) // não deduplica → retry possível
  })

  test('cobrança ANTIGA paga (ponteiro sobrescrito) confirma via histórico e re-aponta o lead', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Bia', email: 'bia@example.com', telefone: '11988887777' })
    // Boleto gerado ontem; Pix gerado hoje sobrescreve o ponteiro do lead…
    await repo.setPayment(id, 'pay-old')
    await repo.setPayment(id, 'pay-new')

    // …e o comprador paga o BOLETO antigo (vale 3 dias).
    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-old' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      deps(repo, gw),
    )
    expect(res.status).toBe(200)
    // O lead foi resolvido pelo HISTÓRICO (lead_payments) — antes a compra se
    // perdia em silêncio (findLeadByPayment → null + entrega marcada).
    expect(leads.get(id)?.paidAt).not.toBeNull()
    // E o ponteiro re-aponta p/ a cobrança DE FATO paga → o grant referencia a certa.
    expect(leads.get(id)?.paymentId).toBe('pay-old')
    expect(gw.calls.grant).toHaveLength(1)
    expect((gw.calls.grant[0]?.input as { paymentId: string }).paymentId).toBe('pay-old')
  })

  test('entregas com delivery-ids diferentes (mesmo pagamento) confirmam só uma vez', async () => {
    const { repo, leads, events } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Dani', email: 'dani@example.com', telefone: '11966665555' })
    await repo.setPayment(id, 'pay-1')
    const make = (deliveryId: string) =>
      handlePaymentWebhook(
        req(
          { id: deliveryId, event: 'payment.paid', data: { paymentId: 'pay-1' } },
          { token: TOKEN, deliveryId },
        ),
        deps(repo, gw),
      )
    await make('d1')
    await make('d2') // retry do gateway com outro id → markPaid idempotente
    expect(leads.get(id)?.paidAt).not.toBeNull()
    expect(events.filter((e) => e.eventName === 'pagamento_confirmado')).toHaveLength(1)
    // Registro idempotente: a 2ª entrega não registra de novo (buyer_registered_at já set).
    expect(gw.calls.ensureBuyer).toHaveLength(1)
  })

  test('payment.paid dispara o welcome (token + e-mail + WhatsApp) após o grant', async () => {
    const { repo, leads } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, {
      nome: 'Lia Reis',
      email: 'lia@example.com',
      telefone: '11944443333',
    })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      {
        ...deps(repo, gw),
        sendWelcome: makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo }),
      },
    )
    expect(res.status).toBe(200)
    expect(gw.calls.passwordTokens).toEqual(['lia@example.com'])
    expect(gw.calls.messages).toHaveLength(2)
    expect(gw.calls.messages.map((m) => m.input.channel)).toEqual(['email', 'whatsapp'])
    expect(gw.calls.messages[0]?.idempotencyKey).toBe(`welcome-${leads.get(id)?.id}`)
    expect(gw.calls.messages[1]?.idempotencyKey).toBe(`welcome-wa-${leads.get(id)?.id}`)
  })

  test('falha no welcome NÃO muda o 200 do webhook (best-effort) e a entrega é marcada', async () => {
    const { repo } = createFakeRepo()
    const gw = createFakeGateway()
    gw.setSendMessageStatus(502)
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Gil', email: 'gil@example.com', telefone: '11933332222' })
    await repo.setPayment(id, 'pay-1')

    const res = await handlePaymentWebhook(
      req(
        { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
        { token: TOKEN, deliveryId: 'd1' },
      ),
      {
        ...deps(repo, gw),
        sendWelcome: makeSendWelcome({ gateway: gw.gateway, communityUrl: COMMUNITY_URL, repo }),
      },
    )
    expect(res.status).toBe(200)
    expect(await repo.isWebhookProcessed('d1')).toBe(true)
  })

  test('entrega duplicada (mesmo x-delivery-id) não escreve de novo', async () => {
    const { repo, events } = createFakeRepo()
    const gw = createFakeGateway()
    const { id } = await repo.createLead()
    await repo.updateLead(id, { nome: 'Edu', email: 'edu@example.com', telefone: '11955554444' })
    await repo.setPayment(id, 'pay-1')
    const make = () =>
      handlePaymentWebhook(
        req(
          { id: 'd1', event: 'payment.paid', data: { paymentId: 'pay-1' } },
          { token: TOKEN, deliveryId: 'd1' },
        ),
        deps(repo, gw),
      )
    await make()
    const second = await make()
    expect(second.status).toBe(200)
    expect(((await second.json()) as { deduped?: boolean }).deduped).toBe(true)
    expect(events.filter((e) => e.eventName === 'pagamento_confirmado')).toHaveLength(1)
  })
})
