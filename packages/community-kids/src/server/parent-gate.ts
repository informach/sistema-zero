import 'server-only'
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { expireCookieOptions, prefixedCookieName } from '@/lib/cookies'
import { getSession } from '@/server/session'

/**
 * "Portão dos pais" do Kids — prova de SENHA do responsável para a Área dos pais
 * (gerir perfis, trocar a senha da conta, ver compras). O risco real: a CRIANÇA
 * entra numa sessão da CONTA (ex.: login por OTP no e-mail dos pais) e, sem este
 * portão, gerenciaria tudo. A prova vive num cookie HttpOnly CURTO (`sz_kids_parent`,
 * um TOKEN ASSINADO `accountId.HMAC`) emitido SÓ após verificar a senha
 * (`/api/parents/verify` na sessão da conta, ou o `/api/profile-session/exit` que já
 * valida a senha ao sair do perfil). As mutações sensíveis exigem este cookie ALÉM da
 * sessão da conta — um clique no DOM não basta, a criança precisaria saber a senha.
 *
 * ⚠️ O cookie é ASSINADO (HMAC), não o accountId pelado: o accountId não é segredo
 * (vai na claim `pfl`, em S2S, em logs), então um valor em texto puro degradaria o
 * portão para "quem sabe o accountId, abre". Com HMAC sobre um segredo de servidor,
 * só quem PROVOU a senha emite um token válido, mesmo que o accountId vaze.
 *
 * ⚠️ NÃO confundir com o auto-serviço da criança: numa sessão de PERFIL o
 * `requireParentGate` deixa passar (o auth restringe a edição ao PRÓPRIO perfil;
 * criar/arquivar/senha-da-conta já dão 403 no auth para sessão de perfil).
 */

const PROD = process.env.NODE_ENV === 'production'
const PARENT_COOKIE = prefixedCookieName('sz_kids_parent', PROD)
/** Janela curta: re-pedir a senha após 15 min de inatividade na gestão. */
const PARENT_TTL_SECONDS = 15 * 60

/**
 * Segredo de assinatura do portão — aleatório POR PROCESSO, em `globalThis` via
 * `Symbol.for` (réplica única; o Turbopack dá cópias próprias do módulo a
 * proxy/RSC/handlers, então um `const` de escopo de módulo divergiria entre eles —
 * mesmo gotcha do estado compartilhado do member-shell). Reiniciar invalida portões
 * abertos → re-pede a senha (aceitável: TTL é 15 min). Sem env nova.
 */
const SECRET_KEY = Symbol.for('sz.kids.parentGate.secret')
function gateSecret(): Buffer {
  const g = globalThis as { [SECRET_KEY]?: Buffer }
  if (!g[SECRET_KEY]) g[SECRET_KEY] = randomBytes(32)
  return g[SECRET_KEY]
}

/** Assinatura HMAC-SHA256 do accountId (hex). */
function sign(accountId: string): string {
  return createHmac('sha256', gateSecret()).update(accountId).digest('hex')
}

/** Verifica o token `accountId.HMAC` contra o accountId esperado (timing-safe). */
function verifyToken(value: string, accountId: string): boolean {
  const dot = value.lastIndexOf('.')
  if (dot <= 0 || value.slice(0, dot) !== accountId) return false
  const sig = Buffer.from(value.slice(dot + 1), 'hex')
  const expected = Buffer.from(sign(accountId), 'hex')
  return sig.length === expected.length && timingSafeEqual(sig, expected)
}

