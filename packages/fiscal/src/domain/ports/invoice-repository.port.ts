import type { InvoiceStatus, SkipReason } from '../invoice/invoice.status'

export interface InvoiceCustomer {
  name: string
  email: string
  /** CPF sem máscara. */
  document: string
}

/** Linha completa da nota (leitura). */
export interface Invoice {
  id: string
  version: number
  paymentId: string
  status: InvoiceStatus
  customer: InvoiceCustomer
  amountInCents: bigint
  serviceDescription: string
  offerId: string | null
  guaranteeDays: number | null
  paidAt: Date
  scheduledFor: Date
  attempts: number
  claimedAt: Date | null
  nextAttemptAt: Date | null
  lastError: string | null
  skipReason: string | null
  dpsSeries: string | null
  dpsNumber: bigint | null
  dpsId: string | null
  dpsXml: string | null
  nfseXml: string | null
  accessKey: string | null
  competenceDate: string | null
  ambiente: string
  emittedAt: Date | null
  cancelReason: string | null
  cancelRequestedBy: string | null
  cancelledAt: Date | null
  substitutesId: string | null
  substitutedById: string | null
  pdfStoredAt: Date | null
  pdfToken: string | null
  emailSentAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ScheduleInvoiceInput {
  paymentId: string
  customer: InvoiceCustomer
  amountInCents: bigint
  serviceDescription: string
  offerId: string | null
  guaranteeDays: number | null
  paidAt: Date
  scheduledFor: Date
  ambiente: string
  /** Presente quando a nota nova SUBSTITUI uma EMITTED (correção via admin). */
  substitutesId?: string
}

export interface InvoiceListQuery {
  status?: InvoiceStatus
  /** Busca por nome/e-mail/CPF do tomador ou paymentId/chave (ILIKE literal). */
  q?: string
  limit: number
  offset: number
}

export interface InvoiceEventRow {
  id: string
  type: string
  actor: string | null
  detail: Record<string, unknown>
  createdAt: Date
}

export interface InvoiceRepository {
  findById(id: string): Promise<Invoice | null>
  /** Nota ativa NÃO-substituta (idempotência do agendamento). */
  findActiveByPaymentId(paymentId: string): Promise<Invoice | null>
  /** TODAS as ativas do pagamento (incl. substituta em voo) — p/ o estorno. */
  findActiveManyByPaymentId(paymentId: string): Promise<Invoice[]>
  /** Substituta ATIVA de uma original — guarda contra dupla substituição. */
  findActiveSubstituteFor(originalId: string): Promise<Invoice | null>
  /** Última nota NÃO-substituta do pagamento em QUALQUER status (idempotência do fluxo automático). */
  findAnyByPaymentId(paymentId: string): Promise<Invoice | null>
  list(query: InvoiceListQuery): Promise<{ items: Invoice[]; total: number }>
  countByStatus(): Promise<Record<string, number>>
  listEvents(invoiceId: string): Promise<InvoiceEventRow[]>

  /**
   * Agenda a nota do pagamento. Idempotente sob re-entrega de webhook: a unique
   * parcial (1 nota ATIVA por payment) faz a segunda inserção virar no-op.
   * Retorna a nota (criada ou a já existente).
   */
  schedule(input: ScheduleInvoiceInput): Promise<Invoice>

  /** SCHEDULED → SKIPPED (refund antes da emissão / não-PAID na re-verificação). */
  skip(id: string, reason: SkipReason, detail?: string): Promise<void>

  /**
   * Claim de lote p/ emissão: SCHEDULED vencidas (scheduled_for/next_attempt_at
   * ≤ now) sem claim vivo (lease). `FOR UPDATE SKIP LOCKED` + attempts++ NO
   * claim (crash conta como tentativa). Seguro com N réplicas.
   */
  claimDueForEmission(opts: {
    batchSize: number
    staleMs: number
    maxAttempts: number
  }): Promise<Invoice[]>

  /**
   * Coletor de notas presas em SCHEDULED com `attempts > maxAttempts` (crash entre
   * o claim e a transição terminal): força FAILED p/ não somem do radar. Retorna
   * quantas foram coletadas. Chamado pelo worker no início de cada ciclo.
   */
  failExhausted(maxAttempts: number): Promise<number>

