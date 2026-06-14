import { sql } from 'drizzle-orm'
import {
  bigint,
  customType,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const fiscalSchema = pgSchema('fiscal')

export const invoiceStatusEnum = fiscalSchema.enum('invoice_status', [
  'SCHEDULED', // agendada (scheduled_for no futuro, ou aguardando retry)
  'EMITTED', // NFS-e emitida (tem access_key)
  'SKIPPED', // nunca será emitida (refund/cancel antes; skip_reason preenchido)
  'FAILED', // esgotou tentativas ou rejeição determinística (admin pode reprocessar)
  'CANCEL_PENDING', // cancelamento solicitado (manual/pós-refund), evento ainda não aceito
  'CANCELLED', // evento de cancelamento aceito pela Sefin
  'SUBSTITUTED', // substituída por outra nota (substituted_by_id)
])

export interface InvoiceCustomerJson {
  name: string
  email: string
  /** CPF sem máscara. */
  document: string
}

/** DANFSe em bytea (volume baixo; blinda contra a troca do DANFSe em jul/2026). */
const bytea = customType<{ data: Uint8Array }>({
  dataType() {
    return 'bytea'
  },
})

export const invoices = fiscalSchema.table(
  'invoices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Contador informativo de mutações (auditoria). A guarda de concorrência
    // REAL das transições disputadas (worker × webhook × admin) é o UPDATE
    // condicionado ao status de origem no repositório, não este número.
    version: integer('version').notNull().default(0),
    paymentId: uuid('payment_id').notNull(),
    status: invoiceStatusEnum('status').notNull(),

    // Snapshot do agendamento (imutável p/ a nota; o payments é re-consultado
    // SÓ p/ status no momento da emissão):
    customer: jsonb('customer').$type<InvoiceCustomerJson>().notNull(),
    amountInCents: bigint('amount_in_cents', { mode: 'bigint' }).notNull(),
    serviceDescription: text('service_description').notNull(),
    offerId: uuid('offer_id'),
    guaranteeDays: integer('guarantee_days'),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),

    // Worker (claim por lease, espelha charge_attempts/charge_claimed_at do payments):
    attempts: integer('attempts').notNull().default(0),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    lastError: text('last_error'),
    skipReason: text('skip_reason'),

    // DPS / NFS-e:
    dpsSeries: text('dps_series'),
    dpsNumber: bigint('dps_number', { mode: 'bigint' }),
    dpsId: text('dps_id'),
    dpsXml: text('dps_xml'),
    nfseXml: text('nfse_xml'),
    accessKey: text('access_key'),
    /** Competência usada na DPS (decisão do usuário: data da EMISSÃO, em BRT). */
    competenceDate: text('competence_date'),
    ambiente: text('ambiente').notNull(),
    emittedAt: timestamp('emitted_at', { withTimezone: true }),

    // Cancelamento / substituição:
    cancelReason: text('cancel_reason'),
    cancelRequestedBy: text('cancel_requested_by'),
    cancelEventXml: text('cancel_event_xml'),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    substitutesId: uuid('substitutes_id'),
    substitutedById: uuid('substituted_by_id'),

    // PDF / e-mail:
    pdfStoredAt: timestamp('pdf_stored_at', { withTimezone: true }),
    /** Capability-token da URL de anexo consumida pelo messaging (≥32 bytes hex). */
    pdfToken: text('pdf_token'),
    emailSentAt: timestamp('email_sent_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // 1 nota ATIVA por pagamento — idempotência da re-entrega de webhook. Notas
    // SUBSTITUTAS (substitutes_id) ficam FORA da unique: convivem com a original
    // EMITTED do mesmo payment até ela virar SUBSTITUTED.
    uniqueIndex('invoices_payment_active_uq')
      .on(t.paymentId)
      .where(
        sql`status NOT IN ('SUBSTITUTED', 'SKIPPED', 'CANCELLED', 'FAILED') AND substitutes_id IS NULL`,
      ),
    // 1 SUBSTITUTA ativa por nota original. As substitutas ficam FORA da unique
    // acima (substitutes_id NOT NULL), então sem esta guarda dois POST /substitute
    // concorrentes criariam DUAS substitutas → DUAS NFS-e reais para uma venda.
    uniqueIndex('invoices_substitute_active_uq')
      .on(t.substitutesId)
      .where(
        sql`substitutes_id IS NOT NULL AND status NOT IN ('SUBSTITUTED', 'SKIPPED', 'CANCELLED', 'FAILED')`,
      ),
    uniqueIndex('invoices_dps_uq').on(t.dpsSeries, t.dpsNumber).where(sql`dps_number IS NOT NULL`),
    uniqueIndex('invoices_access_key_uq').on(t.accessKey).where(sql`access_key IS NOT NULL`),
    uniqueIndex('invoices_pdf_token_uq').on(t.pdfToken).where(sql`pdf_token IS NOT NULL`),
    // Fila do worker de emissão.
    index('invoices_due_idx').on(t.scheduledFor).where(sql`status = 'SCHEDULED'`),
    index('invoices_cancel_due_idx').on(t.updatedAt).where(sql`status = 'CANCEL_PENDING'`),
    index('invoices_status_idx').on(t.status),
    index('invoices_created_at_idx').on(t.createdAt),
    index('invoices_payment_idx').on(t.paymentId),
    // Busca livre `q` do admin (ILIKE '%…%' em nome/e-mail/CPF/paymentId/chave).
    // pg_trgm (extensão criada na migration) torna cada ramo indexável — sem isto
    // cada busca é seq scan da tabela inteira (×2, items + count). Espelha payments.
    index('invoices_customer_name_trgm_idx').using(
      'gin',
      sql`(${t.customer} ->> 'name') gin_trgm_ops`,
    ),
    index('invoices_customer_email_trgm_idx').using(
      'gin',
      sql`(${t.customer} ->> 'email') gin_trgm_ops`,
    ),
    index('invoices_customer_document_trgm_idx').using(
      'gin',
      sql`(${t.customer} ->> 'document') gin_trgm_ops`,
    ),
    index('invoices_payment_id_text_trgm_idx').using(
      'gin',
      sql`(${t.paymentId}::text) gin_trgm_ops`,
    ),
    index('invoices_access_key_trgm_idx').using('gin', t.accessKey.op('gin_trgm_ops')),
  ],
)

