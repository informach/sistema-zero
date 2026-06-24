import { z } from 'zod'
import type { FunnelRepo, Lead } from '../db/repo'
import { leadBelongsToFunnel } from '../funnels/lead-scope'
import { getFunnelByKey, isFunnelKey } from '../funnels/registry'
import { ContactSchema } from '../lib/contact-schema'
import { json, jsonError, safeJson } from '../lib/http'
import { getLeadId, leadCookie } from '../lib/lead-session'

export interface LeadDeps {
  repo: FunnelRepo
  secureCookie: boolean
}

/**
 * Eventos de VENDAS que o cliente pode registrar (POST /api/events). Enum FECHADO:
 * os marcos server-side (`entrou_landing`/`viu_resultado`/`pagamento_*`) ficam de
 * fora — um cliente não pode forjar `pagamento_confirmado` (inflaria a conversão).
 * Os eventos do quiz (`respondeu_pergunta_N`) chegam pelo PATCH e são validados
 * contra os passos do quiz do FUNIL do lead (cada funil tem o seu quiz).
 */
const VENDAS_EVENTS = [
  'viu_pagina_vendas',
  'abriu_checkout',
  'enviou_precheckout',
  'redirecionou_checkout',
] as const

const PatchBody = z.object({
  // key/eventName são validados contra o quiz do FUNIL do lead, não um enum fixo.
  key: z.string().max(64),
  value: z.union([z.string(), z.number()]),
  lastStep: z.string().max(64).optional(),
  eventName: z.string().max(64).optional(),
})

/**
 * Metadados opcionais do evento — shape FECHADO e pequeno (sem objeto arbitrário
 * vindo do browser). Hoje só `perfil_resultado` (no `viu_pagina_vendas`).
 */
const EventMetadata = z.object({ perfil_resultado: z.string().max(32) }).partial()

const EventBody = z.object({
  eventName: z.enum(VENDAS_EVENTS),
  step: z.string().max(64).optional(),
  metadata: EventMetadata.optional(),
})

/** Respostas do quiz (snake_case → valor) — usado pelo resume do quiz na ilha. */
export function leadAnswers(lead: Lead): Record<string, string | number> {
  return lead.quizAnswers ?? {}
}

/** Corpo opcional do POST /api/leads: o funil de origem (`${audience}/${produto}`). */
const CreateLeadBody = z.object({ funnel: z.string() }).partial()

/**
 * POST /api/leads — inicia o lead (idempotente se o cookie já aponta p/ um lead).
 * Devolve também as respostas atuais → o quiz resolve em UMA ida ao servidor (sem
 * GET + POST), mostrando a pergunta certa mais rápido (retoma de onde parou).
 * O corpo pode trazer `{ funnel }` (a página passa o seu funil à ilha) — validado
 * contra o registry e gravado na criação para resolver oferta/conteúdo por produto.
 */
export async function createLead(request: Request, deps: LeadDeps): Promise<Response> {
  const parsed = CreateLeadBody.safeParse(await safeJson(request))
  const funnel = parsed.success && isFunnelKey(parsed.data.funnel) ? parsed.data.funnel : null
  const existing = getLeadId(request)
  if (existing) {
    const lead = await deps.repo.getLead(existing)
    if (lead && (!funnel || leadBelongsToFunnel(lead.funnel, funnel))) {
      return json({ id: lead.id, answers: leadAnswers(lead), lastStep: lead.lastStep }, 200)
    }
  }
  const { id } = await deps.repo.createLead(funnel)
  await deps.repo.insertEvent(id, 'entrou_landing', 'landing')
  return json({ id, answers: {}, lastStep: 'entrou_landing' }, 201, {
    'set-cookie': leadCookie(id, deps.secureCookie),
  })
}

/** GET /api/leads — estado do lead do cookie (resume do quiz). */
export async function getLeadView(request: Request, deps: LeadDeps): Promise<Response> {
  const id = getLeadId(request)
  if (!id) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const lead = await deps.repo.getLead(id)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  return json({
    id: lead.id,
    lastStep: lead.lastStep,
    paid: lead.paidAt != null,
    answers: leadAnswers(lead),
  })
}

