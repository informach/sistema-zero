import { t } from 'elysia'
import { USER_ROLES } from '../../domain/user/user.role'
import { USER_STATUSES } from '../../domain/user/user.status'

const EMAIL_PATTERN = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'

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

/** Query de `GET /auth/admin/users` (listagem paginada do painel). */
export const ListUsersQuery = t.Object({
  q: t.Optional(t.String({ maxLength: 320 })),
  role: t.Optional(roleLiteral),
  status: t.Optional(statusLiteral),
  // t.Numeric coage a string da query string para número.
  limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Numeric({ minimum: 0 })),
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
