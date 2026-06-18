import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { expireCookieOptions, prefixedCookieName } from '@/lib/cookies'
import { getSession } from '@/server/session'

/**
 * "Portão dos pais" do Kids — prova de SENHA do responsável para a Área dos pais
 * (gerir perfis, trocar a senha da conta, ver compras). O risco real: a CRIANÇA
 * entra numa sessão da CONTA (ex.: login por OTP no e-mail dos pais) e, sem este
 * portão, gerenciaria tudo. A prova vive num cookie HttpOnly CURTO (`sz_kids_parent`,
 * valor = id da conta) emitido SÓ após verificar a senha (`/api/parents/verify` na
 * sessão da conta, ou o `/api/profile-session/exit` que já valida a senha ao sair
 * do perfil). As mutações sensíveis exigem este cookie ALÉM da sessão da conta —
 * um clique no DOM não basta, a criança precisaria saber a senha.
 *
 * ⚠️ NÃO confundir com o auto-serviço da criança: numa sessão de PERFIL o
 * `requireParentGate` deixa passar (o auth restringe a edição ao PRÓPRIO perfil;
 * criar/arquivar/senha-da-conta já dão 403 no auth para sessão de perfil).
 */

const PROD = process.env.NODE_ENV === 'production'
const PARENT_COOKIE = prefixedCookieName('sz_kids_parent', PROD)
/** Janela curta: re-pedir a senha após 15 min de inatividade na gestão. */
const PARENT_TTL_SECONDS = 15 * 60

/** Emite o cookie do portão (após verificar a senha) — atado ao id da conta. */
export async function setParentVerified(accountId: string): Promise<void> {
  const store = await cookies()
  store.set(PARENT_COOKIE, accountId, {
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

/** Id da conta verificado no cookie (ou `null`). Leitura pura — vale em RSC. */
export async function readParentVerified(): Promise<string | null> {
  const store = await cookies()
  return store.get(PARENT_COOKIE)?.value ?? null
}

/** `true` quando a sessão da CONTA tem o portão aberto (cookie casa com o id). */
export async function isParentVerifiedFor(accountId: string): Promise<boolean> {
  const verified = await readParentVerified()
  return verified !== null && verified === accountId
}

type RouteHandler<Ctx> = (req: Request, ctx: Ctx) => Promise<Response> | Response

/**
 * Envolve um handler de gestão: sessão de PERFIL passa direto (auto-serviço da
 * criança, escopo travado no auth); sessão da CONTA exige o portão aberto. Sem
 * sessão → 401; conta sem o portão → 403 `PARENT_GATE_REQUIRED`.
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
