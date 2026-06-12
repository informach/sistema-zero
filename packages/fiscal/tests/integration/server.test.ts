import { describe, expect, test } from 'bun:test'
import { signHmac } from '@sistemazero/core/security'
import { HandlePaymentWebhookService } from '../../src/application/handle-payment-webhook/handle-payment-webhook.service'
import { createServer } from '../../src/interfaces/http/server'
import {
  FakeCatalogClient,
  FakePaymentsClient,
  InMemoryInvoiceRepository,
  InMemoryProcessedWebhookStore,
  paidSnapshot,
  silentLogger,
} from '../fakes/in-memory'

const SECRET = 's'.repeat(32)

function build(opts: { secret?: string; metricsToken?: string } = {}) {
  const invoices = new InMemoryInvoiceRepository()
  const payments = new FakePaymentsClient()
  const catalog = new FakeCatalogClient()
  const processedWebhooks = new InMemoryProcessedWebhookStore()
  const handleWebhook = new HandlePaymentWebhookService(
    invoices,
    payments,
    catalog,
    {
      ambiente: 'producao-restrita',
      serviceDescPrefix: 'Treinamento on-line',
      defaultGuaranteeDays: 7,
      emitBufferHours: 12,
      cancelWindowDays: 180,
    },
    silentLogger,
  )
  const app = createServer({
    logger: silentLogger,
    handleWebhook,
    processedWebhooks,
    invoices,
    payments,
    catalog,
    ambiente: 'producao-restrita',
    serviceDescPrefix: 'Treinamento on-line',
    webhookHmacSecret: opts.secret,
    webhookToleranceSeconds: 300,
    metricsToken: opts.metricsToken,
    readiness: async () => {},
  })
  return { app, invoices, payments, catalog, processedWebhooks }
}

/** Reproduz a entrega do payments: corpo {id,event,data} + x-signature t=,v1= (HMAC do corpo). */
function delivery(
  body: Record<string, unknown>,
  opts: { deliveryId?: string; secret?: string } = {},
) {
  const raw = JSON.stringify(body)
  const ts = Math.floor(Date.now() / 1000)
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'x-delivery-id': opts.deliveryId ?? 'del-1',
  }
  if (opts.secret) headers['x-signature'] = `t=${ts},v1=${signHmac(opts.secret, raw, ts)}`
  return new Request('http://localhost/webhooks/payments', { method: 'POST', headers, body: raw })
}

const PAID_BODY = { id: 'evt-1', event: 'payment.paid', data: { paymentId: 'pay-1' } }

describe('POST /webhooks/payments', () => {
  test('assinatura válida → 200 e nota agendada; marca dedupe', async () => {
    const { app, invoices, payments, catalog, processedWebhooks } = build({ secret: SECRET })
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'Curso', guaranteeDays: 7 })

    const res = await app.handle(delivery(PAID_BODY, { secret: SECRET }))
    expect(res.status).toBe(200)
    expect(await invoices.findActiveByPaymentId('pay-1')).not.toBeNull()
    expect(await processedWebhooks.isProcessed('del-1')).toBe(true)
  })

  test('sem/errada assinatura → 401 (com secret configurado)', async () => {
    const { app } = build({ secret: SECRET })
    const missing = await app.handle(delivery(PAID_BODY))
    expect(missing.status).toBe(401)
    const wrong = await app.handle(delivery(PAID_BODY, { secret: 'x'.repeat(32) }))
    expect(wrong.status).toBe(401)
  })

  test('mesma x-delivery-id duas vezes → segunda é dedupada (sem reprocessar)', async () => {
    const { app, invoices, payments, catalog } = build({ secret: SECRET })
    payments.set(paidSnapshot())
    catalog.set({ id: 'offer-1', name: 'O', productName: 'Curso', guaranteeDays: 7 })

    await app.handle(delivery(PAID_BODY, { secret: SECRET }))
    const res = await app.handle(delivery(PAID_BODY, { secret: SECRET }))
    expect(res.status).toBe(200)
    expect((await res.json()) as Record<string, unknown>).toMatchObject({ deduped: true })
    expect(invoices.invoices.size).toBe(1)
  })

  test('payments fora do ar → 502 e dedupe NÃO marcado (re-entrega reprocessa)', async () => {
    const { app, payments, processedWebhooks } = build({ secret: SECRET })
    payments.failWith = new Error('down')

    const res = await app.handle(delivery(PAID_BODY, { secret: SECRET }))
    expect(res.status).toBe(502)
    expect(await processedWebhooks.isProcessed('del-1')).toBe(false)
  })

  test('sem x-delivery-id → 400; corpo não-JSON → 400', async () => {
    const { app } = build()
    const noId = await app.handle(
      new Request('http://localhost/webhooks/payments', { method: 'POST', body: '{}' }),
    )
    expect(noId.status).toBe(400)
    const badJson = await app.handle(
      new Request('http://localhost/webhooks/payments', {
        method: 'POST',
        headers: { 'x-delivery-id': 'd-1' },
        body: 'not-json',
      }),
    )
    expect(badJson.status).toBe(400)
  })
})

