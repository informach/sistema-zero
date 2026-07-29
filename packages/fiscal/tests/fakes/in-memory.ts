import type { Logger } from '@sistemazero/core/logging'
import type { InvoiceStatus, SkipReason } from '../../src/domain/invoice/invoice.status'
import type {
  CatalogClient,
  OfferSnapshot,
  PaymentSnapshot,
  PaymentsClient,
} from '../../src/domain/ports/clients.port'
import type {
  Invoice,
  InvoiceRepository,
  ScheduleInvoiceInput,
} from '../../src/domain/ports/invoice-repository.port'
import type { ProcessedWebhookStore } from '../../src/domain/ports/processed-webhook.port'
import type {
  DanfseClient,
  EmitDpsInput,
  EmitResult,
  SefinNacionalGateway,
} from '../../src/domain/ports/sefin-gateway.port'

export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
}

const ACTIVE: InvoiceStatus[] = ['SCHEDULED', 'EMITTED', 'CANCEL_PENDING', 'CANCEL_FAILED']

/** Fake fiel ao adapter real: unique de payment ativa, claim com lease, reuso de número. */
export class InMemoryInvoiceRepository implements InvoiceRepository {
  invoices = new Map<string, Invoice>()
  events: Array<{
    invoiceId: string
    type: string
    actor: string | null
    detail: Record<string, unknown>
  }> = []
  pdfs = new Map<string, { content: Uint8Array; contentType: string }>()
  /** Spy de teste: ids cujo lease foi renovado (touchClaim). */
  touched: string[] = []
  private counter = new Map<string, bigint>()

  async findById(id: string): Promise<Invoice | null> {
    return this.invoices.get(id) ?? null
  }

  async findActiveByPaymentId(paymentId: string): Promise<Invoice | null> {
    for (const inv of this.invoices.values()) {
      if (inv.paymentId === paymentId && ACTIVE.includes(inv.status) && !inv.substitutesId)
        return inv
    }
    return null
  }

  async findActiveManyByPaymentId(paymentId: string): Promise<Invoice[]> {
    return [...this.invoices.values()].filter(
      (inv) => inv.paymentId === paymentId && ACTIVE.includes(inv.status),
    )
  }

  async findActiveSubstituteFor(originalId: string): Promise<Invoice | null> {
    for (const inv of this.invoices.values()) {
      if (inv.substitutesId === originalId && ACTIVE.includes(inv.status)) return inv
    }
    return null
  }

  async findAnyByPaymentId(paymentId: string): Promise<Invoice | null> {
    const matches = [...this.invoices.values()]
      .filter((inv) => inv.paymentId === paymentId && !inv.substitutesId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return matches[0] ?? null
  }

  async list(query: { status?: Invoice['status']; q?: string; limit: number; offset: number }) {
    let all = [...this.invoices.values()]
    if (query.status) all = all.filter((i) => i.status === query.status)
    if (query.q) {
      const q = query.q.toLowerCase()
      all = all.filter(
        (i) =>
          i.customer.name.toLowerCase().includes(q) ||
          i.customer.email.toLowerCase().includes(q) ||
          i.customer.document.includes(q) ||
          i.paymentId.includes(q) ||
          (i.accessKey ?? '').includes(q),
      )
    }
    return { items: all.slice(query.offset, query.offset + query.limit), total: all.length }
  }

  async countByStatus(): Promise<Record<string, number>> {
    const out: Record<string, number> = {}
    for (const inv of this.invoices.values()) out[inv.status] = (out[inv.status] ?? 0) + 1
    return out
  }

  async listEvents(invoiceId: string) {
    return this.events
      .filter((e) => e.invoiceId === invoiceId)
      .map((e, i) => ({
        id: `evt-${i}`,
        type: e.type,
        actor: e.actor,
        detail: e.detail,
        createdAt: new Date(),
      }))
  }

  async schedule(input: ScheduleInvoiceInput): Promise<Invoice> {
    // Substituta colide na unique de substituta ativa (1 por original); nota normal
    // na unique de payment ativa. Idempotência da re-entrega/corrida em ambos.
    const existing = input.substitutesId
      ? await this.findActiveSubstituteFor(input.substitutesId)
      : await this.findActiveByPaymentId(input.paymentId)
    if (existing) return existing
    const invoice: Invoice = {
      id: crypto.randomUUID(),
      version: 0,
      paymentId: input.paymentId,
      status: 'SCHEDULED',
      customer: input.customer,
      amountInCents: input.amountInCents,
      serviceDescription: input.serviceDescription,
      offerId: input.offerId,
      guaranteeDays: input.guaranteeDays,
      paidAt: input.paidAt,
      scheduledFor: input.scheduledFor,
      attempts: 0,
      claimedAt: null,
      claimToken: null,
      nextAttemptAt: null,
      lastError: null,
      skipReason: null,
      dpsSeries: null,
      dpsNumber: null,
      dpsId: null,
      dpsXml: null,
      nfseXml: null,
      accessKey: null,
      competenceDate: null,
      ambiente: input.ambiente,
      emittedAt: null,
      cancelReason: null,
      cancelRequestedBy: null,
      cancelEventXml: null,
      cancelledAt: null,
      substitutesId: input.substitutesId ?? null,
      substitutedById: null,
      pdfStoredAt: null,
      pdfToken: null,
      emailSentAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Invoice
    this.invoices.set(invoice.id, invoice)
    return invoice
  }

  async scheduleIfAbsent(input: ScheduleInvoiceInput): Promise<Invoice | null> {
    const existing = input.substitutesId
      ? await this.findActiveSubstituteFor(input.substitutesId)
      : await this.findActiveByPaymentId(input.paymentId)
    if (existing) return null
    return this.schedule(input)
  }

  async skip(
    id: string,
    reason: SkipReason,
    detail?: string,
    claimToken?: string,
  ): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'SCHEDULED' && (!claimToken || inv.claimToken === claimToken)) {
      inv.status = 'SKIPPED'
      inv.skipReason = detail ? `${reason}: ${detail}` : reason
      inv.version += 1
      return true
    }
    return false
  }

