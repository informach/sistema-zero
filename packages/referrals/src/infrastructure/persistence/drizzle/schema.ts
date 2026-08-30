import { sql } from 'drizzle-orm'
import {
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

export const schema = { ambassadors, codes, scholarshipRedemptions, invites }
