import { and, desc, eq, inArray, isNull, lte, notInArray, or, sql } from 'drizzle-orm'
import type { InvoiceStatus, SkipReason } from '../../../domain/invoice/invoice.status'
import type {
  Invoice,
  InvoiceRepository,
  ScheduleInvoiceInput,
} from '../../../domain/ports/invoice-repository.port'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import { dpsCounters, invoiceEvents, invoicePdfs, invoices } from './schema'

const ACTIVE_STATUSES: InvoiceStatus[] = ['SCHEDULED', 'EMITTED', 'CANCEL_PENDING']

export class DrizzleInvoiceRepository implements InvoiceRepository {
  constructor(private readonly db: Database) {}

  async findById(id: string): Promise<Invoice | null> {
    const [row] = await this.db.select().from(invoices).where(eq(invoices.id, id)).limit(1)
    return row ? toInvoice(row) : null
  }

  async findActiveByPaymentId(paymentId: string): Promise<Invoice | null> {
    const [row] = await this.db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.paymentId, paymentId),
          inArray(invoices.status, ACTIVE_STATUSES),
          isNull(invoices.substitutesId),
        ),
      )
      .limit(1)
    return row ? toInvoice(row) : null
  }

  async findActiveManyByPaymentId(paymentId: string): Promise<Invoice[]> {
    const rows = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.paymentId, paymentId), inArray(invoices.status, ACTIVE_STATUSES)))
    return rows.map(toInvoice)
  }

  async list(query: {
    status?: Invoice['status']
    q?: string
    limit: number
    offset: number
  }): Promise<{ items: Invoice[]; total: number }> {
    const filters = []
    if (query.status) filters.push(eq(invoices.status, query.status))
    if (query.q?.trim()) {
      const pattern = `%${escapeLike(query.q.trim())}%`
      filters.push(
        or(
          sql`${invoices.customer}->>'name' ILIKE ${pattern}`,
          sql`${invoices.customer}->>'email' ILIKE ${pattern}`,
          sql`${invoices.customer}->>'document' ILIKE ${pattern}`,
          sql`${invoices.paymentId}::text ILIKE ${pattern}`,
          sql`${invoices.accessKey} ILIKE ${pattern}`,
        ),
      )
    }
    const where = filters.length > 0 ? and(...filters) : undefined

    const items = await this.db
      .select()
      .from(invoices)
      .where(where)
      .orderBy(desc(invoices.createdAt))
      .limit(query.limit)
      .offset(query.offset)
    const [count] = await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(invoices)
      .where(where)
    return { items: items.map(toInvoice), total: count?.total ?? 0 }
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.db
      .select({ status: invoices.status, total: sql<number>`count(*)::int` })
      .from(invoices)
      .groupBy(invoices.status)
    return Object.fromEntries(rows.map((r) => [r.status, r.total]))
  }

  async listEvents(invoiceId: string) {
    const rows = await this.db
      .select()
      .from(invoiceEvents)
      .where(eq(invoiceEvents.invoiceId, invoiceId))
      .orderBy(invoiceEvents.createdAt)
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      actor: r.actor,
      detail: r.detail,
      createdAt: r.createdAt,
    }))
  }

  async schedule(input: ScheduleInvoiceInput): Promise<Invoice> {
    try {
      const [row] = await this.db
        .insert(invoices)
        .values({
          paymentId: input.paymentId,
          status: 'SCHEDULED',
          customer: input.customer,
          amountInCents: input.amountInCents,
          serviceDescription: input.serviceDescription,
          offerId: input.offerId,
          guaranteeDays: input.guaranteeDays,
          paidAt: input.paidAt,
          scheduledFor: input.scheduledFor,
          ambiente: input.ambiente,
          substitutesId: input.substitutesId ?? null,
        })
        .returning()
      if (!row) throw new Error('insert sem retorno')
      return toInvoice(row)
    } catch (error) {
      // Corrida de re-entrega: a unique parcial (1 ativa por payment) segura a
      // segunda inserção — devolve a existente (idempotência).
      if (isUniqueViolation(error)) {
        const existing = await this.findActiveByPaymentId(input.paymentId)
        if (existing) return existing
      }
      throw error
    }
  }

  async skip(id: string, reason: SkipReason, detail?: string): Promise<void> {
    await this.transition(id, ['SCHEDULED'], {
      status: 'SKIPPED',
      skipReason: detail ? `${reason}: ${detail}` : reason,
      claimedAt: null,
    })
  }

  async claimDueForEmission(opts: {
    batchSize: number
    staleMs: number
    maxAttempts: number
  }): Promise<Invoice[]> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - opts.staleMs)
    // Claim com lease: attempts++ NO claim (crash conta como tentativa — sem
    // re-entrega infinita). SKIP LOCKED → seguro com N réplicas.
    const rows = await this.db.transaction(async (tx) => {
      const due = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, 'SCHEDULED'),
            lte(invoices.scheduledFor, now),
            or(isNull(invoices.nextAttemptAt), lte(invoices.nextAttemptAt, now)),
            or(isNull(invoices.claimedAt), lte(invoices.claimedAt, staleBefore)),
            sql`${invoices.attempts} <= ${opts.maxAttempts}`,
          ),
        )
        .orderBy(invoices.scheduledFor)
        .limit(opts.batchSize)
        .for('update', { skipLocked: true })

      if (due.length === 0) return []
      const ids = due.map((d) => d.id)
      return tx
        .update(invoices)
        .set({
          claimedAt: now,
          attempts: sql`${invoices.attempts} + 1`,
          updatedAt: now,
        })
        .where(inArray(invoices.id, ids))
        .returning()
    })
    return rows.map(toInvoice)
  }

  async allocateDpsNumber(
    id: string,
    series: string,
    buildDpsId: (n: bigint) => string,
  ): Promise<{ dpsNumber: bigint; dpsId: string }> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ dpsNumber: invoices.dpsNumber, dpsId: invoices.dpsId })
        .from(invoices)
        .where(eq(invoices.id, id))
        .for('update')
      // Retry REUSA o número já alocado — nunca aloca de novo (re-POST do mesmo
      // número vira "duplicate" recuperável; número novo viraria nota dobrada).
      if (current?.dpsNumber != null && current.dpsId) {
        return { dpsNumber: current.dpsNumber, dpsId: current.dpsId }
      }

      await tx
        .insert(dpsCounters)
        .values({ series, lastNumber: 0n })
        .onConflictDoNothing({ target: dpsCounters.series })
      const [counter] = await tx
        .update(dpsCounters)
        .set({ lastNumber: sql`${dpsCounters.lastNumber} + 1` })
        .where(eq(dpsCounters.series, series))
        .returning({ lastNumber: dpsCounters.lastNumber })
      if (!counter) throw new Error(`contador da série ${series} não encontrado`)

      const dpsNumber = counter.lastNumber
      const dpsId = buildDpsId(dpsNumber)
      await tx
        .update(invoices)
        .set({ dpsSeries: series, dpsNumber, dpsId, updatedAt: new Date() })
        .where(eq(invoices.id, id))
      return { dpsNumber, dpsId }
    })
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
  ): Promise<void> {
    await this.transition(id, ['SCHEDULED'], {
      status: 'EMITTED',
      dpsXml: data.dpsXml,
      nfseXml: data.nfseXml,
      accessKey: data.accessKey,
      competenceDate: data.competenceDate,
      pdfToken: data.pdfToken,
      emittedAt: new Date(),
      claimedAt: null,
      lastError: null,
      nextAttemptAt: null,
    })
  }

  async releaseForRetry(id: string, nextAttemptAt: Date, lastError: string): Promise<void> {
    await this.db
      .update(invoices)
      .set({ claimedAt: null, nextAttemptAt, lastError, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.status, 'SCHEDULED')))
  }

  async markFailed(id: string, lastError: string): Promise<void> {
    await this.transition(id, ['SCHEDULED'], { status: 'FAILED', lastError, claimedAt: null })
  }

  async requestCancel(id: string, by: string, reason: string): Promise<void> {
    await this.transition(id, ['EMITTED'], {
      status: 'CANCEL_PENDING',
      cancelRequestedBy: by,
      cancelReason: reason,
      claimedAt: null,
    })
  }

  async claimCancelPending(opts: { batchSize: number; staleMs: number }): Promise<Invoice[]> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - opts.staleMs)
    const rows = await this.db.transaction(async (tx) => {
      const due = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, 'CANCEL_PENDING'),
            or(isNull(invoices.claimedAt), lte(invoices.claimedAt, staleBefore)),
          ),
        )
        .orderBy(invoices.updatedAt)
        .limit(opts.batchSize)
        .for('update', { skipLocked: true })
      if (due.length === 0) return []
      return tx
        .update(invoices)
        .set({ claimedAt: now, updatedAt: now })
        .where(
          inArray(
            invoices.id,
            due.map((d) => d.id),
          ),
        )
        .returning()
    })
    return rows.map(toInvoice)
  }

  async markCancelled(id: string, cancelEventXml: string): Promise<void> {
    await this.transition(id, ['CANCEL_PENDING'], {
      status: 'CANCELLED',
      cancelEventXml,
      cancelledAt: new Date(),
      claimedAt: null,
    })
  }

  async retry(id: string, scheduledFor: Date): Promise<void> {
    await this.transition(id, ['FAILED'], {
      status: 'SCHEDULED',
      scheduledFor,
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      claimedAt: null,
    })
  }

  async expedite(id: string): Promise<void> {
    await this.db
      .update(invoices)
      .set({ scheduledFor: new Date(), nextAttemptAt: null, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.status, 'SCHEDULED')))
  }

  async markSubstituted(originalId: string, substituteId: string): Promise<void> {
    await this.db
      .update(invoices)
      .set({ status: 'SUBSTITUTED', substitutedById: substituteId, updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, originalId),
          notInArray(invoices.status, ['SUBSTITUTED', 'CANCELLED', 'SKIPPED']),
        ),
      )
  }

  async appendEvent(
    invoiceId: string,
    type: string,
    actor: string | null,
    detail: Record<string, unknown> = {},
  ): Promise<void> {
    await this.db.insert(invoiceEvents).values({ invoiceId, type, actor, detail })
  }

  async storePdf(
    invoiceId: string,
    content: Uint8Array,
    contentType = 'application/pdf',
  ): Promise<void> {
    await this.db
      .insert(invoicePdfs)
      .values({ invoiceId, content, contentType, sizeBytes: content.length })
      .onConflictDoUpdate({
        target: invoicePdfs.invoiceId,
        set: { content, contentType, sizeBytes: content.length },
      })
    await this.db
      .update(invoices)
      .set({ pdfStoredAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId))
  }

  async findPdfByToken(
    token: string,
  ): Promise<{ invoiceId: string; content: Uint8Array; contentType: string } | null> {
    const [row] = await this.db
      .select({
        invoiceId: invoicePdfs.invoiceId,
        content: invoicePdfs.content,
        contentType: invoicePdfs.contentType,
      })
      .from(invoices)
      .innerJoin(invoicePdfs, eq(invoicePdfs.invoiceId, invoices.id))
      .where(eq(invoices.pdfToken, token))
      .limit(1)
    return row ?? null
  }

  async markEmailSent(id: string): Promise<void> {
    await this.db
      .update(invoices)
      .set({ emailSentAt: new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, id))
  }

  /** Transição guardada por status de origem — 0 linhas = corrida perdida (no-op). */
  private async transition(
    id: string,
    from: InvoiceStatus[],
    set: Partial<typeof invoices.$inferInsert>,
  ): Promise<void> {
    await this.db
      .update(invoices)
      .set({ ...set, version: sql`${invoices.version} + 1`, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), inArray(invoices.status, from)))
  }
}