  async claimDueForEmission(opts: {
    batchSize: number
    staleMs: number
    maxAttempts: number
  }): Promise<Invoice[]> {
    const now = Date.now()
    // Espelha o adapter real: ORDER BY scheduled_for ANTES do LIMIT batchSize.
    const due = [...this.invoices.values()]
      .filter(
        (inv) =>
          inv.status === 'SCHEDULED' &&
          inv.scheduledFor.getTime() <= now &&
          (!inv.nextAttemptAt || inv.nextAttemptAt.getTime() <= now) &&
          (!inv.claimedAt || now - inv.claimedAt.getTime() >= opts.staleMs) &&
          inv.attempts <= opts.maxAttempts,
      )
      .sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime())
      .slice(0, opts.batchSize)
    for (const inv of due) {
      inv.claimedAt = new Date(now)
      inv.claimToken = crypto.randomUUID()
      inv.attempts += 1
    }
    return due
  }

  async failExhausted(opts: { maxAttempts: number; staleMs: number }): Promise<number> {
    const now = Date.now()
    let count = 0
    for (const inv of this.invoices.values()) {
      if (
        inv.status === 'SCHEDULED' &&
        inv.scheduledFor.getTime() <= now &&
        inv.attempts > opts.maxAttempts &&
        (!inv.claimedAt || now - inv.claimedAt.getTime() >= opts.staleMs)
      ) {
        inv.status = 'FAILED'
        inv.lastError =
          'tentativas esgotadas: presa em SCHEDULED após crash (attempts > maxAttempts)'
        inv.claimedAt = null
        inv.version += 1
        count += 1
      }
    }
    return count
  }

  async allocateDpsNumber(
    id: string,
    series: string,
    buildDpsId: (n: bigint) => string,
    claimToken: string,
  ): Promise<{ dpsNumber: bigint; dpsId: string } | null> {
    const inv = this.invoices.get(id)
    if (inv?.status !== 'SCHEDULED' || inv.claimToken !== claimToken) return null
    if (inv.dpsNumber != null && inv.dpsId) return { dpsNumber: inv.dpsNumber, dpsId: inv.dpsId }
    const next = (this.counter.get(series) ?? 0n) + 1n
    this.counter.set(series, next)
    inv.dpsSeries = series
    inv.dpsNumber = next
    inv.dpsId = buildDpsId(next)
    return { dpsNumber: next, dpsId: inv.dpsId }
  }

  async markEmitted(
    id: string,
    data: {
      dpsXml: string
      nfseXml: string
      accessKey: string
      competenceDate: string
      pdfToken: string
    },
    claimToken: string,
  ): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'SCHEDULED' && inv.claimToken === claimToken) {
      Object.assign(inv, {
        status: 'EMITTED',
        ...data,
        emittedAt: new Date(),
        lastError: null,
        nextAttemptAt: null,
        version: inv.version + 1,
      })
      return true
    }
    return false
  }

  async forceCancelAfterRacedEmission(
    id: string,
    data: {
      dpsXml: string
      nfseXml: string
      accessKey: string
      competenceDate: string
      pdfToken: string
    },
    cancelReason: string,
  ): Promise<void> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'SKIPPED') {
      Object.assign(inv, {
        status: 'CANCEL_PENDING',
        ...data,
        emittedAt: new Date(),
        cancelRequestedBy: 'system:refund',
        cancelReason,
        skipReason: null,
        claimedAt: null,
        lastError: null,
        nextAttemptAt: null,
        version: inv.version + 1,
      })
    }
  }

  async touchClaim(id: string, claimToken: string): Promise<boolean> {
    this.touched.push(id)
    const inv = this.invoices.get(id)
    if (
      inv &&
      inv.claimToken === claimToken &&
      ['SCHEDULED', 'CANCEL_PENDING', 'EMITTED'].includes(inv.status)
    ) {
      inv.claimedAt = new Date()
      return true
    }
    return false
  }

  async releaseForRetry(
    id: string,
    nextAttemptAt: Date,
    lastError: string,
    claimToken: string,
  ): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'SCHEDULED' && inv.claimToken === claimToken) {
      Object.assign(inv, { claimedAt: null, claimToken: null, nextAttemptAt, lastError })
      return true
    }
    return false
  }

  async markFailed(id: string, lastError: string, claimToken?: string): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'SCHEDULED' && (!claimToken || inv.claimToken === claimToken)) {
      Object.assign(inv, {
        status: 'FAILED',
        lastError,
        claimedAt: null,
        claimToken: null,
        version: inv.version + 1,
      })
      return true
    }
    return false
  }

  async requestCancel(id: string, by: string, reason: string): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv && ['EMITTED', 'CANCEL_FAILED'].includes(inv.status)) {
      Object.assign(inv, {
        status: 'CANCEL_PENDING',
        cancelRequestedBy: by,
        cancelReason: reason,
        lastError: null,
        nextAttemptAt: null,
        version: inv.version + 1,
      })
      return true
    }
    return false
  }

  async claimCancelPending(opts: { batchSize: number; staleMs: number }): Promise<Invoice[]> {
    const now = Date.now()
    const out: Invoice[] = []
    for (const inv of this.invoices.values()) {
      if (out.length >= opts.batchSize) break
      if (
        inv.status === 'CANCEL_PENDING' &&
        (!inv.claimedAt || now - inv.claimedAt.getTime() >= opts.staleMs)
      ) {
        inv.claimedAt = new Date(now)
        inv.claimToken = crypto.randomUUID()
        out.push(inv)
      }
    }
    return out
  }

  async markCancelled(id: string, cancelEventXml: string, claimToken: string): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'CANCEL_PENDING' && inv.claimToken === claimToken) {
      Object.assign(inv, {
        status: 'CANCELLED',
        cancelEventXml,
        cancelledAt: new Date(),
        claimedAt: null,
        version: inv.version + 1,
      })
      return true
    }
    return false
  }

  async markCancelFailed(id: string, lastError: string, claimToken: string): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'CANCEL_PENDING' && inv.claimToken === claimToken) {
      Object.assign(inv, {
        status: 'CANCEL_FAILED',
        lastError,
        claimedAt: null,
        nextAttemptAt: null,
        version: inv.version + 1,
      })
      return true
    }
    return false
  }

  async retry(id: string, scheduledFor: Date): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'FAILED') {
      Object.assign(inv, {
        status: 'SCHEDULED',
        scheduledFor,
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        claimedAt: null,
        version: inv.version + 1,
      })
      return true
    }
    return false
  }

  async expedite(id: string): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'SCHEDULED') {
      Object.assign(inv, { scheduledFor: new Date(), nextAttemptAt: null })
      return true
    }
    return false
  }

  async markEmittedAsSubstitute(
    substituteId: string,
    data: {
      dpsXml: string
      nfseXml: string
      accessKey: string
      competenceDate: string
      pdfToken: string
    },
    originalId: string,
    claimToken: string,
  ): Promise<{
    recorded: boolean
    originalSubstituted: boolean
    substituteCancelPending: boolean
  }> {
    const sub = this.invoices.get(substituteId)
    if (sub?.status !== 'SCHEDULED' || sub.claimToken !== claimToken) {
      return { recorded: false, originalSubstituted: false, substituteCancelPending: false }
    }
    Object.assign(sub, {
      status: 'EMITTED',
      ...data,
      emittedAt: new Date(),
      lastError: null,
      nextAttemptAt: null,
      version: sub.version + 1,
    })
    const orig = this.invoices.get(originalId)
    if (orig?.status === 'EMITTED') {
      Object.assign(orig, {
        status: 'SUBSTITUTED',
        substitutedById: substituteId,
        version: orig.version + 1,
      })
      return { recorded: true, originalSubstituted: true, substituteCancelPending: false }
    }
    if (
      orig?.cancelRequestedBy === 'system:refund' &&
      (orig.status === 'CANCEL_PENDING' ||
        orig.status === 'CANCEL_FAILED' ||
        orig.status === 'CANCELLED')
    ) {
      Object.assign(sub, {
        status: 'CANCEL_PENDING',
        cancelRequestedBy: 'system:refund',
        cancelReason: 'Pagamento reembolsado durante a substituição',
        claimedAt: null,
        lastError: null,
        nextAttemptAt: null,
        version: sub.version + 1,
      })
      return { recorded: true, originalSubstituted: false, substituteCancelPending: true }
    }
    return { recorded: true, originalSubstituted: false, substituteCancelPending: false }
  }

  async appendEvent(
    invoiceId: string,
    type: string,
    actor: string | null,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    this.events.push({ invoiceId, type, actor, detail })
  }

  async storePdf(
    invoiceId: string,
    content: Uint8Array,
    claimToken: string,
    contentType = 'application/pdf',
  ): Promise<boolean> {
    const inv = this.invoices.get(invoiceId)
    if (inv?.status !== 'EMITTED' || inv.claimToken !== claimToken) return false
    this.pdfs.set(invoiceId, { content, contentType })
    inv.pdfStoredAt = new Date()
    return true
  }

  async findPdfByToken(token: string) {
    for (const inv of this.invoices.values()) {
      if (inv.pdfToken === token) {
        const pdf = this.pdfs.get(inv.id)
        if (pdf) return { invoiceId: inv.id, ...pdf }
      }
    }
    return null
  }

  async markEmailSent(id: string, claimToken: string): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status !== 'EMITTED' || inv.claimToken !== claimToken) return false
    inv.emailSentAt = new Date()
    return true
  }

  async claimEmittedNeedingDelivery(opts: {
    batchSize: number
    staleMs: number
    includeEmail: boolean
  }): Promise<Invoice[]> {
    const now = Date.now()
    const due = [...this.invoices.values()]
      .filter(
        (inv) =>
          inv.status === 'EMITTED' &&
          Boolean(inv.accessKey && inv.pdfToken) &&
          (!inv.pdfStoredAt || (opts.includeEmail && !inv.emailSentAt && inv.customer.email)) &&
          (!inv.nextAttemptAt || inv.nextAttemptAt.getTime() <= now) &&
          (!inv.claimedAt || now - inv.claimedAt.getTime() >= opts.staleMs),
      )
      .sort((a, b) => (a.emittedAt?.getTime() ?? 0) - (b.emittedAt?.getTime() ?? 0))
      .slice(0, opts.batchSize)
    for (const inv of due) {
      inv.claimedAt = new Date(now)
      inv.claimToken = crypto.randomUUID()
    }
    return due
  }

  async releaseDeliveryRetry(
    id: string,
    nextAttemptAt: Date,
    lastError: string,
    claimToken: string,
  ): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'EMITTED' && inv.claimToken === claimToken) {
      Object.assign(inv, { claimedAt: null, claimToken: null, nextAttemptAt, lastError })
      return true
    }
    return false
  }

  async markDeliveryComplete(id: string, claimToken: string): Promise<boolean> {
    const inv = this.invoices.get(id)
    if (inv?.status === 'EMITTED' && inv.claimToken === claimToken) {
      Object.assign(inv, {
        claimedAt: null,
        claimToken: null,
        nextAttemptAt: null,
        lastError: null,
      })
      return true
    }
    return false
  }
}

