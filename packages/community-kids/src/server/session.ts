// Shim: a implementação vive no @sistemazero/member-shell (compartilhada com o
// community-kids), parametrizada pelos cookies deste app via `shell.ts`.
import { shell } from './shell'

export type { AccessVerdict, AuthTokens } from '@sistemazero/member-shell/server/session'

export const {
  getSession,
  verifyAccessToken,
  getAccessToken,
  getRefreshToken,
  setSessionCookies,
  clearSessionCookies,
} = shell.session
