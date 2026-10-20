import type { QuizStep } from '../content/quiz-config'
import type { FunnelRepo, QuizScope } from '../db/repo'
import {
  branchEventName,
  DEFAULT_FUNNEL,
  type FunnelDef,
  getFunnelByKey,
  isFunnelKey,
  LEGACY_ANSWER_PREFIX,
} from '../funnels/registry'
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
import { sanitizeEventCode } from '../lib/lead-attribution'

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

export interface AdminStep {
  name: string
  label: string
  /** Só alguns percursos passam por ela: é comparada à anterior, mas não vira a base da seguinte. */
  condicional?: boolean
  /** Rótulo do ramo do quiz a que a etapa pertence. */
  branch?: string
  /** A entrada de um ramo, comparada com a última etapa comum antes dos ramos. */
  branchEntry?: boolean
  /** Um ramo sem perguntas (saída do quiz): não soma na base do resultado. */
  exit?: boolean
}

/**
 * Etapas do funil de conversão (Performance), montadas POR FUNIL: landing → cada
 * pergunta do quiz daquele funil → resultado (se tiver) → vendas/pré-checkout/
 * checkout → 2 marcos de pagamento. Sem funil selecionado, usa o quiz do funil
 * default só para rotular as "perguntas N" (os eventos `respondeu_pergunta_N` são
 * compartilhados entre funis). Num quiz com ramos, as perguntas comuns vêm primeiro
 * e cada ramo segue com a sua entrada (`entrou_ramo_<id>`) e as suas perguntas.
 */
export function buildFunnelSteps(f: FunnelDef | null): AdminStep[] {
  const quiz = (f ?? DEFAULT_FUNNEL).content.quiz
  const quizSteps = quiz?.steps ?? []
  const question = (s: QuizStep, n: number): AdminStep => ({
    name: s.eventName,
    // `rotuloCurto` nomeia a pergunta; a condicional (só alguns percursos) é marcada e não
    // entra na cadeia "da etapa", senão pareceria uma queda.
    label: `${s.condicional ? 'Extra' : `Pergunta ${n}`}${s.rotuloCurto ? ` · ${s.rotuloCurto}` : ''}`,
    ...(s.condicional ? { condicional: true } : {}),
  })
  const common = quizSteps.filter((s) => !s.ramo)
  const steps: AdminStep[] = [
    { name: 'entrou_landing', label: 'Entrou na landing' },
    ...common.map((s, i) => question(s, i + 1)),
  ]
  for (const [id, label] of Object.entries(quiz?.branches ?? {})) {
    const own = quizSteps.filter((s) => s.ramo === id)
    steps.push({
      name: branchEventName(id),
      label: own.length ? `Ramo · ${label}` : `Saída · ${label}`,
      branch: label,
      branchEntry: true,
      ...(own.length ? {} : { exit: true }),
    })
    for (const [i, s] of own.entries())
      steps.push({ ...question(s, common.length + i + 1), branch: label })
  }
  if (!f || f.steps.resultado) steps.push({ name: 'viu_resultado', label: 'Viu o resultado' })
  steps.push(
    { name: 'viu_pagina_vendas', label: 'Página de vendas' },
    { name: 'abriu_checkout', label: 'Abriu o checkout' },
    { name: 'enviou_precheckout', label: 'Enviou o pré-checkout' },
    { name: 'redirecionou_checkout', label: 'Foi para o checkout' },
    { name: 'pagamento_iniciado', label: 'Pagamento iniciado' },
    { name: 'pagamento_confirmado', label: 'Pagamento confirmado' },
  )
  return steps
}

/**
 * A base de cada etapa ("da etapa"): a anterior na cadeia. A entrada de um ramo compara com a
 * última etapa comum; a primeira etapa depois dos ramos compara com a soma do fim de cada ramo
 * que tem perguntas. As condicionais nunca viram base.
 */
export function stepConversions(steps: AdminStep[], count: (name: string) => number) {
  let prev = 0
  let beforeBranches = 0
  let inBranches = false
  const branchEnds = new Map<string, number>()
  return steps.map((step, i) => {
    const n = count(step.name)
    let base = prev
    if (step.branchEntry) {
      if (!inBranches) beforeBranches = prev
      inBranches = true
      base = beforeBranches
    } else if (inBranches && !step.branch) {
      inBranches = false
      base = [...branchEnds.values()].reduce((sum, v) => sum + v, 0)
    }
    if (!step.condicional) {
      prev = n
      if (step.branch && !step.exit) branchEnds.set(step.branch, n)
    }
    return { step, count: n, fromPrev: i === 0 ? 1 : base > 0 ? n / base : 0 }
  })
}

/** Lê e valida o `?funnel=` da query (chave conhecida → filtra; senão → todos). */
function funnelParam(params: URLSearchParams): string | undefined {
  const raw = params.get('funnel')?.trim()
  return raw && isFunnelKey(raw) ? raw : undefined
}

/**
 * Recorte de um quiz versionado: `?quiz=atual` (só leads que abriram a versão atual do quiz; quem
 * foi direto à oferta fica de fora) e `?manchete=<id>` (uma variante do teste A/B). Escolher uma
 * manchete também recorta a versão atual, para o A/B comparar só quem viu uma das duas.
 * Valores desconhecidos são ignorados.
 */
