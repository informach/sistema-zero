import { type KidsSessionClaim, normalizePolicyPath } from '@sistemazero/core/security'

/**
 * Rotas que dispensam a prova da sessão do documento (`x-sz-session`) e valem para os DOIS
 * públicos. O beacon de erro de cliente sai também do `global-error` e de páginas sem a meta
 * da sessão; recusado, o erro da área dos pais nunca chegava ao Sentry. A mesma origem
 * continua obrigatória (anti-CSRF do proxy).
 */
export function kidsBffRouteSkipsSessionProof(rawPath: string, method: string): boolean {
  return method === 'POST' && normalizePolicyPath(rawPath) === '/api/client-error'
}

/** Superfície HTTP do app. Também cobre handlers que usam serviços por HMAC. */
export function kidsMayUseBff(
  kids: KidsSessionClaim,
  rawPath: string,
  method: string,
  subject: string,
): boolean {
  // Caminho canônico, como no Gateway: `//` e `%xx` não podem mudar de área.
  const pathname = normalizePolicyPath(rawPath)
  if (!pathname) return false
  if (kidsBffRouteSkipsSessionProof(pathname, method)) return true
  if (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/study/') ||
    pathname === '/api/onboarding/events'
  )
    return true
  if (pathname.startsWith('/api/profiles')) {
    return kids.kind === 'parent' || (method === 'PATCH' && pathname === `/api/profiles/${subject}`)
  }
  const parentOnly =
    pathname.startsWith('/api/parents/') ||
    pathname.startsWith('/api/payments/') ||
    pathname.startsWith('/api/helpdesk/portal/')
  return kids.kind === 'parent' ? parentOnly : !parentOnly
}
