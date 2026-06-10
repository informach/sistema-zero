/**
 * Nomes dos cookies de sessão DESTE app (fonte única — `session.ts` escreve,
 * `proxy.ts` lê/regrava): `sz_member_*`, com prefixo `__Host-` em prod. Os
 * HELPERS (prefixo/expiração) vivem no `@sistemazero/member-shell` — aqui ficam
 * só as 4 linhas de configuração por app (o kids usa `sz_kids_*`; compile-time
 * de propósito: cookies não escopam por porta em dev).
 */
import { sessionCookieNames } from '@sistemazero/member-shell/lib/cookies'

export {
  expireCookieOptions,
  prefixedCookieName,
} from '@sistemazero/member-shell/lib/cookies'

const PROD = process.env.NODE_ENV === 'production'

const names = sessionCookieNames('sz_member', PROD)
export const ACCESS_COOKIE = names.accessCookie
export const REFRESH_COOKIE = names.refreshCookie
