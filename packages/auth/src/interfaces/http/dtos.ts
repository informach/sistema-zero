import { t } from 'elysia'
import { USER_ROLES } from '../../domain/user/user.role'
import { USER_STATUSES } from '../../domain/user/user.status'

const EMAIL_PATTERN = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
// Ids de usuário são uuid. Validar na borda evita que um `:id` arbitrário chegue
// ao Postgres e estoure 22P02 (invalid input syntax for type uuid) → 500.
const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'

// Uniões de literais derivadas dos enums de domínio (fonte única da verdade).
const roleLiteral = t.Union(USER_ROLES.map((r) => t.Literal(r)))
const statusLiteral = t.Union(USER_STATUSES.map((s) => t.Literal(s)))

/** Corpo de `POST /auth/register`. `phone`/`source` são opcionais. */
export const RegisterBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
  // O mínimo real é a política de senha (configurável); aqui só o teto + piso defensivo.
  password: t.String({ minLength: 1, maxLength: 200 }),
  firstName: t.String({ minLength: 1, maxLength: 100 }),
  lastName: t.String({ minLength: 1, maxLength: 100 }),
  phone: t.Optional(t.String({ maxLength: 20 })),
  source: t.Optional(t.String({ maxLength: 40 })),
})

/** Corpo de `POST /auth/login`. */
export const LoginBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320 }),
  password: t.String({ minLength: 1, maxLength: 200 }),
})

/** Corpo de `POST /auth/refresh`. */
export const RefreshBody = t.Object({
  refreshToken: t.String({ minLength: 1, maxLength: 4096 }),
})

/** Corpo de `POST /auth/logout`. */
export const LogoutBody = t.Object({
  refreshToken: t.String({ minLength: 1, maxLength: 4096 }),
  allSessions: t.Optional(t.Boolean()),
})

/** Corpo de `POST /auth/forgot-password`. Resposta é SEMPRE 200 (anti-enumeração). */
export const ForgotPasswordBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
})

/** Corpo de `POST /auth/reset-password` (token single-use do e-mail). */
export const ResetPasswordBody = t.Object({
  token: t.String({ minLength: 10, maxLength: 512 }),
  newPassword: t.String({ minLength: 1, maxLength: 200 }),
})

const otpPurposeLiteral = t.Union([t.Literal('sign_in'), t.Literal('password_reset')])

/** Corpo de `POST /auth/otp/request` (pede um código por e-mail). Resposta é SEMPRE 200. */
export const RequestOtpBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
  purpose: otpPurposeLiteral,
})

/** Corpo de `POST /auth/otp/verify` (login por código → tokens). */
export const VerifyOtpBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
  code: t.String({ minLength: 4, maxLength: 12 }),
})

/** Corpo de `POST /auth/password/reset-otp` (redefinir senha por código). */
export const ResetPasswordOtpBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
  code: t.String({ minLength: 4, maxLength: 12 }),
  newPassword: t.String({ minLength: 1, maxLength: 200 }),
})

/** Corpo de `PATCH /auth/me` (self-service). E-mail NÃO é editável aqui. */
export const UpdateMeBody = t.Object({
  firstName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  lastName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  phone: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
  // URL pública da foto de perfil (o upload é do app cliente; `null` remove).
  // SÓ http(s): os apps renderizam este valor como `src` — sem o pino de scheme,
  // um `javascript:`/`data:` armazenado viraria vetor nos clientes.
  avatarUrl: t.Optional(t.Union([t.String({ maxLength: 2000, pattern: '^https?://' }), t.Null()])),
})

/** Corpo de `POST /auth/me/password` (troca logado; exige a senha atual). */
export const ChangeMyPasswordBody = t.Object({
  currentPassword: t.String({ minLength: 1, maxLength: 200 }),
  newPassword: t.String({ minLength: 1, maxLength: 200 }),
})

/** Corpo de `POST /auth/internal/password-tokens` (S2S: funil → link de 1º acesso). */
export const CreatePasswordTokenBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
})

/**
 * Corpo de `POST /auth/internal/ensure-buyer` (S2S: funil pós-pagamento). Mesmo
 * shape do registro; `password` é a senha "dummy" usada só na criação (a real vem
 * pelo magic-link). Idempotente por e-mail → sempre devolve um `userId`.
 */
export const EnsureBuyerBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
  password: t.String({ minLength: 1, maxLength: 200 }),
  firstName: t.String({ minLength: 1, maxLength: 100 }),
  lastName: t.String({ minLength: 1, maxLength: 100 }),
  phone: t.Optional(t.String({ maxLength: 20 })),
  source: t.Optional(t.String({ maxLength: 40 })),
})

/** Query de `GET /auth/admin/users` (listagem paginada do painel). */
export const ListUsersQuery = t.Object({
  q: t.Optional(t.String({ maxLength: 320 })),
  role: t.Optional(roleLiteral),
  status: t.Optional(statusLiteral),
  // t.Numeric coage a string da query string para número.
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
})

/** Params das rotas admin `/auth/admin/users/:id` (uuid — 400 na borda, não 500 no banco). */
export const UserIdParams = t.Object({
  id: t.String({ pattern: UUID_PATTERN }),
})

/** Corpo de `POST /auth/admin/users/batch` — hidratação de identidade em lote (≤100 ids). */
export const BatchGetUsersBody = t.Object({
  ids: t.Array(t.String({ pattern: UUID_PATTERN }), { minItems: 1, maxItems: 100 }),
})

/**
 * Corpo de `POST /auth/admin/users` (criação pelo painel — fluxo CONVITE).
 * SEM senha: o serviço gera uma aleatória e envia o e-mail de definição.
 */
export const CreateUserBody = t.Object({
  email: t.String({ minLength: 3, maxLength: 320, pattern: EMAIL_PATTERN }),
  firstName: t.String({ minLength: 1, maxLength: 100 }),
  lastName: t.String({ minLength: 1, maxLength: 100 }),
  phone: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
  role: roleLiteral,
})

/** Corpo de `PATCH /auth/admin/users/:id`. Todos os campos são opcionais (edição parcial). */
export const UpdateUserBody = t.Object({
  role: t.Optional(roleLiteral),
  status: t.Optional(statusLiteral),
  firstName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  lastName: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
  phone: t.Optional(t.Union([t.String({ maxLength: 20 }), t.Null()])),
  // Concorrência otimista: a `version` que o cliente leu (rejeita edição defasada).
  version: t.Optional(t.Integer({ minimum: 0 })),
})