export class InMemoryProcessedWebhookStore implements ProcessedWebhookStore {
  processed = new Map<string, { paymentId?: string; eventName?: string }>()
  processing = new Map<string, { at: number; token: string }>()

  async isProcessed(deliveryId: string): Promise<boolean> {
    return this.processed.has(deliveryId)
  }
  async claimDelivery(
    deliveryId: string,
    staleMs: number,
  ): Promise<{ kind: 'claimed'; token: string } | { kind: 'processed' } | { kind: 'in_progress' }> {
    if (this.processed.has(deliveryId)) return { kind: 'processed' }
    const now = Date.now()
    const processingAt = this.processing.get(deliveryId)
    if (processingAt && now - processingAt.at < staleMs) return { kind: 'in_progress' }
    const token = crypto.randomUUID()
    this.processing.set(deliveryId, { at: now, token })
    return { kind: 'claimed', token }
  }
  async markProcessed(
    deliveryId: string,
    claimToken: string,
    meta: { paymentId?: string; eventName?: string },
  ): Promise<boolean> {
    if (this.processing.get(deliveryId)?.token !== claimToken) return false
    this.processed.set(deliveryId, meta)
    this.processing.delete(deliveryId)
    return true
  }
  async releaseClaim(deliveryId: string, claimToken: string): Promise<void> {
    if (this.processing.get(deliveryId)?.token === claimToken) this.processing.delete(deliveryId)
  }
  async pruneOlderThan(): Promise<number> {
    return 0
  }
}

