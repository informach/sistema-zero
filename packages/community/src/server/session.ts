import 'server-only'
import { decodeJwt, errors, type JWTVerifyOptions, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { getEnv, isProd } from '@/lib/env'
import type { SessionUser } from '@/lib/types'

const ACCESS_COOKIE = 'sz_member_access'
const REFRESH_COOKIE = 'sz_member_refresh'

/** Par de tokens devolvido pelo @sistemazero/auth (via gateway). */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().JWT_HS256_SECRET)
}

function verifyOptions(): JWTVerifyOptions {
  const env = getEnv()
  const opts: JWTVerifyOptions = { algorithms: ['HS256'] }
  if (env.JWT_ISSUER) opts.issuer = env.JWT_ISSUER
  if (env.JWT_AUDIENCE) opts.audience = env.JWT_AUDIENCE
  return opts
}

function claimsToUser(payload: Record<string, unknown>): SessionUser | null {
  const { sub, email, firstName, lastName, role, status } = payload
  if (typeof sub !== 'string' || typeof role !== 'string' || typeof status !== 'string') return null
  return {
    id: sub,
    email: typeof email === 'string' ? email : '',
    firstName: typeof firstName === 'string' ? firstName : '',
    lastName: typeof lastName === 'string' ? lastName : '',
    role,
    status,
  }
}

/**
 * Sessão do aluno: lê o access JWT do cookie e o verifica (assinatura HS256 com o
 * MESMO segredo do auth/gateway). Se o token expirou — a assinatura já foi validada
 * (jose checa assinatura ANTES do exp) — decodifica para exibição; as chamadas de
 * dados renovam via refresh-on-401 (ver `gateway.ts`). Assinatura inválida → null.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const access = store.get(ACCESS_COOKIE)?.value
  const refresh = store.get(REFRESH_COOKIE)?.value
  if (!access || !refresh) return null
  try {
    const { payload } = await jwtVerify(access, secretKey(), verifyOptions())
    return claimsToUser(payload)
  } catch (err) {
    if (err instanceof errors.JWTExpired) {
      try {
        return claimsToUser(decodeJwt(access))
      } catch {
        return null
      }
    }
    return null
  }
}

export async function getAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null
}

export async function setSessionCookies(tokens: AuthTokens): Promise<void> {
  const store = await cookies()
  const base = { httpOnly: true, sameSite: 'lax' as const, secure: isProd(), path: '/' }
  // O access cookie persiste pela vida do refresh; o exp do JWT (curto) é o que
  // dispara o refresh-on-401 nas chamadas de dados.
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: tokens.refreshExpiresIn })
  store.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: tokens.refreshExpiresIn })
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}
