import { safeEqual } from './safe-equal'

/** Valida o header `Authorization: Basic` contra usuário/senha do ambiente. */
export function checkBasicAuth(request: Request, user: string, password: string): boolean {
  const header = request.headers.get('authorization')
  if (!header?.startsWith('Basic ')) return false
  let decoded: string
  try {
    decoded = atob(header.slice(6))
  } catch {
    return false
  }
  const sep = decoded.indexOf(':')
  if (sep < 0) return false
  const u = decoded.slice(0, sep)
  const p = decoded.slice(sep + 1)
  // Avalia ambas as comparações sempre (sem short-circuit) p/ não vazar timing.
  const okUser = safeEqual(u, user)
  const okPass = safeEqual(p, password)
  return okUser && okPass
}

/** Resposta 401 que faz o browser abrir o prompt de Basic auth. */
export function basicAuthChallenge(): Response {
  return new Response('Autenticação necessária.', {
    status: 401,
    headers: { 'www-authenticate': 'Basic realm="admin"', 'cache-control': 'no-store' },
  })
}
