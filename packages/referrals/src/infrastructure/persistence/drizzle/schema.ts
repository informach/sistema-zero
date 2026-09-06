import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

/**
 * Schema `referrals` (Postgres compartilhado, 1 schema por bounded context).
 * Fase 1 (bolsa): embaixadores + códigos genéricos + resgates + convites.
 * A tabela `codes` já nasce GENÉRICA (owner ambassador OU account) — na fase 2
 * o mesmo código do membro serve à landing de bolsa e à atribuição `?ref`.
 */
export const referralsSchema = pgSchema('referrals')

export const ambassadors = referralsSchema.table(
  'ambassadors',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: varchar({ length: 120 }).notNull(),
    /** Normalizado (lower/trim) NA APLICAÇÃO antes de qualquer escrita. */
    email: text().notNull(),
    /** Capability do magic-link da página do embaixador (32 bytes base64url). */
    pageToken: text().notNull(),
    /** Conta do auth quando o embaixador é um pai/responsável (auto-cadastro) — snapshot SEM FK. */
    accountUserId: uuid(),
    /** Chave Pix p/ o bônus, cadastrada pelo PRÓPRIO embaixador na página dele. */
    pixKey: varchar({ length: 140 }),
    status: varchar({ length: 16 }).notNull().default('active'),
    /** Versiona a Idempotency-Key do (re)envio do e-mail do link. */
    linkEmailCount: integer().notNull().default(0),
    linkEmailSentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('ambassadors_email_uq').on(t.email),
    uniqueIndex('ambassadors_page_token_uq').on(t.pageToken),
    uniqueIndex('ambassadors_account_uq')
      .on(t.accountUserId)
      .where(sql`account_user_id is not null`),
  ],
)

export const codes = referralsSchema.table(
  'codes',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Slug `^[a-z0-9-]{4,32}$`, sempre lower. */
    code: varchar({ length: 32 }).notNull(),
    /** 'ambassador' | 'account' — exatamente UM dos owners preenchido (CHECK). */
    ownerKind: varchar({ length: 16 }).notNull(),
    ambassadorId: uuid().references(() => ambassadors.id),
    /** Conta do auth (snapshot) — SEM FK cross-schema (regra do monorepo). */
    accountUserId: uuid(),
    /** O "quem indicou" exibido na landing (snapshot). */
    displayName: varchar({ length: 120 }).notNull(),
    /** E-mail do dono (lower) — base do anti-autoindicação da fase 3. */
    ownerEmail: text(),
    /** CPF do dono (opcional; checagem adicional de autoindicação quando presente). */
    ownerDocument: text(),
    /** De qual app o código do membro nasceu ('community' | 'kids') — link do e-mail de crédito. */
    panelAudience: varchar({ length: 16 }),
    status: varchar({ length: 16 }).notNull().default('active'),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('codes_code_uq').on(t.code),
    uniqueIndex('codes_ambassador_uq').on(t.ambassadorId).where(sql`ambassador_id is not null`),
    uniqueIndex('codes_account_uq').on(t.accountUserId).where(sql`account_user_id is not null`),
    check(
      'codes_owner_check',
      sql`(owner_kind = 'ambassador' and ambassador_id is not null and account_user_id is null) or (owner_kind = 'account' and account_user_id is not null and ambassador_id is null)`,
    ),
  ],
)

export const scholarshipRedemptions = referralsSchema.table(
  'scholarship_redemptions',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Código pelo qual a bolsa entrou — o 1º claim vence a atribuição. */
    codeId: uuid()
      .notNull()
      .references(() => codes.id),
    /** Normalizado (lower/trim). UNIQUE = 1 bolsa por e-mail, GLOBAL. */
    email: text().notNull(),
    name: varchar({ length: 120 }).notNull(),
    phone: varchar({ length: 20 }),
    /** Preenchido quando a etapa ensure-buyer concluiu. */
    userId: uuid(),
    /** `created` do ensure-buyer — ramifica o e-mail (welcome × new-access). */
    buyerCreated: boolean(),
    /** Preenchido quando o grant no members concluiu. */
    grantedAt: timestamp({ withTimezone: true }),
    /** Claim atômico do e-mail de boas-vindas (molde welcome do funil). */
    welcomeSentAt: timestamp({ withTimezone: true }),
    status: varchar({ length: 16 }).notNull().default('pending'),
    failedReason: varchar({ length: 64 }),
    lastError: text(),
    /** Lease anti-execução dupla (dupla submissão/refresh); expira e retoma. */
    processingUntil: timestamp({ withTimezone: true }),
    attemptCount: integer().notNull().default(0),
    completedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('scholarship_redemptions_email_uq').on(t.email),
    index('scholarship_redemptions_code_status_idx').on(t.codeId, t.status),
  ],
)

