/**
 * Nomes dos cookies de sessão DESTE app (fonte única — `session.ts` escreve,
 * `proxy.ts` lê/regrava): `sz_kids_*`, com prefixo `__Host-` em prod. Os
 * HELPERS (prefixo/expiração) vivem no `@sistemazero/member-shell` — aqui ficam
 * só as 4 linhas de configuração por app. ⚠️ `sz_kids` ≠ `sz_member` é
 * compile-time DE PROPÓSITO: cookies não escopam por porta em dev — é o que
 * permite logar no community (:3007) e no kids (:3008) ao mesmo tempo.
 */
import { sessionCookieNames } from '@sistemazero/member-shell/lib/cookies'

export {
  expireCookieOptions,
  prefixedCookieName,
} from '@sistemazero/member-shell/lib/cookies'

const PROD = process.env.NODE_ENV === 'production'

const names = sessionCookieNames('sz_kids', PROD)
export const ACCESS_COOKIE = names.accessCookie
export const REFRESH_COOKIE = names.refreshCookie