function toInvoice(row: typeof invoices.$inferSelect): Invoice {
  return {
    id: row.id,
    version: row.version,
    paymentId: row.paymentId,
    status: row.status,
    customer: row.customer,
    amountInCents: row.amountInCents,
    serviceDescription: row.serviceDescription,
    offerId: row.offerId,
    guaranteeDays: row.guaranteeDays,
    paidAt: row.paidAt,
    scheduledFor: row.scheduledFor,
    attempts: row.attempts,
    claimedAt: row.claimedAt,
    nextAttemptAt: row.nextAttemptAt,
    lastError: row.lastError,
    skipReason: row.skipReason,
    dpsSeries: row.dpsSeries,
    dpsNumber: row.dpsNumber,
    dpsId: row.dpsId,
    dpsXml: row.dpsXml,
    nfseXml: row.nfseXml,
    accessKey: row.accessKey,
    competenceDate: row.competenceDate,
    ambiente: row.ambiente,
    emittedAt: row.emittedAt,
    cancelReason: row.cancelReason,
    cancelRequestedBy: row.cancelRequestedBy,
    cancelledAt: row.cancelledAt,
    substitutesId: row.substitutesId,
    substitutedById: row.substitutedById,
    pdfStoredAt: row.pdfStoredAt,
    pdfToken: row.pdfToken,
    emailSentAt: row.emailSentAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
