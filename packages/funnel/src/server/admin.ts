import type { FunnelRepo } from '../db/repo'
import { AdminLoginSchema } from '../lib/admin-schema'
import {
  clearAdminSessionCookie,
  createAdminSessionCookie,
  verifyAdminSession,
} from '../lib/admin-session'
import { json, jsonError, safeJson } from '../lib/http'
import { safeEqual } from '../lib/safe-equal'

export interface AdminDeps {
  repo: FunnelRepo
  user: string
  password: string
  sessionSecret: string
  secureCookie: boolean
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

function authed(request: Request, deps: AdminDeps): boolean {
  return verifyAdminSession(request, deps.sessionSecret)
}

/** POST /api/admin/login — valida usuário/senha (timing-safe) e abre a sessão. */
export async function adminLogin(request: Request, deps: AdminDeps): Promise<Response> {
  const parsed = AdminLoginSchema.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Dados inválidos.', 400, 'BAD_REQUEST')
  // Avalia ambas as comparações sempre (sem short-circuit) p/ não vazar timing.
  const okUser = safeEqual(parsed.data.usuario, deps.user)
  const okPass = safeEqual(parsed.data.senha, deps.password)
  if (!(okUser && okPass)) return jsonError('Usuário ou senha inválidos.', 401, 'UNAUTHORIZED')
  return json({ ok: true }, 200, {
    'set-cookie': createAdminSessionCookie(deps.sessionSecret, deps.secureCookie),
    'cache-control': 'no-store',
  })
}

/** POST /api/admin/logout — encerra a sessão. */
export function adminLogout(_request: Request, deps: AdminDeps): Response {
  return json({ ok: true }, 200, {
    'set-cookie': clearAdminSessionCookie(deps.secureCookie),
    'cache-control': 'no-store',
  })
}

/** GET /api/admin/leads — uma linha por lead com todas as respostas. */
export async function adminLeads(request: Request, deps: AdminDeps): Promise<Response> {
  if (!authed(request, deps)) return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
  // Cap simples (mais recentes primeiro); sem paginação no painel ainda — revisar
  // se o volume de leads passar de ~1000.
  const leads = await deps.repo.listLeads(1000, 0)
  return json({ leads }, 200, { 'cache-control': 'no-store' })
}

/** GET /api/admin/funnel — contagem e conversão por etapa. */
export async function adminFunnel(request: Request, deps: AdminDeps): Promise<Response> {
  if (!authed(request, deps)) return jsonError('Não autorizado.', 401, 'UNAUTHORIZED')
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

  return json({ total: top, steps }, 200, { 'cache-control': 'no-store' })
}
