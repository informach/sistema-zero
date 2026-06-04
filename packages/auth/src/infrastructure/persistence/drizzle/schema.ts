import { index, integer, pgSchema, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

// Este package compartilha o MESMO Postgres do payments/funnel, mas é dono do
// schema `auth` (isolamento por `pgSchema`). Todo o DDL gerado fica em `auth.*`.
export const auth = pgSchema('auth')

export const userRoleEnum = auth.enum('user_role', ['superadmin', 'admin', 'staff', 'customer'])
export const userStatusEnum = auth.enum('user_status', [
  'active',
  'pending',
  'suspended',
  'blocked',
])
export const otpPurposeEnum = auth.enum('otp_purpose', ['sign_in', 'password_reset'])

/** Usuários (identidade). A senha é guardada apenas como hash argon2id. */
export const users = auth.table(
  'users',
  {
    id: uuid('id').primaryKey(),
    // Versão p/ concorrência otimista (forward-compat com updates de perfil).
    version: integer('version').notNull().default(0),
    // Normalizado lowercase/trim na aplicação; índice único garante unicidade.
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    role: userRoleEnum('role').notNull().default('customer'),
    status: userStatusEnum('status').notNull().default('active'),
    // Opcionais.
    phone: text('phone'),
    // Origem do cadastro (app/canal: funnel/web/mobile/admin).
    signupSource: text('signup_source'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('users_email_uq').on(t.email)],
)

/**
 * Refresh tokens (rotação + reuse-detection). Guarda só o `tokenHash` (sha256) —
 * nunca o valor opaco. `familyId` agrupa uma cadeia de rotações: apresentar um
 * token já revogado revoga a FAMÍLIA inteira (mitiga roubo de refresh token).
 */
export const refreshTokens = auth.table(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    familyId: uuid('family_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    ip: text('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_uq').on(t.tokenHash),
    index('refresh_tokens_user_idx').on(t.userId),
    index('refresh_tokens_family_idx').on(t.familyId),
  ],
)

/**
 * Tokens de redefinição/definição de senha (forgot-password + 1º acesso pós-compra).
 * Guarda só o `tokenHash` (sha256) — nunca o valor cru. Single-use (`consumedAt`)
 * com expiração curta; gerar um token novo consome os pendentes do usuário.
 */
export const passwordResetTokens = auth.table(
  'password_reset_tokens',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('password_reset_tokens_hash_uq').on(t.tokenHash),
    index('password_reset_tokens_user_idx').on(t.userId),
  ],
)

/**
 * Códigos OTP de uso único (login passwordless + recuperação de senha por código).
 * Guarda só o `codeHash` (sha256) — nunca os 6 dígitos. Single-use (`consumedAt`)
 * com expiração curta; `attempts` trava a adivinhação online. Um código ativo por
 * (usuário, finalidade): emitir um novo consome os pendentes daquela finalidade.
 */
export const otpCodes = auth.table(
  'otp_codes',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id').notNull(),
    purpose: otpPurposeEnum('purpose').notNull(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('otp_codes_user_purpose_idx').on(t.userId, t.purpose)],
)

export const schema = {
  users,
  refreshTokens,
  passwordResetTokens,
  otpCodes,
}