export const invoicePdfs = fiscalSchema.table('invoice_pdfs', {
  invoiceId: uuid('invoice_id').primaryKey(),
  content: bytea('content').notNull(),
  contentType: text('content_type').notNull().default('application/pdf'),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Timeline append-only de auditoria (alimenta o detalhe no admin; retenção permanente). */
export const invoiceEvents = fiscalSchema.table(
  'invoice_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    invoiceId: uuid('invoice_id').notNull(),
    type: text('type').notNull(),
    actor: text('actor'),
    detail: jsonb('detail').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('invoice_events_invoice_idx').on(t.invoiceId, t.createdAt)],
)

/** Dedupe das entregas do payments (padrão do funil: marca SÓ após sucesso). */
export const processedWebhooks = fiscalSchema.table(
  'processed_webhooks',
  {
    deliveryId: text('delivery_id').primaryKey(),
    paymentId: text('payment_id'),
    eventName: text('event_name'),
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('processed_webhooks_processed_at_idx').on(t.processedAt)],
)

/** Numeração da DPS por série — alocação transacional (UPDATE ... RETURNING). */
export const dpsCounters = fiscalSchema.table('dps_counters', {
  series: text('series').primaryKey(),
  // default via sql cru: drizzle-kit não serializa BigInt (0n) no snapshot.
  lastNumber: bigint('last_number', { mode: 'bigint' }).notNull().default(sql`0`),
})

export const schema = {
  invoices,
  invoicePdfs,
  invoiceEvents,
  processedWebhooks,
  dpsCounters,
  invoiceStatusEnum,
}
