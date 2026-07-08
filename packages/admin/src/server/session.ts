import 'server-only'
import {
  createRemoteJWKSet,
  decodeJwt,
  errors,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
  jwtVerify,
} from 'jose'
import { cookies } from 'next/headers'
import { ACCESS_COOKIE, expireCookieOptions, REFRESH_COOKIE } from '@/lib/cookies'
import { getEnv, isProd } from '@/lib/env'
import type { SessionUser } from '@/lib/types'

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
  // iss/aud — não pode ser replayado p/ autorizar a sessão LOCAL de `/api/media/*`.
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

/**
 * Sessão do painel: lê o access JWT do cookie e o verifica (HS256 com o segredo
 * compartilhado em dev e/ou RS256 via JWKS do auth em produção — a chave é
 * escolhida pelo `alg` do token). Se o token expirou — a assinatura já foi validada
 * (jose checa assinatura ANTES do exp) — decodifica para exibição; as chamadas de
 * dados renovam via refresh-on-401 (ver `gateway.ts`). Assinatura inválida → null.
 */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const access = store.get(ACCESS_COOKIE)?.value
  const refresh = store.get(REFRESH_COOKIE)?.value
  if (!access || !refresh) return null
  return sessionUserFromToken(access)
}

/**
 * O MESMO veredito tolerante-a-exp do `getSession`, mas sobre um token dado —
 * p/ contextos sem `cookies()` do next/headers (o gate de seção do `proxy.ts`
 * lê o cookie do request). A tolerância é segura: o jose valida a ASSINATURA
 * antes do exp, então o decode pós-`JWTExpired` é de um token autêntico. Serve
 * p/ decisão de UI (qual seção o papel vê) — dados são revalidados no gateway.
 */
export async function sessionUserFromToken(access: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(access, verificationKey(), verifyOptions())
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

/** Veredito da verificação ESTRITA (exp incluso) — p/ decisões de AUTORIZAÇÃO. */
export type AccessVerdict = { ok: true; user: SessionUser } | { ok: false; expired: boolean }

/**
 * Verificação estrita de um access token (assinatura + exp + iss/aud). Diferente
 * de `getSession` (que tolera exp p/ EXIBIÇÃO — o gateway revalida toda chamada
 * de dados), esta é a régua de quem AUTORIZA localmente sem passar pelo gateway
 * (`/api/media/*`): token expirado aqui NÃO vale — o chamador tenta UM refresh.
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
  // `set('', maxAge: 0)` com os MESMOS atributos da escrita — `delete()` pelado
  // não manda `Secure` e o browser REJEITA a remoção de um `__Host-*` em prod
  // (o cookie sobrevivia: logout não deslogava). Ver `expireCookieOptions`.
  store.set(ACCESS_COOKIE, '', expireCookieOptions(isProd()))
  store.set(REFRESH_COOKIE, '', expireCookieOptions(isProd()))
}