export class FakePaymentsClient implements PaymentsClient {
  byId = new Map<string, PaymentSnapshot>()
  failWith: Error | null = null

  set(snapshot: PaymentSnapshot): this {
    this.byId.set(snapshot.id, snapshot)
    return this
  }
  async getPayment(paymentId: string): Promise<PaymentSnapshot | null> {
    if (this.failWith) throw this.failWith
    return this.byId.get(paymentId) ?? null
  }
}

export class FakeCatalogClient implements CatalogClient {
  byId = new Map<string, OfferSnapshot>()
  failWith: Error | null = null

  set(offer: OfferSnapshot): this {
    this.byId.set(offer.id, offer)
    return this
  }
  async getOfferById(offerId: string): Promise<OfferSnapshot | null> {
    if (this.failWith) throw this.failWith
    return this.byId.get(offerId) ?? null
  }
}

export class ScriptedSefinGateway implements SefinNacionalGateway {
  emitted: EmitDpsInput[] = []
  nextResults: EmitResult[] = []
  emitError: Error | null = null
  lookupResult: { accessKey: string } | null = null
  /** Hook p/ simular trabalho concorrente DURANTE a chamada à Sefin (ex.: estorno). */
  onEmit: (() => Promise<void>) | null = null

  async emitDps(input: EmitDpsInput): Promise<EmitResult> {
    this.emitted.push(input)
    if (this.onEmit) await this.onEmit()
    if (this.emitError) throw this.emitError
    const next = this.nextResults.shift()
    return (
      next ?? {
        kind: 'accepted',
        accessKey: '1'.repeat(50),
        nfseXml: '<NFSe/>',
        dpsXml: `<DPS id="${input.dpsId}"/>`,
      }
    )
  }
  async findNfseByDpsId(): Promise<{ accessKey: string } | null> {
    return this.lookupResult
  }