function quizScopeParam(params: URLSearchParams, f: FunnelDef | null): QuizScope | undefined {
  const quiz = f?.content.quiz
  if (!quiz?.version) return undefined
  const scope: QuizScope = {}
  const headline = params.get('manchete')
  if (headline && Object.hasOwn(quiz.headlines ?? {}, headline)) {
    scope.headline = headline
    scope.headlineIsDefault = headline === quiz.defaultHeadline
  }
  if (params.get('quiz') === 'atual' || scope.headline) scope.quizVersion = quiz.version
  return scope.quizVersion || scope.headline ? scope : undefined
}

const EVENT_REPORT_STEPS = [
  ['view_landing', 'QR/visitas'],
  ['complete_quiz', 'Quiz concluído'],
  ['view_offer', 'Oferta vista'],
  ['start_checkout', 'Checkout iniciado'],
  ['payment_approved', 'Pagamento aprovado'],
  ['account_activated', 'Conta ativada'],
  ['challenge_started', 'Desafio iniciado'],
  ['challenge_day_completed', 'Dia 1 concluído'],
  ['challenge_completed', 'Desafio concluído'],
  ['community_subscription_approved', 'Comunidade assinada'],
] as const

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
  const funnel = funnelParam(params)
  const eventCode = sanitizeEventCode(params.get('event_code')) ?? undefined

  const [leads, total, eventCounts, priceCounts] = await Promise.all([
    deps.repo.listLeads(limit, offset, { q, sort, funnel, eventCode }),
    deps.repo.countLeads({ q, funnel, eventCode }),
    eventCode ? deps.repo.attributedEventCounts(eventCode, funnel) : Promise.resolve([]),
    eventCode ? deps.repo.attributedPriceCounts(eventCode, funnel) : Promise.resolve([]),
  ])
  const byName = new Map(eventCounts.map((row) => [row.eventName, row.leads]))
  const eventReport = eventCode
    ? {
        eventCode,
        steps: EVENT_REPORT_STEPS.map(([name, label]) => ({
          name,
          label,
          leads: byName.get(name) ?? 0,
        })),
        prices: priceCounts,
      }
    : null
  return json(
    { leads, total, limit, offset, eventReport },
    200,
    withSession({ 'cache-control': 'no-store' }, auth.setCookies),
  )
}

/** GET /api/admin/funnel — contagem e conversão por etapa (opcional `?funnel=`). */
export async function adminFunnel(request: Request, deps: AdminDeps): Promise<Response> {
  const auth = await resolveAdmin(request, deps.gateway, deps.secureCookie)
  if (!auth) return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  const params = new URL(request.url).searchParams
  const funnel = funnelParam(params)
  const f = funnel ? getFunnelByKey(funnel) : null
  const counts = await deps.repo.eventCounts(funnel, quizScopeParam(params, f))
  const byName = new Map(counts.map((c) => [c.eventName, c.leads]))
  const top = byName.get('entrou_landing') ?? 0

  const steps = stepConversions(buildFunnelSteps(f), (name) => byName.get(name) ?? 0).map(
    ({ step, count, fromPrev }) => ({
      name: step.name,
      label: step.label,
      count,
      fromTop: top > 0 ? count / top : 0,
      fromPrev,
      ...(step.branch ? { branch: step.branch } : {}),
    }),
  )

  return json(
    { total: top, steps },
    200,
    withSession({ 'cache-control': 'no-store' }, auth.setCookies),
  )
}

/** GET /api/admin/perfis — contagem de leads por perfil do diagnóstico (opcional `?funnel=`). */
export async function adminPerfis(request: Request, deps: AdminDeps): Promise<Response> {
  const auth = await resolveAdmin(request, deps.gateway, deps.secureCookie)
  if (!auth) return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  const params = new URL(request.url).searchParams
  const funnel = funnelParam(params)
  const f = funnel ? getFunnelByKey(funnel) : null
  const rows = await deps.repo.perfilCounts(funnel, quizScopeParam(params, f))
  const byPerfil = new Map(rows.map((r) => [r.perfil, r.count]))
  const result = f?.content.result
  const labels = result?.perfilLabels ?? {}
  const legacy = result?.legacyPerfilLabels ?? {}
  // Com funil selecionado: os perfis DELE (mesmo zerados), na ordem do funil, e depois os que
  // aparecem nos dados sem estar na lista de hoje (versão anterior do quiz), para não sumirem.
  // Sem funil: os perfis presentes nos dados (rótulo = a própria chave).
  const current = result ? Object.keys(labels) : []
  const perfis = [...current, ...[...byPerfil.keys()].filter((p) => !current.includes(p))]
  const counts = perfis.map((perfil) => ({
    perfil,
    label: labels[perfil] ?? (legacy[perfil] ? `${LEGACY_ANSWER_PREFIX}${legacy[perfil]}` : perfil),
    count: byPerfil.get(perfil) ?? 0,
  }))
  const total = counts.reduce((sum, c) => sum + c.count, 0)
  return json({ counts, total }, 200, withSession({ 'cache-control': 'no-store' }, auth.setCookies))
}
