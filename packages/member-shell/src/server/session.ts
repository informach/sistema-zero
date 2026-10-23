import 'server-only'
import { canonicalHmacMessage, parseKidsSessionClaim, signHmac } from '@sistemazero/core/security'
import {
  createRemoteJWKSet,
  decodeJwt,
  errors,
  type JWTVerifyGetKey,
  type JWTVerifyOptions,
  jwtVerify,
} from 'jose'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import { parseActClaim, parseProfileClaim } from '../lib/act'
import { expireCookieOptions, type SessionCookieNames } from '../lib/cookies'
import { getEnv, isProd } from '../lib/env'
import { learnerIdentity } from '../lib/learner-identity'
import type { SessionUser } from '../lib/types'

/** Par de tokens devolvido pelo @sistemazero/auth (via gateway). */
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
}

/** Resposta de mudança de capacidade: mantém o refresh vigente intacto. */
export interface AuthSessionAccessToken {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
}

/** Veredito da verificação ESTRITA (exp incluso) — p/ decisões de AUTORIZAÇÃO. */
export type AccessVerdict =
  | { ok: true; user: SessionUser }
  | { ok: false; expired: boolean; unavailable?: boolean }

export class SessionUnavailableError extends Error {
  constructor() {
    super('Não foi possível conferir a sessão agora. Tente novamente.')
  }
}

/** Módulo de sessão de um app (ver `createSessionModule`). */
export type SessionModule = ReturnType<typeof createSessionModule>

// JWKS remoto (RS256 do auth em PRODUÇÃO, via gateway) — singleton por processo
// no `globalThis` (Symbol.for): o Turbopack gera bundles separados (proxy/RSC/
// handlers) com cópias do módulo, e o factory ainda é chamado por wrapper de
// app — sem o registro global haveria um JWKS (com cache próprio) por cópia.
const JWKS_KEY = Symbol.for('@sistemazero/member-shell:jwks')

function remoteJwks(url: string): ReturnType<typeof createRemoteJWKSet> {
  const store = globalThis as Record<symbol, unknown>
  let jwks = store[JWKS_KEY] as ReturnType<typeof createRemoteJWKSet> | undefined
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(url))
    store[JWKS_KEY] = jwks
  }
  return jwks
}

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
    return remoteJwks(env.JWT_JWKS_URL)(protectedHeader, token)
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
  const { sub, email, firstName, lastName, role, status } = payload
  if (typeof sub !== 'string' || typeof role !== 'string' || typeof status !== 'string') return null
  const user: SessionUser = {
    id: sub,
    email: typeof email === 'string' ? email : '',
    firstName: typeof firstName === 'string' ? firstName : '',
    lastName: typeof lastName === 'string' ? lastName : '',
    role,
    status,
  }
  // Impersonação (suporte): a claim `act` identifica o ADMIN navegando como o
  // aluno — liga o banner e informa se mutações normais foram elevadas explicitamente.
  const act = parseActClaim(payload.act)
  if (act) user.act = act
  // Sessão de PERFIL (kids): a claim `pfl` traz a conta + nome do perfil ativo.
  const pfl = parseProfileClaim(payload.pfl)
  if (pfl) user.activeProfile = pfl
  if (payload.kids !== undefined) {
    const kids = parseKidsSessionClaim(payload.kids)
    if (!kids || act || (kids.kind === 'student') !== Boolean(pfl)) return null
    user.kids = kids
  }
  return user
}

const VALIDATE_PATH = '/auth/kids/session/validate'

/**
 * Credencial da conferência no Gateway. ⚠️ Assinada como o consumer `member-shell`: com o
 * principal HMAC ela sai do limite ANÔNIMO global por IP, que levava escolas e CGNAT (muitas
 * crianças no mesmo IP) a 429 → 503 no Kids inteiro. Sem `x-forwarded-for` na chamada
 * assinada, como as outras chamadas HMAC do BFF (o IP é conferido contra a CIDR do consumer).
 * Sem o segredo (dev), a chamada segue anônima e leva a prova de origem do aluno.
 */
