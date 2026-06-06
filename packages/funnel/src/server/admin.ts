import type { FunnelRepo } from '../db/repo'
import {
  ADMIN_REFRESH_COOKIE,
  adminSessionCookies,
  clearAdminCookies,
  isAdminUser,
  readCookie,
  resolveAdmin,
} from '../lib/admin-auth'
import { AdminLoginSchema } from '../lib/admin-schema'
import type { AuthTokens, AuthUser, GatewayClient } from '../lib/gateway-client'
import { json, jsonError, safeJson } from '../lib/http'

export interface AdminDeps {
  repo: FunnelRepo
  /** Cliente do gateway → auth (login/me/refresh/logout). */
  gateway: GatewayClient
  /** `Secure` nos cookies (true em produção/HTTPS). */
  secureCookie: boolean
}

/** Monta um `HeadersInit` (array) com headers base + Set-Cookie da renovação. */
function withSession(base: Record<string, string>, setCookies?: string[]): [string, string][] {
  const headers: [string, string][] = Object.entries(base)
  if (setCookies) for (const c of setCookies) headers.push(['set-cookie', c])
  return headers
}

/** As 14 etapas do funil (landing + 10 perguntas + resultado + vendas + checkout)
 *  e os 2 marcos de pagamento. */
export const FUNNEL_STEPS: { name: string; label: string }[] = [
  { name: 'entrou_landing', label: 'Entrou na landing' },
  { name: 'respondeu_pergunta_1', label: 'Pergunta 1 (segmento)' },
  { name: 'respondeu_pergunta_2', label: 'Pergunta 2 (gasto)' },
  { name: 'respondeu_pergunta_3', label: 'Pergunta 3 (como cria)' },
  { name: 'respondeu_pergunta_4', label: 'Pergunta 4 (já quebrou)' },
  { name: 'respondeu_pergunta_5', label: 'Pergunta 5 (refém)' },
  { name: 'respondeu_pergunta_6', label: 'Pergunta 6 (calculadora)' },
  { name: 'respondeu_pergunta_7', label: 'Pergunta 7 (peso)' },
  { name: 'respondeu_pergunta_8', label: 'Pergunta 8 (visualização)' },
  { name: 'respondeu_pergunta_9', label: 'Pergunta 9 (o que falta)' },
  { name: 'respondeu_pergunta_10', label: 'Pergunta 10 (mudança)' },
  { name: 'viu_resultado', label: 'Viu o resultado' },
  { name: 'viu_pagina_vendas', label: 'Página de vendas' },
  { name: 'abriu_checkout', label: 'Abriu o checkout' },
  { name: 'pagamento_iniciado', label: 'Pagamento iniciado' },
  { name: 'pagamento_confirmado', label: 'Pagamento confirmado' },
]

/**
 * POST /api/admin/login — autentica no auth (IdP) via gateway e abre a sessão. Só
 * conta com papel admin/superadmin e status ativo entra no painel (senão 403). Os
 * tokens (access+refresh) viram cookies HttpOnly — o funil não guarda segredo.
 */
export async function adminLogin(request: Request, deps: AdminDeps): Promise<Response> {
  const parsed = AdminLoginSchema.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Dados inválidos.', 400, 'BAD_REQUEST')
  const { status, body } = await deps.gateway.loginAuth(parsed.data.email, parsed.data.password)
  if (status !== 200) return jsonError('E-mail ou senha inválidos.', 401, 'UNAUTHORIZED')
  const { user, tokens } = body as { user?: AuthUser; tokens?: AuthTokens }
  if (!user || !tokens) {
    return jsonError('Resposta inválida do servidor de identidade.', 502, 'AUTH_ERROR')
  }
  if (!isAdminUser(user)) {
    return jsonError('Sua conta não tem acesso ao painel.', 403, 'FORBIDDEN')
  }
  return json(
    { ok: true },
    200,
    withSession({ 'cache-control': 'no-store' }, adminSessionCookies(tokens, deps.secureCookie)),
  )
}

/** POST /api/admin/logout — revoga o refresh no auth (best-effort) e limpa os cookies. */
export async function adminLogout(request: Request, deps: AdminDeps): Promise<Response> {
  const refresh = readCookie(request, ADMIN_REFRESH_COOKIE)
  if (refresh) {
    try {
      await deps.gateway.logoutAuth(refresh)
    } catch {
      /* a revogação é best-effort; os cookies são limpos de qualquer forma */
    }
  }
  return json(
    { ok: true },
    200,
    withSession({ 'cache-control': 'no-store' }, clearAdminCookies(deps.secureCookie)),
  )
}

/** Tamanho de página padrão e teto da listagem de leads. */
const LEADS_PAGE_SIZE = 25
const LEADS_MAX_LIMIT = 100

/** Lê um inteiro ≥ 0 da query (NaN/negativo → fallback). */
function intParam(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/**
 * GET /api/admin/leads — página de leads (mais recentes primeiro), com busca e
 * ordenação no SERVIDOR (valem sobre TODOS os leads, não só a página atual).
 * Query: `limit` (1..100, default 25), `offset`, `q` (nome/e-mail), `sort` (asc|desc).
 * Resposta: `{ leads, total, limit, offset }` — `total` alimenta a paginação da UI.
 */
export async function adminLeads(request: Request, deps: AdminDeps): Promise<Response> {
  const auth = await resolveAdmin(request, deps.gateway, deps.secureCookie)
  if (!auth) return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')

  const params = new URL(request.url).searchParams
  const limit = Math.min(
    LEADS_MAX_LIMIT,
    Math.max(1, intParam(params.get('limit'), LEADS_PAGE_SIZE)),
  )
  // Tetos defensivos: offset gigante vira scan inútil no Postgres; q sem cap
  // vira um pattern ILIKE arbitrariamente caro.
  const offset = Math.min(intParam(params.get('offset'), 0), 100_000)
  const q = params.get('q')?.trim().slice(0, 100) || undefined
  const sort = params.get('sort') === 'asc' ? 'asc' : 'desc'

  const [leads, total] = await Promise.all([
    deps.repo.listLeads(limit, offset, { q, sort }),
    deps.repo.countLeads(q),
  ])
  return json(
    { leads, total, limit, offset },
    200,
    withSession({ 'cache-control': 'no-store' }, auth.setCookies),
  )
}

/** GET /api/admin/funnel — contagem e conversão por etapa. */
export async function adminFunnel(request: Request, deps: AdminDeps): Promise<Response> {
  const auth = await resolveAdmin(request, deps.gateway, deps.secureCookie)
  if (!auth) return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  const counts = await deps.repo.eventCounts()
  const byName = new Map(counts.map((c) => [c.eventName, c.leads]))
  const top = byName.get('entrou_landing') ?? 0

  let prev = 0
  const steps = FUNNEL_STEPS.map((step, i) => {
    const count = byName.get(step.name) ?? 0
    const fromTop = top > 0 ? count / top : 0
    const fromPrev = i === 0 ? 1 : prev > 0 ? count / prev : 0
    prev = count
    return { name: step.name, label: step.label, count, fromTop, fromPrev }
  })

  return json(
    { total: top, steps },
    200,
    withSession({ 'cache-control': 'no-store' }, auth.setCookies),
  )
}