/** Emite o cookie do portão (após verificar a senha) — token assinado p/ a conta. */
export async function setParentVerified(accountId: string): Promise<void> {
  const store = await cookies()
  store.set(PARENT_COOKIE, `${accountId}.${sign(accountId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: PROD,
    path: '/',
    maxAge: PARENT_TTL_SECONDS,
  })
}

/** Revoga o portão (ex.: ao sair da gestão / logout). */
export async function clearParentVerified(): Promise<void> {
  const store = await cookies()
  store.set(PARENT_COOKIE, '', expireCookieOptions(PROD))
}

/** Token bruto do cookie do portão (ou `null`). Leitura pura — vale em RSC. */
async function readParentToken(): Promise<string | null> {
  const store = await cookies()
  return store.get(PARENT_COOKIE)?.value ?? null
}

/** `true` quando a sessão da CONTA tem o portão aberto (token assinado válido p/ o id). */
export async function isParentVerifiedFor(accountId: string): Promise<boolean> {
  const token = await readParentToken()
  return token !== null && verifyToken(token, accountId)
}

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response

/**
 * Envolve um handler de gestão: sessão de PERFIL passa direto (auto-serviço da
 * criança, escopo travado no auth); sessão da CONTA exige o portão aberto. Sem
 * sessão → 401; conta sem o portão → 403 `PARENT_GATE_REQUIRED`.
 *
 * ⚠️ Use SÓ em recursos que o auth/backend já restringe ao PRÓPRIO perfil em
 * sessão de perfil (ex.: children-stats — o members re-autoriza por `account_id`
 * e devolve vazio p/ a criança). Para recursos escopados por outra chave que a
 * sessão de perfil HERDA da conta (ex.: `/payments/my`, filtrado por e-MAIL — o
 * token de perfil mantém o e-mail do responsável), use `requireParentGateAccountOnly`:
 * deixar a criança passar vazaria o dado do responsável.
 */
export function requireParentGate<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req: Request, ctx: Ctx) => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
    }
    // Sessão de perfil (a criança): o auth já restringe ao próprio perfil.
    if (session.activeProfile) return handler(req, ctx)
    // Sessão da conta: exige a senha verificada recentemente (portão aberto).
    if (!(await isParentVerifiedFor(session.id))) {
      return NextResponse.json({ error: { code: 'PARENT_GATE_REQUIRED' } }, { status: 403 })
    }
    return handler(req, ctx)
  }
}

/**
 * Variante ESTRITA: exige sessão da CONTA com o portão aberto e RECUSA a sessão
 * de perfil (403 `ACCOUNT_SESSION_REQUIRED`). É o gate correto p/ dado do
 * responsável que a criança herda da conta no token (e-mail → "minhas compras"):
 * o `requireParentGate` deixaria a criança passar (premissa "o auth restringe ao
 * perfil" só vale p/ recursos keyados no perfil, NÃO no e-mail/conta).
 */
export function requireParentGateAccountOnly<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req: Request, ctx: Ctx) => {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 })
    }
    // A criança (sessão de perfil) NÃO acessa o histórico financeiro do responsável.
    if (session.activeProfile) {
      return NextResponse.json({ error: { code: 'ACCOUNT_SESSION_REQUIRED' } }, { status: 403 })
    }
    if (!(await isParentVerifiedFor(session.id))) {
      return NextResponse.json({ error: { code: 'PARENT_GATE_REQUIRED' } }, { status: 403 })
    }
    return handler(req, ctx)
  }
}

/**
 * Envolve o `profile-session/exit`: ao sair do perfil com SUCESSO (a senha já foi
 * validada no auth), abre o portão p/ a conta — assim a gestão não pede a senha
 * de novo logo em seguida. O id da conta vem da claim `pfl` da sessão de perfil.
 */
export function withParentVerifiedOnExit<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req: Request, ctx: Ctx) => {
    const pre = await getSession()
    const accountId = pre?.activeProfile?.accountId ?? null
    const res = await handler(req, ctx)
    if (res.ok && accountId) await setParentVerified(accountId)
    return res
  }
}

/**
 * Envolve o `auth/logout`: ao sair da conta, REVOGA o portão dos pais. O cookie
 * `sz_kids_parent` sobreviveria ao logout — atado ao accountId, não vaza p/ OUTRA
 * conta, mas a MESMA conta reentrada dentro da janela de 15 min (ex.: a criança
 * loga por OTP no e-mail dos pais num dispositivo compartilhado) herdaria a gestão
 * ABERTA sem provar a senha. Logout deve fechar o portão. Limpa SEMPRE (idempotente,
 * mesmo se o logout falhar).
 */
export function withParentClearedOnLogout<Ctx>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (req: Request, ctx: Ctx) => {
    const res = await handler(req, ctx)
    await clearParentVerified()
    return res
  }
}

/**
 * Envolve o `auth/me/password` (troca de senha da CONTA): ao trocar com SUCESSO, o
 * auth revoga TODAS as sessões e o handler limpa os cookies de sessão — mas o portão
 * (`sz_kids_parent`, atado ao accountId, 15 min) sobreviveria. A MESMA conta reentrada
 * dentro da janela herdaria a gestão ABERTA sem reprovar a senha NOVA. Fecha o portão
 * no sucesso (espelha o `withParentClearedOnLogout`; em falha mantém — o pai segue
 * gerindo sem reprovar a senha à toa).
 */
export function withParentClearedOnPasswordChange<Ctx>(
  handler: RouteHandler<Ctx>,
): RouteHandler<Ctx> {
  return async (req: Request, ctx: Ctx) => {
    const res = await handler(req, ctx)
    if (res.ok) await clearParentVerified()
    return res
  }
}