  cancelled: Array<{ accessKey: string; cMotivo: '1' | '2' | '9'; xMotivo: string }> = []
  nextCancelResults: Array<
    | { kind: 'accepted'; eventXml: string }
    | { kind: 'rejected'; errors: Array<{ code: string; message: string }> }
  > = []
  cancelError: Error | null = null

  async cancelNfse(input: { accessKey: string; cMotivo: '1' | '2' | '9'; xMotivo: string }) {
    if (this.cancelError) {
      const error = this.cancelError
      this.cancelError = null
      throw error
    }
    this.cancelled.push(input)
    return this.nextCancelResults.shift() ?? { kind: 'accepted' as const, eventXml: '<evento/>' }
  }
}

export class RecordingMessagingClient {
  sent: Array<{
    idempotencyKey: string
    recipient: { name: string; email: string }
    variables: Record<string, string>
    attachments: Array<{ filename: string; url: string; contentType?: string }>
  }> = []
  failWith: Error | null = null

  async sendInvoiceEmail(input: {
    idempotencyKey: string
    recipient: { name: string; email: string }
    variables: Record<string, string>
    attachments: Array<{ filename: string; url: string; contentType?: string }>
  }): Promise<boolean> {
    if (this.failWith) throw this.failWith
    this.sent.push(input)
    return true
  }
}

export class ScriptedDanfseClient implements DanfseClient {
  failWith: Error | null = null
  async fetchPdf(): Promise<Uint8Array> {
    if (this.failWith) throw this.failWith
    return new TextEncoder().encode('%PDF-fake')
  }
}

export function paidSnapshot(overrides: Partial<PaymentSnapshot> = {}): PaymentSnapshot {
  return {
    id: 'pay-1',
    status: 'PAID',
    amountInCents: 3700n,
    paidAt: new Date('2026-06-01T12:00:00Z'),
    customer: { name: 'Maria Compradora', email: 'maria@example.com', document: '52998224725' },
    metadata: { offerId: 'offer-1' },
    refundedAt: null,
    ...overrides,
  }
}