  /**
   * Renova o lease (claimed_at = agora) da nota em processamento. Chamado pelos
   * workers ANTES de cada item: um lote longo não estoura o lease da nota atual
   * (que outra réplica re-reivindicaria). Atualiza só claimed_at (não mexe na
   * ordenação da fila de cancelamento por updated_at).
   */
  touchClaim(id: string): Promise<void>

  /** Aloca (uma única vez) número/série/dpsId; retry reusa o já alocado. */
  allocateDpsNumber(
    id: string,
    series: string,
    buildDpsId: (n: bigint) => string,
  ): Promise<{ dpsNumber: bigint; dpsId: string }>

  /**
   * Resultado de emissão bem-sucedida (SCHEDULED → EMITTED). Retorna `false`
   * quando NENHUMA linha casou (o status mudou no meio — ex.: um estorno marcou
   * SKIPPED entre a emissão confirmada na Sefin e esta gravação). O chamador
   * trata o `false` SEM perder a chave (ver `forceCancelAfterRacedEmission`).
   */
  markEmitted(
    id: string,
    data: {
      dpsXml: string
      nfseXml: string
      accessKey: string
      competenceDate: string
      pdfToken: string
    },
  ): Promise<boolean>

  /**
   * Reconciliação de corrida: a NFS-e foi REALMENTE autorizada na Sefin, mas um
   * estorno marcou a nota SKIPPED antes do `markEmitted`. Persiste a emissão real
   * (chave/xml) e encaminha p/ cancelamento (`CANCEL_PENDING`, cMotivo de estorno)
   * — JAMAIS deixa uma nota válida de venda estornada sem registro nem cancelamento.
   * Guardado por `SKIPPED` (no-op se outra transição já ocorreu).
   */
  forceCancelAfterRacedEmission(
    id: string,
    data: {
      dpsXml: string
      nfseXml: string
      accessKey: string
      competenceDate: string
      pdfToken: string
    },
    cancelReason: string,
  ): Promise<void>

  /** Falha re-tentável: devolve à fila com backoff. */
  releaseForRetry(id: string, nextAttemptAt: Date, lastError: string): Promise<void>

  /** Falha permanente (rejeição determinística / attempts esgotados). */
  markFailed(id: string, lastError: string): Promise<void>

  /** EMITTED → CANCEL_PENDING (admin ou pós-refund). */
  requestCancel(id: string, by: string, reason: string): Promise<void>

  /** CANCEL_PENDING vencidas p/ o worker de cancelamento (mesmo modelo de claim). */
  claimCancelPending(opts: { batchSize: number; staleMs: number }): Promise<Invoice[]>

  /** CANCEL_PENDING → CANCELLED (evento aceito pela Sefin). */
  markCancelled(id: string, cancelEventXml: string): Promise<void>

  /** FAILED → SCHEDULED (reprocessamento via admin). */
  retry(id: string, scheduledFor: Date): Promise<void>

  /** Antecipação manual: SCHEDULED → scheduledFor=AGORA (limpa backoff). */
  expedite(id: string): Promise<void>

  /**
   * Substituta emitida: grava EMITTED da substituta E marca a original SUBSTITUTED
   * numa ÚNICA transação. A original só transiciona se ainda EMITTED (um estorno
   * que a moveu p/ CANCEL_PENDING NÃO é sobrescrito → `originalSubstituted=false`).
   * `recorded=false` = a substituta já não estava SCHEDULED (corrida → reconciliar).
   */
  markEmittedAsSubstitute(
    substituteId: string,
    data: {
      dpsXml: string
      nfseXml: string
      accessKey: string
      competenceDate: string
      pdfToken: string
    },
    originalId: string,
  ): Promise<{ recorded: boolean; originalSubstituted: boolean }>

  /** Trilha de auditoria (append-only). */
  appendEvent(
    invoiceId: string,
    type: string,
    actor: string | null,
    detail?: Record<string, unknown>,
  ): Promise<void>

  storePdf(invoiceId: string, content: Uint8Array, contentType?: string): Promise<void>
  findPdfByToken(
    token: string,
  ): Promise<{ invoiceId: string; content: Uint8Array; contentType: string } | null>
  markEmailSent(id: string): Promise<void>
}
