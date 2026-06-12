import { envelope } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { Elysia, t } from 'elysia'
import { toInvoiceEventView, toInvoiceView } from '../../application/mappers/invoice-view'
import { composeServiceDescription } from '../../domain/dps/emitter-profile'
import { InvoiceStatus } from '../../domain/invoice/invoice.status'
import type { CatalogClient, PaymentsClient } from '../../domain/ports/clients.port'
import type { InvoiceRepository } from '../../domain/ports/invoice-repository.port'
import { assertInternalCaller, requireAdmin } from './auth'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CPF_RE = /^\d{11}$/
const STATUSES = new Set<string>(Object.values(InvoiceStatus))

export interface AdminRoutesDeps {
  invoices: InvoiceRepository
  payments: PaymentsClient
  catalog: CatalogClient
  ambiente: string
  /** Prefixo da discriminação ("Treinamento on-line - <produto>"). */
  serviceDescPrefix: string
  requireAdminEnabled: boolean
  internalToken?: string
  logger: Logger
}

/**
 * Rotas admin (`/fiscal/admin/*`) — o RBAC real é do gateway (JWT + roles);
 * aqui `requireAdmin` (X-Auth-User-*) + `x-internal-token` (prova de origem),
 * espelhando payments/catalog/members.
 */
export function adminRoutes(deps: AdminRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>) => {
    assertInternalCaller(headers['x-internal-token'], deps.internalToken)
    requireAdmin(headers, deps.requireAdminEnabled)
  }

  return new Elysia({ prefix: '/fiscal/admin' })
    .get(
      '/invoices',
      async ({ query, headers, set }) => {
        guard(headers)
        const status =
          query.status && STATUSES.has(query.status) ? (query.status as InvoiceStatus) : undefined
        if (query.status && !status) {
          set.status = 400
          return envelope('INVALID_STATUS', 'Status desconhecido')
        }
        const { items, total } = await deps.invoices.list({
          status,
          q: query.q,
          limit: Math.min(query.limit ?? 25, 100),
          offset: query.offset ?? 0,
        })
        return { items: items.map(toInvoiceView), total }
      },
      {
        query: t.Object({
          status: t.Optional(t.String({ maxLength: 20 })),
          q: t.Optional(t.String({ maxLength: 200 })),
          limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
          offset: t.Optional(t.Numeric({ minimum: 0 })),
        }),
      },
    )
    .get(
      '/invoices/:id',
      async ({ params, headers, set }) => {
        guard(headers)
        const invoice = await deps.invoices.findById(params.id)
        if (!invoice) {
          set.status = 404
          return envelope('INVOICE_NOT_FOUND', 'Nota não encontrada')
        }
        const events = await deps.invoices.listEvents(params.id)
        return { invoice: toInvoiceView(invoice), events: events.map(toInvoiceEventView) }
      },
      { params: t.Object({ id: t.String({ pattern: UUID_RE.source }) }) },
    )
    .get(
      '/invoices/:id/pdf',
      async ({ params, headers, set }) => {
        guard(headers)
        const invoice = await deps.invoices.findById(params.id)
        if (!invoice?.pdfToken) {
          set.status = 404
          return envelope('PDF_NOT_FOUND', 'PDF indisponível para esta nota')
        }
        const pdf = await deps.invoices.findPdfByToken(invoice.pdfToken)
        if (!pdf) {
          set.status = 404
          return envelope('PDF_NOT_FOUND', 'PDF indisponível para esta nota')
        }
        return new Response(Buffer.from(pdf.content), {
          headers: {
            'content-type': pdf.contentType,
            'content-disposition': `attachment; filename="nfse-${invoice.accessKey ?? invoice.id}.pdf"`,
          },
        })
      },
      { params: t.Object({ id: t.String({ pattern: UUID_RE.source }) }) },
    )
    .post(
      '/invoices/:id/retry',
      async ({ params, headers, set }) => {
        guard(headers)
        const invoice = await deps.invoices.findById(params.id)
        if (!invoice) {
          set.status = 404
          return envelope('INVOICE_NOT_FOUND', 'Nota não encontrada')
        }
        if (invoice.status !== 'FAILED') {
          set.status = 409
          return envelope('INVALID_STATE', 'Só notas FAILED podem ser reprocessadas')
        }
        await deps.invoices.retry(params.id, new Date())
        await deps.invoices.appendEvent(params.id, 'RETRIED_BY_ADMIN', adminActor(headers), {})
        deps.logger.info('fiscal.admin_retry', { invoiceId: params.id })
        return { ok: true }
      },
      { params: t.Object({ id: t.String({ pattern: UUID_RE.source }) }) },
    )
    .post(
      '/invoices/:id/cancel',
      async ({ params, body, headers, set }) => {
        guard(headers)
        const invoice = await deps.invoices.findById(params.id)
        if (!invoice) {
          set.status = 404
          return envelope('INVOICE_NOT_FOUND', 'Nota não encontrada')
        }
        if (invoice.status !== 'EMITTED') {
          set.status = 409
          return envelope('INVALID_STATE', 'Só notas EMITTED podem ser canceladas')
        }
        const actor = adminActor(headers)
        await deps.invoices.requestCancel(params.id, actor, body.reason)
        await deps.invoices.appendEvent(params.id, 'CANCEL_REQUESTED', actor, {
          reason: body.reason,
        })
        deps.logger.info('fiscal.admin_cancel_requested', { invoiceId: params.id })
        return { ok: true }
      },
      {
        params: t.Object({ id: t.String({ pattern: UUID_RE.source }) }),
        body: t.Object({ reason: t.String({ minLength: 3, maxLength: 500 }) }),
      },
    )
    .post(
      '/invoices/:id/substitute',
      async ({ params, body, headers, set }) => {
        guard(headers)
        const original = await deps.invoices.findById(params.id)
        if (!original) {
          set.status = 404
          return envelope('INVOICE_NOT_FOUND', 'Nota não encontrada')
        }
        if (original.status !== 'EMITTED' || !original.accessKey) {
          set.status = 409
          return envelope('INVALID_STATE', 'Só notas EMITTED podem ser substituídas')
        }
        if (!body.customerName && !body.customerDocument && !body.serviceDescription) {
          set.status = 400
          return envelope('NOTHING_TO_FIX', 'Informe ao menos um campo a corrigir')
        }
        if (body.customerDocument && !CPF_RE.test(body.customerDocument)) {
          set.status = 400
          return envelope('INVALID_DOCUMENT', 'CPF deve ter 11 dígitos (só números)')
        }

        const actor = adminActor(headers)
        // Substituta agendada p/ AGORA: o worker emite a DPS nova com o grupo
        // subst apontando a chave da original (o sistema nacional cancela a
        // original por substituição; quando emitir, original → SUBSTITUTED).
        const substitute = await deps.invoices.schedule({
          paymentId: original.paymentId,
          customer: {
            name: body.customerName ?? original.customer.name,
            email: original.customer.email,
            document: body.customerDocument ?? original.customer.document,
          },
          amountInCents: original.amountInCents,
          serviceDescription: body.serviceDescription ?? original.serviceDescription,
          offerId: original.offerId,
          guaranteeDays: original.guaranteeDays,
          paidAt: original.paidAt,
          scheduledFor: new Date(),
          ambiente: original.ambiente,
          substitutesId: original.id,
        })
        await deps.invoices.appendEvent(substitute.id, 'SUBSTITUTION_CREATED', actor, {
          substitutes: original.id,
        })
        await deps.invoices.appendEvent(original.id, 'SUBSTITUTION_REQUESTED', actor, {
          substituteId: substitute.id,
        })
        deps.logger.info('fiscal.admin_substitute_created', {
          originalId: original.id,
          substituteId: substitute.id,
        })
        set.status = 201
        return { id: substitute.id }
      },
      {
        params: t.Object({ id: t.String({ pattern: UUID_RE.source }) }),
        body: t.Object({
          customerName: t.Optional(t.String({ minLength: 2, maxLength: 200 })),
          customerDocument: t.Optional(t.String({ maxLength: 14 })),
          serviceDescription: t.Optional(t.String({ minLength: 3, maxLength: 1900 })),
        }),
      },
    )
    .post(
      '/invoices/:id/emit-now',
      async ({ params, headers, set }) => {
        guard(headers)
        const invoice = await deps.invoices.findById(params.id)
        if (!invoice) {
          set.status = 404
          return envelope('INVOICE_NOT_FOUND', 'Nota não encontrada')
        }
        if (invoice.status !== 'SCHEDULED') {
          set.status = 409
          return envelope('INVALID_STATE', 'Só notas SCHEDULED podem ser antecipadas')
        }
        await deps.invoices.expedite(params.id)
        await deps.invoices.appendEvent(params.id, 'EMIT_NOW_REQUESTED', adminActor(headers), {})
        deps.logger.info('fiscal.admin_emit_now', { invoiceId: params.id })
        // O worker emite no próximo ciclo (≤30s); a re-verificação de pagamento
        // continua valendo — antecipar NÃO pula a checagem de estorno.
        return { ok: true }
      },
      { params: t.Object({ id: t.String({ pattern: UUID_RE.source }) }) },
    )
    .post(
      '/invoices',
      async ({ body, headers, set }) => {
        guard(headers)
        // Emissão MANUAL por pagamento (decisão explícita do admin: emite AGORA,
        // sem esperar a garantia — útil p/ backfill de vendas antigas).
        let snapshot: Awaited<ReturnType<PaymentsClient['getPayment']>>
        try {
          snapshot = await deps.payments.getPayment(body.paymentId)
        } catch {
          set.status = 502
          return envelope('PAYMENTS_UNAVAILABLE', 'Payments indisponível — tente de novo')
        }
        if (!snapshot) {
          set.status = 404
          return envelope('PAYMENT_NOT_FOUND', 'Pagamento não encontrado')
        }
        if (snapshot.status !== 'PAID' || !snapshot.paidAt || snapshot.refundedAt) {
          set.status = 409
          return envelope(
            'PAYMENT_NOT_PAID',
            `Pagamento está ${snapshot.status} — só PAID emite nota`,
          )
        }
        const document = snapshot.customer?.document ?? ''
        if (!CPF_RE.test(document)) {
          set.status = 422
          return envelope('INVALID_DOCUMENT', 'Pagamento sem CPF válido do comprador')
        }
        const existing = await deps.invoices.findActiveByPaymentId(body.paymentId)
        if (existing) {
          set.status = 409
          return envelope(
            'INVOICE_ALREADY_EXISTS',
            `Já existe nota ativa para este pagamento (${existing.id})`,
          )
        }

        const offerId =
          typeof snapshot.metadata['offerId'] === 'string' ? snapshot.metadata['offerId'] : null
        let productName: string | null = null
        let guaranteeDays: number | null = null
        if (offerId) {
          try {
            const offer = await deps.catalog.getOfferById(offerId)
            if (offer) {
              productName = offer.productName ?? offer.name
              guaranteeDays = offer.guaranteeDays
            }
          } catch {
            // Manual: o admin está mandando emitir — a descrição genérica serve
            // (≠ do fluxo automático, que falha fechado p/ não emitir CEDO).
          }
        }
        const serviceDescription = composeServiceDescription(deps.serviceDescPrefix, productName)

        const actor = adminActor(headers)
        const invoice = await deps.invoices.schedule({
          paymentId: body.paymentId,
          customer: {
            name: snapshot.customer?.name ?? '',
            email: snapshot.customer?.email ?? '',
            document,
          },
          amountInCents: snapshot.amountInCents,
          serviceDescription,
          offerId,
          guaranteeDays,
          paidAt: snapshot.paidAt,
          scheduledFor: new Date(),
          ambiente: deps.ambiente,
        })
        await deps.invoices.appendEvent(invoice.id, 'SCHEDULED', actor, {
          manual: true,
          paymentId: body.paymentId,
        })
        deps.logger.info('fiscal.admin_manual_emission', {
          invoiceId: invoice.id,
          paymentId: body.paymentId,
        })
        set.status = 201
        return { id: invoice.id }
      },
      { body: t.Object({ paymentId: t.String({ pattern: UUID_RE.source }) }) },
    )
    .get('/stats', async ({ headers }) => {
      guard(headers)
      return { byStatus: await deps.invoices.countByStatus() }
    })
}

function adminActor(headers: Record<string, string | undefined>): string {
  return `admin:${headers['x-auth-user-id'] ?? headers['x-auth-user-email'] ?? 'desconhecido'}`
}
