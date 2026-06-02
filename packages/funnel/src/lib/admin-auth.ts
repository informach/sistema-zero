// Sessão de admin ancorada no IdP (@sistemazero/auth) via gateway. O funil NÃO
// emite nem assina tokens: guarda o access+refresh do auth em cookies HttpOnly e
// valida CADA request chamando `GET /auth/me` (a autoridade é o auth). server-only:
// NUNCA importe de uma ilha React (fala com o gateway). Trabalha com Request/Set-Cookie
// crus (espelha `lib/lead-session.ts`) p/ manter os handlers testáveis sem subir o Astro.

import type { AuthTokens, AuthUser, GatewayClient } from './gateway-client'

export const ADMIN_ACCESS_COOKIE = 'admin_access'
export const ADMIN_REFRESH_COOKIE = 'admin_refresh'

/** Papéis do auth que podem acessar o painel do funil. */
const ADMIN_ROLES = new Set(['admin', 'superadmin'])

/** Conta de admin válida: papel autorizado + status ativo. */
export function isAdminUser(user: AuthUser | undefined): user is AuthUser {
  return !!user && ADMIN_ROLES.has(user.role) && user.status === 'active'
}

function cookie(name: string, value: string, maxAge: number, secure: boolean): string {
  const base = `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  return secure ? `${base}; Secure` : base
}

/** Set-Cookie do par access+refresh (cada um com o TTL do próprio auth). */
export function adminSessionCookies(tokens: AuthTokens, secure: boolean): string[] {
  return [
    cookie(ADMIN_ACCESS_COOKIE, tokens.accessToken, tokens.expiresIn, secure),
    cookie(ADMIN_REFRESH_COOKIE, tokens.refreshToken, tokens.refreshExpiresIn, secure),
  ]
}

/** Set-Cookie que apaga a sessão de admin (logout). */
export function clearAdminCookies(secure: boolean): string[] {
  return [cookie(ADMIN_ACCESS_COOKIE, '', 0, secure), cookie(ADMIN_REFRESH_COOKIE, '', 0, secure)]
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null
  }
  return null
}

async function meUser(gateway: GatewayClient, accessToken: string): Promise<AuthUser | undefined> {
  const { status, body } = await gateway.getMe(accessToken)
  if (status !== 200) return undefined
  return (body as { user?: AuthUser }).user
}

export interface AdminAuth {
  user: AuthUser
  /** Set-Cookie a aplicar na resposta quando a sessão foi renovada via refresh. */
  setCookies?: string[]
}

/**
 * Valida a sessão de admin: usa o access token; se ausente/expirado, troca o refresh
 * por um par novo (rotação no auth) e revalida. Devolve o usuário (se for admin ativo)
 * e, quando renovou, os Set-Cookie a aplicar. `null` = sem acesso (→ 401/redirect).
 */
export async function resolveAdmin(
  request: Request,
  gateway: GatewayClient,
  secure: boolean,
): Promise<AdminAuth | null> {
  const access = readCookie(request, ADMIN_ACCESS_COOKIE)
  if (access) {
    const user = await meUser(gateway, access)
    // Autenticado: admin → ok; não-admin → barra (não adianta tentar refresh).
    if (user) return isAdminUser(user) ? { user } : null
    // `undefined` = access expirado/inválido → tenta o refresh abaixo.
  }
  const refresh = readCookie(request, ADMIN_REFRESH_COOKIE)
  if (!refresh) return null
  const refreshed = await gateway.refreshAuth(refresh)
  if (refreshed.status !== 200) return null
  const tokens = (refreshed.body as { tokens?: AuthTokens }).tokens
  if (!tokens) return null
  const user = await meUser(gateway, tokens.accessToken)
  if (!isAdminUser(user)) return null
  return { user, setCookies: adminSessionCookies(tokens, secure) }
}
