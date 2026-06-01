// Sessão de admin via cookie HttpOnly assinado (substitui o HTTP Basic Auth).
// Token = "<exp>.<hmac>" onde hmac = signHmac(secret, 'admin', exp). server-only:
// NUNCA importe de uma ilha React (usa segredo + node:crypto). Trabalhamos com
// Request/Set-Cookie crus (espelha `lib/lead-session.ts`) p/ manter os handlers
// testáveis sem subir o Astro.

import { signHmac } from '@sistemazero/core/security'
import { safeEqual } from './safe-equal'

export const ADMIN_COOKIE = 'admin_session'
const TTL_SECONDS = 60 * 60 * 12 // 12 horas

function sign(secret: string, exp: number): string {
  // signHmac assina "<ts>.<body>" → aqui "<exp>.admin". Determinístico por (secret, exp).
  return signHmac(secret, 'admin', exp)
}

/** Cria o `Set-Cookie` da sessão de admin (token assinado, expira em 12h). */
export function createAdminSessionCookie(
  secret: string,
  secure: boolean,
  nowSeconds?: number,
): string {
  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  const exp = now + TTL_SECONDS
  const token = `${exp}.${sign(secret, exp)}`
  const base = `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TTL_SECONDS}`
  return secure ? `${base}; Secure` : base
}

/** `Set-Cookie` que apaga a sessão de admin (logout). */
export function clearAdminSessionCookie(secure: boolean): string {
  const base = `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  return secure ? `${base}; Secure` : base
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim() || null
  }
  return null
}

/** Verifica a sessão de admin do cookie: assinatura timing-safe + não expirada. */
export function verifyAdminSession(request: Request, secret: string, nowSeconds?: number): boolean {
  const token = readCookie(request, ADMIN_COOKIE)
  if (!token) return false
  const dot = token.indexOf('.')
  if (dot < 0) return false
  const exp = Number(token.slice(0, dot))
  if (!Number.isFinite(exp)) return false
  const now = nowSeconds ?? Math.floor(Date.now() / 1000)
  if (now >= exp) return false
  return safeEqual(token.slice(dot + 1), sign(secret, exp))
}