describe('GET /fiscal/files/:token (capability-URL do DANFSe)', () => {
  test('token válido → PDF; token desconhecido/malformado → 404', async () => {
    const { app, invoices } = build()
    const invoice = await invoices.schedule({
      paymentId: 'pay-1',
      customer: { name: 'M', email: 'm@m.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso',
      offerId: null,
      guaranteeDays: null,
      paidAt: new Date(),
      scheduledFor: new Date(),
      ambiente: 'producao-restrita',
    })
    const token = 'a'.repeat(64)
    Object.assign(invoice, { pdfToken: token })
    await invoices.storePdf(invoice.id, new TextEncoder().encode('%PDF-ok'))

    const ok = await app.handle(new Request(`http://localhost/fiscal/files/${token}.pdf`))
    expect(ok.status).toBe(200)
    expect(ok.headers.get('content-type')).toBe('application/pdf')

    const unknown = await app.handle(
      new Request(`http://localhost/fiscal/files/${'b'.repeat(64)}.pdf`),
    )
    expect(unknown.status).toBe(404)
    const malformed = await app.handle(new Request('http://localhost/fiscal/files/curto.pdf'))
    expect(malformed.status).toBe(404)
  })
})

describe('GET /metrics', () => {
  const TOKEN = 'metrics-token-16chars'

  test('aberto sem token (dev); com token exige header válido e retorna byStatus', async () => {
    const open = build()
    expect((await open.app.handle(new Request('http://localhost/metrics'))).status).toBe(200)

    const { app, invoices } = build({ metricsToken: TOKEN })
    await invoices.schedule({
      paymentId: 'pay-1',
      customer: { name: 'M', email: 'm@m.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso',
      offerId: null,
      guaranteeDays: null,
      paidAt: new Date(),
      scheduledFor: new Date(),
      ambiente: 'producao-restrita',
    })

    expect((await app.handle(new Request('http://localhost/metrics'))).status).toBe(401)
    const ok = await app.handle(
      new Request('http://localhost/metrics', { headers: { 'x-metrics-token': TOKEN } }),
    )
    expect(ok.status).toBe(200)
    const body = (await ok.json()) as { byStatus: Record<string, number> }
    expect(body.byStatus['SCHEDULED']).toBe(1)
  })
})

describe('health', () => {
  test('healthz 200; readyz 503 quando o banco falha', async () => {
    const { app } = build()
    expect((await app.handle(new Request('http://localhost/healthz'))).status).toBe(200)

    const broken = createServer({
      logger: silentLogger,
      handleWebhook: null as never,
      processedWebhooks: new InMemoryProcessedWebhookStore(),
      invoices: new InMemoryInvoiceRepository(),
      payments: new FakePaymentsClient(),
      catalog: new FakeCatalogClient(),
      ambiente: 'producao-restrita',
      serviceDescPrefix: 'Treinamento on-line',
      webhookToleranceSeconds: 300,
      readiness: async () => {
        throw new Error('db down')
      },
    })
    expect((await broken.handle(new Request('http://localhost/readyz'))).status).toBe(503)
  })
})

describe('Rotas admin (/fiscal/admin/*)', () => {
  const ADMIN = {
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
    'x-auth-user-id': 'u-1',
    'x-internal-token': 'tok-interno-fiscal-16',
  }

  function buildAdmin() {
    const built = build()
    const app = createServer({
      logger: silentLogger,
      handleWebhook: null as never,
      processedWebhooks: new InMemoryProcessedWebhookStore(),
      invoices: built.invoices,
      payments: built.payments,
      catalog: built.catalog,
      ambiente: 'producao-restrita',
      serviceDescPrefix: 'Treinamento on-line',
      webhookToleranceSeconds: 300,
      requireAdminEnabled: true,
      internalToken: 'tok-interno-fiscal-16',
      readiness: async () => {},
    })
    return { app, invoices: built.invoices, payments: built.payments, catalog: built.catalog }
  }

  async function seedInvoice(invoices: InMemoryInvoiceRepository, status = 'EMITTED') {
    const invoice = await invoices.schedule({
      paymentId: crypto.randomUUID(),
      customer: { name: 'Maria', email: 'm@m.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso',
      offerId: null,
      guaranteeDays: 7,
      paidAt: new Date(),
      scheduledFor: new Date(),
      ambiente: 'producao-restrita',
    })
    Object.assign(invoice, { status, emittedAt: new Date(), accessKey: '7'.repeat(50) })
    return invoice
  }

  test('fail-closed: sem headers → 401; sem token interno → 401; role insuficiente → 403', async () => {
    const { app } = buildAdmin()
    expect((await app.handle(new Request('http://localhost/fiscal/admin/invoices'))).status).toBe(
      401,
    )
    expect(
      (
        await app.handle(
          new Request('http://localhost/fiscal/admin/invoices', {
            headers: { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' },
          }),
        )
      ).status,
    ).toBe(401)
    expect(
      (
        await app.handle(
          new Request('http://localhost/fiscal/admin/invoices', {
            headers: { ...ADMIN, 'x-auth-user-role': 'member' },
          }),
        )
      ).status,
    ).toBe(403)
  })

  test('list com filtro de status + detalhe com timeline', async () => {
    const { app, invoices } = buildAdmin()
    const emitted = await seedInvoice(invoices, 'EMITTED')
    await seedInvoice(invoices, 'FAILED')
    await invoices.appendEvent(emitted.id, 'EMITTED', 'system', { accessKey: emitted.accessKey })

    const list = await app.handle(
      new Request('http://localhost/fiscal/admin/invoices?status=EMITTED', { headers: ADMIN }),
    )
    expect(list.status).toBe(200)
    const page = (await list.json()) as { items: Array<{ id: string }>; total: number }
    expect(page.total).toBe(1)

    const detail = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${emitted.id}`, { headers: ADMIN }),
    )
    expect(detail.status).toBe(200)
    const body = (await detail.json()) as { invoice: { amountInCents: string }; events: unknown[] }
    expect(body.invoice.amountInCents).toBe('3700')
    expect(body.events.length).toBeGreaterThan(0)
  })

  test('retry: só FAILED (409 p/ EMITTED); cancel: só EMITTED com motivo', async () => {
    const { app, invoices } = buildAdmin()
    const emitted = await seedInvoice(invoices, 'EMITTED')
    const failed = await seedInvoice(invoices, 'FAILED')

    const retryWrong = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${emitted.id}/retry`, {
        method: 'POST',
        headers: ADMIN,
      }),
    )
    expect(retryWrong.status).toBe(409)

    const retryOk = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${failed.id}/retry`, {
        method: 'POST',
        headers: ADMIN,
      }),
    )
    expect(retryOk.status).toBe(200)
    expect((await invoices.findById(failed.id))?.status).toBe('SCHEDULED')

    const cancelNoReason = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${emitted.id}/cancel`, {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )
    expect(cancelNoReason.status).toBe(422)

    const cancelOk = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${emitted.id}/cancel`, {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Erro nos dados da nota' }),
      }),
    )
    expect(cancelOk.status).toBe(200)
    const after = await invoices.findById(emitted.id)
    expect(after?.status).toBe('CANCEL_PENDING')
    expect(after?.cancelRequestedBy).toBe('admin:u-1')
  })

  test('substitute: cria SCHEDULED(now) vinculada; exige ≥1 campo e CPF válido', async () => {
    const { app, invoices } = buildAdmin()
    const original = await seedInvoice(invoices, 'EMITTED')

    const nothing = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${original.id}/substitute`, {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }),
    )
    expect(nothing.status).toBe(400)

    const badCpf = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${original.id}/substitute`, {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ customerDocument: '123' }),
      }),
    )
    expect(badCpf.status).toBe(400)

    const ok = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${original.id}/substitute`, {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ customerName: 'Maria Corrigida' }),
      }),
    )
    expect(ok.status).toBe(201)
    const { id } = (await ok.json()) as { id: string }
    const substitute = await invoices.findById(id)
    expect(substitute?.status).toBe('SCHEDULED')
    expect(substitute?.substitutesId).toBe(original.id)
    expect(substitute?.customer.name).toBe('Maria Corrigida')
    expect(substitute?.customer.document).toBe('52998224725') // herdado
  })

  test('stats agrupa por status', async () => {
    const { app, invoices } = buildAdmin()
    await seedInvoice(invoices, 'EMITTED')
    await seedInvoice(invoices, 'FAILED')
    const res = await app.handle(
      new Request('http://localhost/fiscal/admin/stats', { headers: ADMIN }),
    )
    const body = (await res.json()) as { byStatus: Record<string, number> }
    expect(body.byStatus['EMITTED']).toBe(1)
    expect(body.byStatus['FAILED']).toBe(1)
  })
})

