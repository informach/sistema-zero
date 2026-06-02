import { t } from 'elysia'

const EMAIL_PATTERN = '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'

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
