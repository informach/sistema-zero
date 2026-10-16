import 'server-only'
import { parseDesktopSessionClaim } from '@sistemazero/core/security'
import {
  createRemoteJWKSet,
  errors,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
  jwtVerify,
} from 'jose'
import { cookies } from 'next/headers'
import {
  ACCESS_COOKIE,
  BROWSER_COOKIE,
  DESKTOP_COOKIE,
  expireCookieOptions,
  REFRESH_COOKIE,
} from '@/lib/cookies'
import { getEnv, isProd } from '@/lib/env'
import type { SessionUser } from '@/lib/types'
import { requestBrowserAccess } from './browser-session'
import { requestDesktopAccess } from './desktop-session'

/** Par de tokens devolvido pelo @sistemazero/auth (via gateway). */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
}

// JWKS remoto (RS256 do auth em PRODUÇÃO, via gateway) — singleton por processo;
// o jose cuida do cache/cooldown/rotação das chaves.
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined

/**
 * Chave de verificação escolhida pelo `alg` do token (espelha a jwt.strategy do
 * gateway): HS* → segredo compartilhado (dev/local); assimétrico → JWKS do auth
 * (produção emite RS256 — não existe segredo HS256 lá). Os algoritmos aceitos
 * são PINADOS ao que está configurado (anti alg-confusion/downgrade).
 */
function verificationKey(): JWTVerifyGetKey {
  const env = getEnv()
  const secret = env.JWT_HS256_SECRET ? new TextEncoder().encode(env.JWT_HS256_SECRET) : undefined
  return (protectedHeader, token) => {
    if ((protectedHeader.alg ?? '').startsWith('HS')) {
      if (!secret) throw new Error('Token HS256 mas JWT_HS256_SECRET não configurado')
      return Promise.resolve(secret)
    }
    if (!env.JWT_JWKS_URL) throw new Error('Token assimétrico mas JWT_JWKS_URL não configurado')
    jwks ??= createRemoteJWKSet(new URL(env.JWT_JWKS_URL))
    return jwks(protectedHeader, token)
  }
}

function verifyOptions(): JWTVerifyOptions {
  const env = getEnv()
  const algorithms: string[] = []
  if (env.JWT_JWKS_URL) algorithms.push('RS256')
  if (env.JWT_HS256_SECRET) algorithms.push('HS256')
  const opts: JWTVerifyOptions = { algorithms }
  if (env.JWT_ISSUER) opts.issuer = env.JWT_ISSUER
  if (env.JWT_AUDIENCE) opts.audience = env.JWT_AUDIENCE
  return opts
}

function claimsToUser(payload: Record<string, unknown>): SessionUser | null {
  // Pina o TIPO do token: só `typ: 'access'` autoriza (espelha o `toClaims` do
  // auth). Hoje o access JWT é o único assinado pela chave, mas um JWT futuro de
  // outro tipo (ex.: verificação de e-mail) assinado pela MESMA chave — com mesmo
  // iss/aud — não pode ser replayado p/ passar no gate de UI local.
  if (payload.typ !== 'access') return null
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

/** Resolve the revocable app session and strictly verify a newly issued access.
 * Old rotating browser cookies require one new login; reads never rotate cookies. */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const desktop = store.get(DESKTOP_COOKIE)?.value
  if (desktop) {
    const access = await requestDesktopAccess(desktop)
    if (!access.ok) {
      if (access.status >= 500 || access.status === 429)
        throw new Error('Servidor de identidade temporariamente indisponível')
      return null
    }
    const verified = await verifyAccessToken(access.accessToken)
    return verified.ok ? verified.user : null
  }
  const browser = store.get(BROWSER_COOKIE)?.value
  if (!browser) return null
  const access = await requestBrowserAccess(browser)
  if (!access.ok) {
    if (access.status >= 500 || access.status === 429)
      throw new Error('Servidor de identidade temporariamente indisponível')
    return null
  }
  const verified = await verifyAccessToken(access.accessToken)
  return verified.ok ? verified.user : null
}

/** Veredito da verificação ESTRITA (exp incluso) — p/ decisões de AUTORIZAÇÃO. */
export type AccessVerdict = { ok: true; user: SessionUser } | { ok: false; expired: boolean }

/**
 * Verificação estrita de um access token (assinatura + exp + iss/aud). Diferente
 * de uma simples decodificação, assinatura, emissor, audiência e expiração são
 * obrigatórios. As sessões web/desktop resolvem acesso novo antes desta validação.
 */
export async function verifyAccessToken(token: string): Promise<AccessVerdict> {
  try {
    const { payload } = await jwtVerify(token, verificationKey(), verifyOptions())
    const user = claimsToUser(payload)
    return user ? { ok: true, user } : { ok: false, expired: false }
  } catch (err) {
    return { ok: false, expired: err instanceof errors.JWTExpired }
  }
}
export async function verifyDesktopBinding(
  token: string,
  expected: { userId: string; deviceId: string },
) {
  try {
    const { payload } = await jwtVerify(token, verificationKey(), verifyOptions())
    const desktop = parseDesktopSessionClaim(payload.desktop)
    return (
      payload.typ === 'access' &&
      payload.sub === expected.userId &&
      desktop?.deviceId === expected.deviceId &&
      !payload.kids &&
      !payload.act &&
      !payload.profile
    )
  } catch {
    return false
  }
}

export async function getRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies()
  // `set('', maxAge: 0)` com os MESMOS atributos da escrita — `delete()` pelado
  // não manda `Secure` e o browser REJEITA a remoção de um `__Host-*` em prod
  // (o cookie sobrevivia: logout não deslogava). Ver `expireCookieOptions`.
  store.set(ACCESS_COOKIE, '', expireCookieOptions(isProd()))
  store.set(REFRESH_COOKIE, '', expireCookieOptions(isProd()))
  store.set(DESKTOP_COOKIE, '', expireCookieOptions(isProd()))
  store.set(BROWSER_COOKIE, '', expireCookieOptions(isProd()))
}

export async function setDesktopSessionCookie(credential: string, expiresAt: string) {
  await setStableSessionCookie(DESKTOP_COOKIE, credential, expiresAt)
}

async function setStableSessionCookie(name: string, credential: string, expiresAt: string) {
  await clearSessionCookies()
  const store = await cookies()
  store.set(name, credential, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(),
    path: '/',
    expires: new Date(expiresAt),
  })
}

export async function setBrowserSessionCookie(credential: string, expiresAt: string) {
  await setStableSessionCookie(BROWSER_COOKIE, credential, expiresAt)
}