async function validateHeaders(access: string): Promise<Record<string, string>> {
  const secret = getEnv().MEMBER_SHELL_HMAC_SECRET
  if (secret) {
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signHmac(
      secret,
      canonicalHmacMessage({ method: 'POST', path: VALIDATE_PATH, body: '' }),
      timestamp,
    )
    return {
      authorization: `Bearer ${access}`,
      'x-consumer-id': 'member-shell',
      'x-signature': `t=${timestamp},v1=${signature}`,
    }
  }
  const forwarded = (await headers()).get('x-forwarded-for')
  return {
    authorization: `Bearer ${access}`,
    ...(forwarded ? { 'x-forwarded-for': forwarded } : {}),
  }
}

// React deduplica somente dentro do render atual. Nunca guardar autorização
// entre requests: um responsável pode encerrar o acesso a qualquer momento.
const validateKidsAccess = cache(
  async (access: string): Promise<'valid' | 'invalid' | 'unavailable'> => {
    try {
      const res = await fetch(new URL(VALIDATE_PATH, getEnv().GATEWAY_URL), {
        method: 'POST',
        headers: await validateHeaders(access),
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      })
      if (res.ok) return 'valid'
      // ⚠️ Só o código do AUTH encerra a sessão. Um 401/403 do próprio Gateway (assinatura
      // ou consumer HMAC mal configurados) é falha de infraestrutura: tratado como
      // indisponível, recusa a chamada sem deslogar todas as crianças.
      const body = (await res.json().catch(() => null)) as { error?: { code?: unknown } } | null
      return res.status === 401 && body?.error?.code === 'KIDS_SESSION_INVALID'
        ? 'invalid'
        : 'unavailable'
    } catch {
      return 'unavailable'
    }
  },
)

/**
 * Verificação estrita de um access token (assinatura + exp + iss/aud). Diferente
 * do `getSession` do módulo (que tolera exp p/ EXIBIÇÃO — o gateway revalida toda
 * chamada de dados), esta é a régua de quem AUTORIZA localmente sem passar pelo
 * gateway (avatar→R2, downloads de material): token expirado aqui NÃO vale — o
 * chamador tenta UM refresh. Não depende de cookie → export plano.
 */
export async function verifyAccessToken(token: string): Promise<AccessVerdict> {
  const local = await verifyAccessTokenLocally(token)
  if (!local.ok) return local
  if (local.user.kids) {
    const validation = await validateKidsAccess(token)
    if (validation !== 'valid')
      return { ok: false, expired: false, unavailable: validation === 'unavailable' }
  }
  return local
}

/**
 * Só a parte LOCAL da verificação (assinatura + exp + forma das claims), sem perguntar ao
 * Auth se a sessão Kids foi encerrada. ⚠️ Vale apenas antes de uma chamada que o GATEWAY
 * confere de novo (ele introspecta toda sessão Kids, sem cache): conferir aqui também
 * dobrava as idas ao Auth sem ganho de revogação. Mídia, upload e chamadas HMAC/S2S, que
 * o Gateway não confere em nome da criança, seguem no `verifyAccessToken` completo.
 */
export async function verifyAccessTokenLocally(token: string): Promise<AccessVerdict> {
  try {
    const { payload } = await jwtVerify(token, verificationKey(), verifyOptions())
    const user = claimsToUser(payload)
    return user ? { ok: true, user } : { ok: false, expired: false }
  } catch (err) {
    return { ok: false, expired: err instanceof errors.JWTExpired }
  }
}

/**
 * Módulo de sessão parametrizado pelos NOMES DE COOKIE do app (a única variação
 * real entre community e community-kids no BFF). O factory é chamado no wrapper
 * `server/shell.ts` de cada app — cada bundle do Turbopack re-executa o wrapper
 * com a MESMA config estática; o estado compartilhado real (JWKS) vive em
 * `globalThis` dentro deste módulo.
 */
