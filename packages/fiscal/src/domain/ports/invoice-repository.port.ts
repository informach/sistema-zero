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
  /** Identifica a réplica dona do lease atual da fila. */
  claimToken: string | null
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
  /**
   * Insere somente quando ainda não existe nota ativa equivalente. Diferente de
   * `schedule()`, não recupera a linha concorrente: a API administrativa usa o
   * `null` para informar 409 e jamais auditar uma criação que não venceu.
   */
  scheduleIfAbsent(input: ScheduleInvoiceInput): Promise<Invoice | null>

  /** SCHEDULED → SKIPPED (refund antes da emissão / não-PAID na re-verificação). */
  skip(id: string, reason: SkipReason, detail?: string, claimToken?: string): Promise<boolean>

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
  failExhausted(opts: { maxAttempts: number; staleMs: number }): Promise<number>

  /**
   * Renova o lease (claimed_at = agora) da nota em processamento. Chamado pelos
   * workers ANTES de cada item: um lote longo não estoura o lease da nota atual
   * (que outra réplica re-reivindicaria). Atualiza só claimed_at (não mexe na
   * ordenação da fila de cancelamento por updated_at).
   */
  touchClaim(id: string, claimToken: string): Promise<boolean>

  /** Aloca (uma única vez) número/série/dpsId; retry reusa o já alocado. */
  allocateDpsNumber(
    id: string,
    series: string,
    buildDpsId: (n: bigint) => string,
    claimToken: string,
  ): Promise<{ dpsNumber: bigint; dpsId: string } | null>

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
    claimToken: string,
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
  releaseForRetry(
    id: string,
    nextAttemptAt: Date,
    lastError: string,
    claimToken: string,
  ): Promise<boolean>

  /** Falha permanente (rejeição determinística / attempts esgotados). */
  markFailed(id: string, lastError: string, claimToken?: string): Promise<boolean>

  /** EMITTED/CANCEL_FAILED → CANCEL_PENDING (admin ou pós-refund). */
  requestCancel(id: string, by: string, reason: string): Promise<boolean>

  /** CANCEL_PENDING vencidas p/ o worker de cancelamento (mesmo modelo de claim). */
  claimCancelPending(opts: { batchSize: number; staleMs: number }): Promise<Invoice[]>

  /**
   * CANCEL_PENDING → CANCELLED (evento aceito pela Sefin). `false` indica que
   * outra réplica venceu a corrida; nesse caso o caller NÃO pode auditar este
   * resultado como próprio.
   */
  markCancelled(id: string, cancelEventXml: string, claimToken: string): Promise<boolean>

  /** CANCEL_PENDING → CANCEL_FAILED (rejeição determinística da Sefin). */
  markCancelFailed(id: string, lastError: string, claimToken: string): Promise<boolean>

  /** FAILED → SCHEDULED (reprocessamento via admin). */
  retry(id: string, scheduledFor: Date): Promise<boolean>

  /** Antecipação manual: SCHEDULED → scheduledFor=AGORA (limpa backoff). */
  expedite(id: string): Promise<boolean>

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
    claimToken: string,
  ): Promise<{
    recorded: boolean
    originalSubstituted: boolean
    /** Estorno venceu a corrida: a substituta real já foi encaminhada ao cancelamento. */
    substituteCancelPending: boolean
  }>

  /** Trilha de auditoria (append-only). */
  appendEvent(
    invoiceId: string,
    type: string,
    actor: string | null,
    detail?: Record<string, unknown>,
  ): Promise<void>

  storePdf(
    invoiceId: string,
    content: Uint8Array,
    claimToken: string,
    contentType?: string,
  ): Promise<boolean>
  /** `invoiceStatus` alimenta o carimbo CANCELADA/SUBSTITUÍDA na hora de servir. */
  findPdfByToken(token: string): Promise<{
    invoiceId: string
    invoiceStatus: InvoiceStatus
    content: Uint8Array
    contentType: string
  } | null>
  markEmailSent(id: string, claimToken: string): Promise<boolean>

  /**
   * Claim de notas EMITTED que ainda precisam do DANFSe e/ou e-mail. Reusa
   * claimed_at/next_attempt_at como lease/backoff de pós-emissão; emissão e
   * cancelamento filtram por status, então não disputam a mesma linha.
   */
  claimEmittedNeedingDelivery(opts: {
    batchSize: number
    staleMs: number
    /** Sem messaging, recupera somente o DANFSe — e-mail pendente não é trabalho. */
    includeEmail: boolean
  }): Promise<Invoice[]>
  releaseDeliveryRetry(
    id: string,
    nextAttemptAt: Date,
    lastError: string,
    claimToken: string,
  ): Promise<boolean>
  markDeliveryComplete(id: string, claimToken: string): Promise<boolean>
}
