import {
  date,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

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
export const profileStatusEnum = auth.enum('profile_status', ['active', 'archived'])

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
    // URL pública da foto de perfil (upload feito pelo app cliente; ex.: R2).
    avatarUrl: text('avatar_url'),
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
    // Sessão de IMPERSONAÇÃO: id do admin que está navegando como `userId`
    // (`null` = sessão normal). Vive na FAMÍLIA: cada rotação re-deriva a claim
    // `act` e o TTL curto a partir daqui — sem isso a rotação "esqueceria" a
    // impersonação (re-emite do UserAggregate) e esticaria o TTL de volta.
    impersonatorUserId: uuid('impersonator_user_id'),
    // Sessão de PERFIL (estilo Netflix): id do perfil de criança ativo. O `userId`
    // da linha é a CONTA do responsável; `active_profile_id` é a sobreposição que
    // vira o `sub`/`pfl` do access token. Vive na FAMÍLIA: a rotação re-deriva a
    // claim `pfl` daqui (perfil arquivado/sumido → cai p/ sessão da conta).
    activeProfileId: uuid('active_profile_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('refresh_tokens_hash_uq').on(t.tokenHash),
    index('refresh_tokens_user_idx').on(t.userId),
    index('refresh_tokens_family_idx').on(t.familyId),
    // Purga periódica (deleteExpired): sem este índice cada ciclo varre a tabela
    // inteira — e é a tabela que mais cresce (1 linha por login/rotação).
    index('refresh_tokens_expires_idx').on(t.expiresAt),
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
    // Purga periódica (deleteExpired).
    index('password_reset_tokens_expires_idx').on(t.expiresAt),
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
  (t) => [
    index('otp_codes_user_purpose_idx').on(t.userId, t.purpose),
    // Purga periódica (deleteExpired).
    index('otp_codes_expires_idx').on(t.expiresAt),
  ],
)

/**
 * Tokens de HANDOFF de impersonação (admin "entra como" um usuário na community).
 * Tabela DEDICADA (não reaproveita `password_reset_tokens`): o blast radius fica
 * isolado — um token de reset jamais vira sessão de impersonação e vice-versa —
 * e ela carrega o PAR ator→alvo. Guarda só o `tokenHash` (sha256); single-use
 * (`consumedAt`, consumo ATÔMICO) com TTL curtíssimo (~60s — só atravessa a URL).
 */
export const impersonationTokens = auth.table(
  'impersonation_tokens',
  {
    id: uuid('id').primaryKey(),
    tokenHash: text('token_hash').notNull(),
    /** Admin/superadmin que pediu a impersonação (vira a claim `act.sub`). */
    actorId: uuid('actor_id').notNull(),
    /** Usuário cuja sessão será emitida no exchange. */
    targetUserId: uuid('target_user_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('impersonation_tokens_hash_uq').on(t.tokenHash),
    // Purga periódica (deleteExpired).
    index('impersonation_tokens_expires_idx').on(t.expiresAt),
  ],
)

/**
 * Perfis (estilo Netflix) de uma CONTA do responsável. Uma conta (`auth.users`) tem
 * N perfis de crianças; o `id` do perfil vira a identidade EFETIVA (`x-auth-user-id`)
 * quando a sessão de perfil está ativa — por isso progresso/gamificação/comunidade
 * ficam atrelados a ele (sem mudar o data model de members/hub). A quantidade é
 * limitada pelo que a conta comprou (teto resolvido S2S no members, ver
 * `GetProfileAllowanceService`). NUNCA DELETE físico: arquivar (`status='archived'`)
 * tira o perfil da grade mas preserva o histórico keyado no `id`.
 */
export const profiles = auth.table(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    /** Responsável dono do perfil (`auth.users.id`). */
    accountUserId: uuid('account_user_id').notNull(),
    name: text('name').notNull(),
    // URL pública da foto (só http(s); upload é do app cliente → R2; fora das claims).
    avatarUrl: text('avatar_url'),
    // WhatsApp de contato do perfil (opcional; sem envio automático na v1).
    whatsapp: text('whatsapp'),
    // Data de nascimento da criança (controle de idade). SÓ os pais editam (a
    // criança em sessão de perfil é barrada na rota). `mode: 'string'` (YYYY-MM-DD)
    // evita o deslocamento de dia do round-trip Date↔UTC.
    birthDate: date('birth_date', { mode: 'string' }),
    status: profileStatusEnum('status').notNull().default('active'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  // Lista da grade (perfis ativos da conta, em ordem) + contagem do limite.
  (t) => [index('profiles_account_idx').on(t.accountUserId, t.sortOrder)],
)

export const schema = {
  users,
  refreshTokens,
  passwordResetTokens,
  otpCodes,
  impersonationTokens,
  profiles,
}