export const invites = referralsSchema.table(
  'invites',
  {
    id: uuid().primaryKey().defaultRandom(),
    ambassadorId: uuid()
      .notNull()
      .references(() => ambassadors.id),
    codeId: uuid()
      .notNull()
      .references(() => codes.id),
    /** Dados MÍNIMOS do convidado (LGPD): só nome + e-mail (lower). */
    inviteeName: varchar({ length: 120 }).notNull(),
    inviteeEmail: text().notNull(),
    status: varchar({ length: 16 }).notNull().default('pending'),
    /** Versiona a Idempotency-Key do (re)envio (re-envio só de `failed`). */
    sendCount: integer().notNull().default(0),
    sentAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('invites_ambassador_invitee_uq').on(t.ambassadorId, t.inviteeEmail),
    index('invites_ambassador_created_idx').on(t.ambassadorId, t.createdAt),
  ],
)

/**
 * Conversões: bolsista que ASSINOU a Comunidade dos Criadores. 1 por resgate
 * (UNIQUE em redemption_id — "só a primeira cobrança paga bônus" por
 * construção: ciclos seguintes conflitam e viram no-op) e 1 por pagamento
 * (dedupe de re-entrega do consumer). O bônus NUNCA é saldo: `status` sinaliza
 * elegibilidade e o Pix é pago MANUALMENTE fora do sistema (admin marca pago).
 */
export const conversions = referralsSchema.table(
  'conversions',
  {
    id: uuid().primaryKey().defaultRandom(),
    redemptionId: uuid()
      .notNull()
      .references(() => scholarshipRedemptions.id),
    codeId: uuid()
      .notNull()
      .references(() => codes.id),
    ambassadorId: uuid().references(() => ambassadors.id),
    /** Pagamento que disparou a conversão (snapshot do payments, sem FK). */
    paymentId: text().notNull(),
    subscriptionId: text(),
    offerSlug: varchar({ length: 80 }).notNull(),
    /** Valor PAGO pelo assinante (exibição no admin) — bigint como no payments. */
    amountCents: bigint({ mode: 'bigint' }).notNull(),
    /** Snapshot do bônus no momento (env BONUS_AMOUNT_CENTS; 0 em self_blocked). */
    bonusCents: integer().notNull(),
    /** pending | eligible | paid | canceled | self_blocked */
    status: varchar({ length: 16 }).notNull().default('pending'),
    /** paid_at do PAGAMENTO (âncora da maturação). */
    paidAt: timestamp({ withTimezone: true }).notNull(),
    /** paid_at + BONUS_MATURE_HOURS (garantia de 7d + buffer, régua da NFS-e). */
    maturesAt: timestamp({ withTimezone: true }).notNull(),
    eligibleAt: timestamp({ withTimezone: true }),
    /** Mark-after-send do e-mail `referrals-bonus-eligible`. */
    notifiedAt: timestamp({ withTimezone: true }),
    /** Controle do Pix MANUAL: quem marcou como pago e quando. */
    paidMarkedAt: timestamp({ withTimezone: true }),
    paidMarkedBy: varchar({ length: 120 }),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // PARCIAL: `canceled` NÃO ocupa a vaga — bolsista que estornou na garantia
    // e assinou DE NOVO meses depois volta a gerar bônus (achado do full review;
    // pending/eligible/paid/self_blocked seguem travando "só a primeira").
    uniqueIndex('conversions_redemption_uq').on(t.redemptionId).where(sql`status <> 'canceled'`),
    uniqueIndex('conversions_payment_uq').on(t.paymentId),
    index('conversions_status_matures_idx').on(t.status, t.maturesAt),
    index('conversions_ambassador_status_idx').on(t.ambassadorId, t.status),
    /** Jornada no detalhe do embaixador lista por código (FK não indexa sozinha). */
    index('conversions_code_idx').on(t.codeId),
  ],
)

/** Dedupe das entregas do payments (cópia do padrão fiscal: claim + lease + token). */
export const processedWebhooks = referralsSchema.table(
  'processed_webhooks',
  {
    deliveryId: text().primaryKey(),
    paymentId: text(),
    eventName: text(),
    /** Nulo enquanto reservada; preenchido SÓ após sucesso. */
    processedAt: timestamp({ withTimezone: true }),
    /** Lease curto da reserva; crash permite reentrega depois de expirar. */
    processingAt: timestamp({ withTimezone: true }),
    /** Identifica a tentativa dona do lease (não libera claim de outra réplica). */
    processingToken: text(),
  },
  (t) => [
    index('referrals_pw_processed_at_idx').on(t.processedAt),
    index('referrals_pw_processing_at_idx').on(t.processingAt).where(sql`processed_at is null`),
  ],
)

export const schema = {
  ambassadors,
  codes,
  scholarshipRedemptions,
  invites,
  conversions,
  processedWebhooks,
}