describe('Emissão manual', () => {
  const ADMIN = {
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
    'x-auth-user-id': 'u-1',
    'x-internal-token': 'tok-interno-fiscal-16',
  }

  function buildManual() {
    const built = build()
    const app = createServer({
      logger: silentLogger,
      handleWebhook: null as never,
      processedWebhooks: new InMemoryProcessedWebhookStore(),
      invoices: built.invoices,
      payments: built.payments,
      catalog: built.catalog,
      ambiente: 'producao-restrita',
      serviceDescPrefix: 'Treinamento on-line',
      webhookToleranceSeconds: 300,
      requireAdminEnabled: true,
      internalToken: 'tok-interno-fiscal-16',
      readiness: async () => {},
    })
    return { ...built, app }
  }

  test('emit-now: SCHEDULED ganha scheduledFor=AGORA; outros estados → 409', async () => {
    const { app, invoices } = buildManual()
    const future = new Date(Date.now() + 30 * 24 * 3600_000)
    const invoice = await invoices.schedule({
      paymentId: crypto.randomUUID(),
      customer: { name: 'M', email: 'm@m.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso',
      offerId: null,
      guaranteeDays: 30,
      paidAt: new Date(),
      scheduledFor: future,
      ambiente: 'producao-restrita',
    })

    const ok = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${invoice.id}/emit-now`, {
        method: 'POST',
        headers: ADMIN,
      }),
    )
    expect(ok.status).toBe(200)
    const after = await invoices.findById(invoice.id)
    expect(after?.scheduledFor.getTime()).toBeLessThan(future.getTime())
    expect(after?.scheduledFor.getTime()).toBeLessThanOrEqual(Date.now())

    Object.assign(after!, { status: 'EMITTED' })
    const wrong = await app.handle(
      new Request(`http://localhost/fiscal/admin/invoices/${invoice.id}/emit-now`, {
        method: 'POST',
        headers: ADMIN,
      }),
    )
    expect(wrong.status).toBe(409)
  })

  test('manual por paymentId: agenda p/ AGORA com snapshot do payments + descrição do catalog', async () => {
    const { app, invoices, payments, catalog } = buildManual()
    const paymentId = crypto.randomUUID()
    payments.set(paidSnapshot({ id: paymentId }))
    catalog.set({
      id: 'offer-1',
      name: 'Oferta',
      productName: 'No Comando da IA',
      guaranteeDays: 30,
    })

    const res = await app.handle(
      new Request('http://localhost/fiscal/admin/invoices', {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ paymentId }),
      }),
    )
    expect(res.status).toBe(201)
    const { id } = (await res.json()) as { id: string }
    const invoice = await invoices.findById(id)
    expect(invoice?.status).toBe('SCHEDULED')
    expect(invoice?.serviceDescription).toBe('Treinamento on-line - No Comando da IA')
    // Manual = emite AGORA (não espera a garantia).
    expect(invoice?.scheduledFor.getTime()).toBeLessThanOrEqual(Date.now())
    expect(invoices.events.some((e) => e.type === 'SCHEDULED' && e.actor === 'admin:u-1')).toBe(
      true,
    )
  })

  test('manual: pagamento não-PAID → 409; inexistente → 404; nota ativa já existe → 409', async () => {
    const { app, invoices, payments } = buildManual()
    const refundedId = crypto.randomUUID()
    payments.set(paidSnapshot({ id: refundedId, status: 'REFUNDED' }))
    const notPaid = await app.handle(
      new Request('http://localhost/fiscal/admin/invoices', {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ paymentId: refundedId }),
      }),
    )
    expect(notPaid.status).toBe(409)

    const missing = await app.handle(
      new Request('http://localhost/fiscal/admin/invoices', {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ paymentId: crypto.randomUUID() }),
      }),
    )
    expect(missing.status).toBe(404)

    const dupId = crypto.randomUUID()
    payments.set(paidSnapshot({ id: dupId }))
    await invoices.schedule({
      paymentId: dupId,
      customer: { name: 'M', email: 'm@m.com', document: '52998224725' },
      amountInCents: 3700n,
      serviceDescription: 'Curso',
      offerId: null,
      guaranteeDays: null,
      paidAt: new Date(),
      scheduledFor: new Date(),
      ambiente: 'producao-restrita',
    })
    const dup = await app.handle(
      new Request('http://localhost/fiscal/admin/invoices', {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ paymentId: dupId }),
      }),
    )
    expect(dup.status).toBe(409)
    expect(((await dup.json()) as { error: { code: string } }).error.code).toBe(
      'INVOICE_ALREADY_EXISTS',
    )
  })

  test('manual: payments fora do ar → 502; CPF inválido no pagamento → 422', async () => {
    const { app, payments } = buildManual()
    payments.failWith = new Error('down')
    const down = await app.handle(
      new Request('http://localhost/fiscal/admin/invoices', {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ paymentId: crypto.randomUUID() }),
      }),
    )
    expect(down.status).toBe(502)

    payments.failWith = null
    const badCpfId = crypto.randomUUID()
    payments.set(
      paidSnapshot({ id: badCpfId, customer: { name: 'X', email: 'x@x.com', document: 'abc' } }),
    )
    const badCpf = await app.handle(
      new Request('http://localhost/fiscal/admin/invoices', {
        method: 'POST',
        headers: { ...ADMIN, 'content-type': 'application/json' },
        body: JSON.stringify({ paymentId: badCpfId }),
      }),
    )
    expect(badCpf.status).toBe(422)
  })
})