/** PATCH /api/leads — salva uma resposta do quiz no lead do cookie (+ evento opcional). */
export async function patchLead(request: Request, deps: LeadDeps): Promise<Response> {
  const id = getLeadId(request)
  if (!id) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')

  const parsed = PatchBody.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Payload inválido.', 400, 'BAD_REQUEST')

  const lead = await deps.repo.getLead(id)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')

  // O quiz do FUNIL do lead define as chaves válidas, a validação e a derivação.
  const quiz = getFunnelByKey(lead.funnel)?.content.quiz
  if (!quiz) return jsonError('Este funil não tem quiz.', 400, 'BAD_REQUEST')

  const { key, value, lastStep, eventName } = parsed.data
  const step = quiz.steps.find((s) =>
    s.tipo === 'calculadora' || s.tipo === 'calculadora_prefilled'
      ? s.campo1.key === key || s.campo2.key === key || s.resultadoKey === key
      : s.key === key,
  )
  if (!step) return jsonError('Pergunta desconhecida.', 400, 'BAD_REQUEST')
  // O resultadoKey das calculadoras é DERIVADO no servidor (invariante 3): o cliente
  // só envia campo1/campo2. Recusa um envio DIRETO do resultado (anti-forja do valor).
  if (
    (step.tipo === 'calculadora' || step.tipo === 'calculadora_prefilled') &&
    key === step.resultadoKey
  ) {
    return jsonError('Valor calculado no servidor.', 400, 'BAD_REQUEST')
  }
  if (lastStep && lastStep !== step.lastStep) {
    return jsonError('Etapa inválida.', 400, 'BAD_REQUEST')
  }
  if (eventName && eventName !== step.eventName) {
    return jsonError('Evento inválido.', 400, 'BAD_REQUEST')
  }

  const schema = quiz.valueSchema[key]
  if (!schema) return jsonError('Pergunta desconhecida.', 400, 'BAD_REQUEST')
  const parsedValue = schema.safeParse(value)
  if (!parsedValue.success) return jsonError('Valor inválido para a pergunta.', 400, 'BAD_REQUEST')

  // Grava a resposta + chaves derivadas (ex.: custo_mensal) no JSON `quiz_answers`.
  const answer = parsedValue.data as string | number
  const merged = { ...(lead.quizAnswers ?? {}), [key]: answer }
  const derived = quiz.derive?.(merged) ?? {}
  await deps.repo.mergeQuizAnswers(id, { [key]: answer, ...derived })

  if (lastStep) await deps.repo.updateLead(id, { lastStep })
  // Só o evento do passo desta resposta é aceito (não dá p/ forjar marco server-side).
  if (eventName) await deps.repo.insertEvent(id, eventName, lastStep ?? null)

  return json({ ok: true })
}

/** POST /api/events — registra um evento de funil para o lead do cookie. */
export async function recordEvent(request: Request, deps: LeadDeps): Promise<Response> {
  const id = getLeadId(request)
  if (!id) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const parsed = EventBody.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Payload inválido.', 400, 'BAD_REQUEST')
  const lead = await deps.repo.getLead(id)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  await deps.repo.insertEvent(
    id,
    parsed.data.eventName,
    parsed.data.step ?? null,
    parsed.data.metadata ?? null,
  )
  return json({ ok: true }, 201)
}

/** POST /api/contact — salva nome/e-mail/telefone do lead (pré-checkout). */
export async function saveContact(request: Request, deps: LeadDeps): Promise<Response> {
  const id = getLeadId(request)
  if (!id) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const parsed = ContactSchema.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Dados inválidos.', 400, 'BAD_REQUEST')
  const lead = await deps.repo.getLead(id)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  await deps.repo.updateLead(id, {
    nome: parsed.data.nome,
    email: parsed.data.email,
    telefone: parsed.data.telefone,
  })
  return json({ ok: true })
}
