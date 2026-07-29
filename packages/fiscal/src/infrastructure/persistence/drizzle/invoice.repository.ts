import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm'
import type { InvoiceStatus, SkipReason } from '../../../domain/invoice/invoice.status'
import type {
  Invoice,
  InvoiceRepository,
  ScheduleInvoiceInput,
} from '../../../domain/ports/invoice-repository.port'
import type { Database } from './db'
import { escapeLike, isUniqueViolation } from './pg-errors'
import { dpsCounters, invoiceEvents, invoicePdfs, invoices } from './schema'

const ACTIVE_STATUSES: InvoiceStatus[] = ['SCHEDULED', 'EMITTED', 'CANCEL_PENDING', 'CANCEL_FAILED']

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

  /** Substituta ATIVA (não-terminal) de uma nota original — guarda contra dupla substituição. */
  async findActiveSubstituteFor(originalId: string): Promise<Invoice | null> {
    const [row] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.substitutesId, originalId), inArray(invoices.status, ACTIVE_STATUSES)))
      .limit(1)
    return row ? toInvoice(row) : null
  }

  /**
   * Última nota NÃO-substituta do pagamento, em QUALQUER status (incl. terminais).
   * O fluxo automático cria no máximo UMA nota por pagamento na vida — re-entrega
   * de webhook após a 1ª já ter virado SKIPPED/FAILED não pode gerar uma 2ª (a
   * unique parcial só cobre ATIVAS). Backfill manual usa rota própria (admin).
   */
  async findAnyByPaymentId(paymentId: string): Promise<Invoice | null> {
    const [row] = await this.db
      .select()
      .from(invoices)
      .where(and(eq(invoices.paymentId, paymentId), isNull(invoices.substitutesId)))
      .orderBy(desc(invoices.createdAt))
      .limit(1)
    return row ? toInvoice(row) : null
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
    const created = await this.scheduleIfAbsent(input)
    if (created) return created

    const existing = input.substitutesId
      ? await this.findActiveSubstituteFor(input.substitutesId)
      : await this.findActiveByPaymentId(input.paymentId)
    if (existing) return existing
    throw new Error('colisão de agendamento sem nota ativa para recuperar')
  }

  async scheduleIfAbsent(input: ScheduleInvoiceInput): Promise<Invoice | null> {
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
      // Corrida de re-entrega: a unique parcial segura a 2ª inserção — devolve a
      // existente (idempotência). Substituta colide na `invoices_substitute_active_uq`
      // (1 substituta ativa por original); nota normal na `invoices_payment_active_uq`.
      if (isUniqueViolation(error)) {
        const existing = input.substitutesId
          ? await this.findActiveSubstituteFor(input.substitutesId)
          : await this.findActiveByPaymentId(input.paymentId)
        if (existing) return null
      }
      throw error
    }
  }

  async skip(
    id: string,
    reason: SkipReason,
    detail?: string,
    claimToken?: string,
  ): Promise<boolean> {
    const affected = await this.transition(
      id,
      ['SCHEDULED'],
      {
        status: 'SKIPPED',
        skipReason: detail ? `${reason}: ${detail}` : reason,
        claimedAt: null,
      },
      claimToken,
    )
    return affected > 0
  }

  async claimDueForEmission(opts: {
    batchSize: number
    staleMs: number
    maxAttempts: number
  }): Promise<Invoice[]> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - opts.staleMs)
    const claimToken = randomUUID()
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
          claimToken,
          attempts: sql`${invoices.attempts} + 1`,
          updatedAt: now,
        })
        .where(inArray(invoices.id, ids))
        .returning()
    })
    return rows.map(toInvoice)
  }

  /**
   * Coletor de notas presas: o claim faz attempts++ ANTES da emissão, então um
   * crash (deploy/OOM/SIGKILL) entre o claim e a transição terminal deixa a nota
   * SCHEDULED com attempts elevado. Quando attempts ultrapassa maxAttempts o
   * filtro do claim (`attempts <= maxAttempts`) deixa de pegá-la → ficaria presa
   * em SCHEDULED P/ SEMPRE, contada como "agendada" no /metrics (invisível). Aqui
   * forçamos FAILED (visível/alertável). Roda no início de cada tick do worker.
   */
  async failExhausted(opts: { maxAttempts: number; staleMs: number }): Promise<number> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - opts.staleMs)
    const rows = await this.db
      .update(invoices)
      .set({
        status: 'FAILED',
        lastError: 'tentativas esgotadas: presa em SCHEDULED após crash (attempts > maxAttempts)',
        claimedAt: null,
        claimToken: null,
        version: sql`${invoices.version} + 1`,
        updatedAt: now,
      })
      .where(
        and(
          eq(invoices.status, 'SCHEDULED'),
          lte(invoices.scheduledFor, now),
          sql`${invoices.attempts} > ${opts.maxAttempts}`,
          or(isNull(invoices.claimedAt), lte(invoices.claimedAt, staleBefore)),
        ),
      )
      .returning({ id: invoices.id })
    return rows.length
  }

  async allocateDpsNumber(
    id: string,
    series: string,
    buildDpsId: (n: bigint) => string,
    claimToken: string,
  ): Promise<{ dpsNumber: bigint; dpsId: string } | null> {
    return this.db.transaction(async (tx) => {
      const [current] = await tx
        .select({ dpsNumber: invoices.dpsNumber, dpsId: invoices.dpsId })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.status, 'SCHEDULED'),
            eq(invoices.claimToken, claimToken),
          ),
        )
        .for('update')
      if (!current) return null
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
      const allocated = await tx
        .update(invoices)
        .set({ dpsSeries: series, dpsNumber, dpsId, updatedAt: new Date() })
        .where(
          and(
            eq(invoices.id, id),
            eq(invoices.status, 'SCHEDULED'),
            eq(invoices.claimToken, claimToken),
          ),
        )
        .returning({ id: invoices.id })
      return allocated.length > 0 ? { dpsNumber, dpsId } : null
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
    claimToken: string,
  ): Promise<boolean> {
    const rows = await this.db
      .update(invoices)
      .set({
        status: 'EMITTED',
        dpsXml: data.dpsXml,
        nfseXml: data.nfseXml,
        accessKey: data.accessKey,
        competenceDate: data.competenceDate,
        pdfToken: data.pdfToken,
        emittedAt: new Date(),
        lastError: null,
        nextAttemptAt: null,
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.status, 'SCHEDULED'),
          eq(invoices.claimToken, claimToken),
        ),
      )
      .returning({ id: invoices.id })
    return rows.length > 0
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
    // A NFS-e foi autorizada na Sefin, mas um estorno marcou SKIPPED antes do
    // markEmitted. Grava a emissão REAL e encaminha p/ cancelamento (cMotivo 2 —
    // serviço não prestado). Guardado por SKIPPED p/ não pisar noutra transição.
    await this.db
      .update(invoices)
      .set({
        status: 'CANCEL_PENDING',
        dpsXml: data.dpsXml,
        nfseXml: data.nfseXml,
        accessKey: data.accessKey,
        competenceDate: data.competenceDate,
        pdfToken: data.pdfToken,
        emittedAt: new Date(),
        cancelRequestedBy: 'system:refund',
        cancelReason,
        skipReason: null,
        claimedAt: null,
        claimToken: null,
        lastError: null,
        nextAttemptAt: null,
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(invoices.id, id), eq(invoices.status, 'SKIPPED')))
  }

  async touchClaim(id: string, claimToken: string): Promise<boolean> {
    // Só renova o lease de uma nota AINDA no ciclo de processamento — nunca
    // ressuscita o claimed_at de uma que já saiu (ex.: estorno marcou SKIPPED no
    // meio do tick). Só claimed_at: não toca updated_at (fila de cancelamento ordena por ele).
    const rows = await this.db
      .update(invoices)
      .set({ claimedAt: new Date() })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.claimToken, claimToken),
          inArray(invoices.status, ['SCHEDULED', 'CANCEL_PENDING', 'EMITTED']),
        ),
      )
      .returning({ id: invoices.id })
    return rows.length > 0
  }

  async releaseForRetry(
    id: string,
    nextAttemptAt: Date,
    lastError: string,
    claimToken: string,
  ): Promise<boolean> {
    const rows = await this.db
      .update(invoices)
      .set({ claimedAt: null, claimToken: null, nextAttemptAt, lastError, updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.status, 'SCHEDULED'),
          eq(invoices.claimToken, claimToken),
        ),
      )
      .returning({ id: invoices.id })
    return rows.length > 0
  }

  async markFailed(id: string, lastError: string, claimToken?: string): Promise<boolean> {
    const affected = await this.transition(
      id,
      ['SCHEDULED'],
      { status: 'FAILED', lastError, claimedAt: null },
      claimToken,
    )
    return affected > 0
  }

  async requestCancel(id: string, by: string, reason: string): Promise<boolean> {
    const affected = await this.transition(id, ['EMITTED', 'CANCEL_FAILED'], {
      status: 'CANCEL_PENDING',
      cancelRequestedBy: by,
      cancelReason: reason,
      claimedAt: null,
      lastError: null,
      nextAttemptAt: null,
    })
    return affected > 0
  }

  async claimCancelPending(opts: { batchSize: number; staleMs: number }): Promise<Invoice[]> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - opts.staleMs)
    const claimToken = randomUUID()
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
        .set({ claimedAt: now, claimToken, updatedAt: now })
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

  async markCancelled(id: string, cancelEventXml: string, claimToken: string): Promise<boolean> {
    const affected = await this.transition(
      id,
      ['CANCEL_PENDING'],
      {
        status: 'CANCELLED',
        cancelEventXml,
        cancelledAt: new Date(),
        claimedAt: null,
      },
      claimToken,
    )
    return affected > 0
  }

  async markCancelFailed(id: string, lastError: string, claimToken: string): Promise<boolean> {
    const affected = await this.transition(
      id,
      ['CANCEL_PENDING'],
      {
        status: 'CANCEL_FAILED',
        lastError,
        claimedAt: null,
        nextAttemptAt: null,
      },
      claimToken,
    )
    return affected > 0
  }

  async retry(id: string, scheduledFor: Date): Promise<boolean> {
    const affected = await this.transition(id, ['FAILED'], {
      status: 'SCHEDULED',
      scheduledFor,
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      claimedAt: null,
    })
    return affected > 0
  }

  async expedite(id: string): Promise<boolean> {
    const rows = await this.db
      .update(invoices)
      .set({ scheduledFor: new Date(), nextAttemptAt: null, updatedAt: new Date() })
      .where(and(eq(invoices.id, id), eq(invoices.status, 'SCHEDULED')))
      .returning({ id: invoices.id })
    return rows.length > 0
  }

  /**
   * Grava a emissão da SUBSTITUTA e marca a ORIGINAL como SUBSTITUTED numa ÚNICA
   * transação (atomicidade — um crash entre as duas escritas deixava a original
   * presa EMITTED p/ sempre). A original SÓ transiciona se ainda estiver EMITTED:
   * se um estorno a moveu p/ CANCEL_PENDING, NÃO sobrescrevemos o cancelamento
   * (`originalSubstituted=false` → o chamador alerta). Retorna `recorded=false`
   * quando a própria substituta não estava mais SCHEDULED (corrida → reconciliar).
   */
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
    return this.db.transaction(async (tx) => {
      const now = new Date()
      const sub = await tx
        .update(invoices)
        .set({
          status: 'EMITTED',
          dpsXml: data.dpsXml,
          nfseXml: data.nfseXml,
          accessKey: data.accessKey,
          competenceDate: data.competenceDate,
          pdfToken: data.pdfToken,
          emittedAt: now,
          lastError: null,
          nextAttemptAt: null,
          version: sql`${invoices.version} + 1`,
          updatedAt: now,
        })
        .where(
          and(
            eq(invoices.id, substituteId),
            eq(invoices.status, 'SCHEDULED'),
            eq(invoices.claimToken, claimToken),
          ),
        )
        .returning({ id: invoices.id })
      if (sub.length === 0) {
        return { recorded: false, originalSubstituted: false, substituteCancelPending: false }
      }

      const orig = await tx
        .update(invoices)
        .set({
          status: 'SUBSTITUTED',
          substitutedById: substituteId,
          version: sql`${invoices.version} + 1`,
          updatedAt: now,
        })
        .where(and(eq(invoices.id, originalId), eq(invoices.status, 'EMITTED')))
        .returning({ id: invoices.id })
      if (orig.length > 0) {
        return { recorded: true, originalSubstituted: true, substituteCancelPending: false }
      }

      // Se o estorno venceu a corrida, a original já iniciou (ou até concluiu) o
      // cancelamento. A substituta acabou de virar uma NFS-e REAL e precisa entrar
      // no mesmo fluxo dentro desta transação; depender de outro webhook deixaria
      // uma janela de crash — ou de leitura eventualmente defasada do payments —
      // com a nota ativa para sempre.
      const [original] = await tx
        .select({ status: invoices.status, cancelRequestedBy: invoices.cancelRequestedBy })
        .from(invoices)
        .where(eq(invoices.id, originalId))
        .limit(1)
      if (
        original?.cancelRequestedBy === 'system:refund' &&
        (original.status === 'CANCEL_PENDING' ||
          original.status === 'CANCEL_FAILED' ||
          original.status === 'CANCELLED')
      ) {
        await tx
          .update(invoices)
          .set({
            status: 'CANCEL_PENDING',
            cancelRequestedBy: 'system:refund',
            cancelReason: 'Pagamento reembolsado durante a substituição',
            claimedAt: null,
            claimToken: null,
            lastError: null,
            nextAttemptAt: null,
            version: sql`${invoices.version} + 1`,
            updatedAt: now,
          })
          .where(and(eq(invoices.id, substituteId), eq(invoices.status, 'EMITTED')))
        return { recorded: true, originalSubstituted: false, substituteCancelPending: true }
      }
      return { recorded: true, originalSubstituted: false, substituteCancelPending: false }
    })
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
    claimToken: string,
    contentType = 'application/pdf',
  ): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(invoices)
        .set({ pdfStoredAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(invoices.id, invoiceId),
            eq(invoices.status, 'EMITTED'),
            eq(invoices.claimToken, claimToken),
          ),
        )
        .returning({ id: invoices.id })
      if (rows.length === 0) return false
      await tx
        .insert(invoicePdfs)
        .values({ invoiceId, content, contentType, sizeBytes: content.length })
        .onConflictDoUpdate({
          target: invoicePdfs.invoiceId,
          set: { content, contentType, sizeBytes: content.length },
        })
      return true
    })
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

  async markEmailSent(id: string, claimToken: string): Promise<boolean> {
    const rows = await this.db
      .update(invoices)
      .set({ emailSentAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.status, 'EMITTED'),
          eq(invoices.claimToken, claimToken),
        ),
      )
      .returning({ id: invoices.id })
    return rows.length > 0
  }

  async claimEmittedNeedingDelivery(opts: {
    batchSize: number
    staleMs: number
    includeEmail: boolean
  }): Promise<Invoice[]> {
    const now = new Date()
    const staleBefore = new Date(now.getTime() - opts.staleMs)
    const claimToken = randomUUID()
    const needsDelivery = opts.includeEmail
      ? or(
          isNull(invoices.pdfStoredAt),
          and(
            isNull(invoices.emailSentAt),
            sql`coalesce(${invoices.customer}->>'email', '') <> ''`,
          ),
        )
      : isNull(invoices.pdfStoredAt)

    const rows = await this.db.transaction(async (tx) => {
      const due = await tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, 'EMITTED'),
            needsDelivery,
            sql`${invoices.accessKey} IS NOT NULL`,
            sql`${invoices.pdfToken} IS NOT NULL`,
            or(isNull(invoices.nextAttemptAt), lte(invoices.nextAttemptAt, now)),
            or(isNull(invoices.claimedAt), lte(invoices.claimedAt, staleBefore)),
          ),
        )
        .orderBy(invoices.emittedAt)
        .limit(opts.batchSize)
        .for('update', { skipLocked: true })
      if (due.length === 0) return []
      return tx
        .update(invoices)
        .set({ claimedAt: now, claimToken, updatedAt: now })
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

  async releaseDeliveryRetry(
    id: string,
    nextAttemptAt: Date,
    lastError: string,
    claimToken: string,
  ): Promise<boolean> {
    const rows = await this.db
      .update(invoices)
      .set({ claimedAt: null, claimToken: null, nextAttemptAt, lastError, updatedAt: new Date() })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.status, 'EMITTED'),
          eq(invoices.claimToken, claimToken),
        ),
      )
      .returning({ id: invoices.id })
    return rows.length > 0
  }

  async markDeliveryComplete(id: string, claimToken: string): Promise<boolean> {
    const rows = await this.db
      .update(invoices)
      .set({
        claimedAt: null,
        claimToken: null,
        nextAttemptAt: null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(invoices.id, id),
          eq(invoices.status, 'EMITTED'),
          eq(invoices.claimToken, claimToken),
        ),
      )
      .returning({ id: invoices.id })
    return rows.length > 0
  }

  /**
   * Transição guardada por status de origem. Retorna o nº de linhas afetadas —
   * 0 = corrida perdida (status já mudou). O chamador decide se o no-op é benigno
   * (refund idempotente) ou precisa reconciliar (emissão real perdida, ver
   * markEmitted/forceCancelAfterRacedEmission).
   */
  private async transition(
    id: string,
    from: InvoiceStatus[],
    set: Partial<typeof invoices.$inferInsert>,
    claimToken?: string,
  ): Promise<number> {
    const rows = await this.db
      .update(invoices)
      .set({
        ...set,
        claimToken: null,
        version: sql`${invoices.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        claimToken
          ? and(
              eq(invoices.id, id),
              inArray(invoices.status, from),
              eq(invoices.claimToken, claimToken),
            )
          : and(eq(invoices.id, id), inArray(invoices.status, from)),
      )
      .returning({ id: invoices.id })
    return rows.length
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
    claimToken: row.claimToken,
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