export function createSessionModule(
  cookieNames: SessionCookieNames,
  paletteCookie: string,
  audience: 'adult' | 'kids' = 'adult',
) {
  const { accessCookie, refreshCookie } = cookieNames

  /**
   * Sessão do aluno: lê o access JWT do cookie e o verifica (HS256 com o segredo
   * compartilhado em dev e/ou RS256 via JWKS do auth em produção — a chave é
   * escolhida pelo `alg` do token). Se o token expirou — a assinatura já foi
   * validada (jose checa assinatura ANTES do exp) — decodifica para exibição; as
   * chamadas de dados renovam via refresh-on-401 (ver `gateway.ts`). Assinatura
   * inválida → null.
   */
  async function getSession(): Promise<SessionUser | null> {
    const store = await cookies()
    const access = store.get(accessCookie)?.value
    const refresh = store.get(refreshCookie)?.value
    if (!access || !refresh) return null
    if (audience === 'kids') {
      const verdict = await verifyForApp(access)
      if (!verdict.ok && verdict.unavailable) throw new SessionUnavailableError()
      return verdict.ok ? verdict.user : null
    }
    try {
      const { payload } = await jwtVerify(access, verificationKey(), verifyOptions())
      const user = claimsToUser(payload)
      return learnerIdentity(user, 'adult') ? user : null
    } catch (err) {
      if (err instanceof errors.JWTExpired) {
        try {
          const user = claimsToUser(decodeJwt(access))
          return learnerIdentity(user, 'adult') ? user : null
        } catch {
          return null
        }
      }
      return null
    }
  }

  async function verifyForApp(access: string): Promise<AccessVerdict> {
    return forApp(await verifyAccessToken(access))
  }

  /** A régua do app sem a ida ao Auth: só antes de chamada que o Gateway confere. */
  async function verifyLocallyForApp(access: string): Promise<AccessVerdict> {
    return forApp(await verifyAccessTokenLocally(access))
  }

  function forApp(verdict: AccessVerdict): AccessVerdict {
    if (verdict.ok && audience === 'adult' && !learnerIdentity(verdict.user, 'adult')) {
      return { ok: false, expired: false }
    }
    // A sessão de suporte é uma capacidade separada, emitida pelo Admin.
    // Sessões Kids antigas sem contexto precisam entrar pelo novo fluxo.
    if (verdict.ok && audience === 'kids' && !verdict.user.kids && !verdict.user.act) {
      return { ok: false, expired: false }
    }
    return verdict
  }

  async function getAccessToken(): Promise<string | null> {
    return (await cookies()).get(accessCookie)?.value ?? null
  }

  async function getRefreshToken(): Promise<string | null> {
    return (await cookies()).get(refreshCookie)?.value ?? null
  }

  async function setSessionCookies(tokens: AuthTokens): Promise<void> {
    const store = await cookies()
    const base = { httpOnly: true, sameSite: 'lax' as const, secure: isProd(), path: '/' }
    // O access cookie persiste pela vida do refresh; o exp do JWT (curto) é o que
    // dispara o refresh-on-401 nas chamadas de dados.
    store.set(accessCookie, tokens.accessToken, { ...base, maxAge: tokens.refreshExpiresIn })
    store.set(refreshCookie, tokens.refreshToken, { ...base, maxAge: tokens.refreshExpiresIn })
  }

  async function setAccessCookie(tokens: AuthSessionAccessToken): Promise<void> {
    const store = await cookies()
    const base = { httpOnly: true, sameSite: 'lax' as const, secure: isProd(), path: '/' }
    // O refresh existente continua sendo a credencial da família. Regravar só o
    // access evita que retry de elevação invalide/rotacione a sessão.
    store.set(accessCookie, tokens.accessToken, { ...base, maxAge: tokens.refreshExpiresIn })
  }

  async function clearSessionCookies(): Promise<void> {
    const store = await cookies()
    // `set('', maxAge: 0)` com os MESMOS atributos da escrita — `delete()` pelado
    // não manda `Secure` e o browser REJEITA a remoção de um `__Host-*` em prod
    // (o cookie sobrevivia: logout não deslogava). Ver `expireCookieOptions`.
    store.set(accessCookie, '', expireCookieOptions(isProd()))
    store.set(refreshCookie, '', expireCookieOptions(isProd()))
    // ⚠️ O espelho da cor sai JUNTO. Ele é do DONO da sessão (o valor carrega o id), e o que o
    // proxy reconcilia é a área logada; fora dela quem lê o cookie é o layout, sem sessão para
    // conferir contra. Deixá-lo vivo faria a tela de login de um aparelho de família continuar
    // vestida com a cor de quem acabou de sair.
    store.set(paletteCookie, '', expireCookieOptions(isProd()))
  }

  return {
    audience,
    cookieNames,
    getSession,
    verifyAccessToken: verifyForApp,
    verifyAccessTokenLocally: verifyLocallyForApp,
    getAccessToken,
    getRefreshToken,
    setSessionCookies,
    setAccessCookie,
    clearSessionCookies,
  }
}
