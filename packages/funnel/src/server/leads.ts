import { z } from 'zod'
import { LEAD_KEYS, type LeadKey } from '../content/quiz-config'
import type { FunnelRepo, Lead, LeadUpdate } from '../db/repo'
import { json, jsonError, safeJson } from '../lib/http'
import { getLeadId, leadCookie } from '../lib/lead-session'
import { calcCustoMensalCents } from '../lib/result-text'

export interface LeadDeps {
  repo: FunnelRepo
  secureCookie: boolean
}

/** Mapeia a chave do produto (snake_case) → propriedade da coluna Drizzle (camelCase). */
const KEY_TO_COLUMN: Record<LeadKey, keyof LeadUpdate> = {
  segmento: 'segmento',
  gasto_terceiros: 'gastoTerceiros',
  forma_de_criar: 'formaDeCriar',
  ja_quebrou: 'jaQuebrou',
  nivel_refem: 'nivelRefem',
  horas_retrabalho: 'horasRetrabalho',
  valor_hora: 'valorHora',
  custo_mensal: 'custoMensal',
  peso_principal: 'pesoPrincipal',
  visualizacao: 'visualizacao',
  o_que_falta: 'oQueFalta',
  mudanca_desejada: 'mudancaDesejada',
}

const CHOICE = z.enum(['A', 'B', 'C', 'D'])

/**
 * Validação do `value` por chave do quiz. Escolhas viram enums fechados (antes
 * qualquer string até 2000 chars era aceita). Numéricos ganham limite superior:
 * os centavos cabem em `integer` (int4) e o produto `horas × valor × 4` de
 * `calcCustoMensalCents` (168 × 2.000.000 × 4 ≈ 1,3e9) não estoura int4.
 * (Se um dia precisar de valores maiores, migrar as colunas de centavos p/ bigint.)
 */
const VALUE_SCHEMA: Record<LeadKey, z.ZodTypeAny> = {
  segmento: CHOICE,
  forma_de_criar: CHOICE,
  peso_principal: CHOICE,
  visualizacao: CHOICE,
  o_que_falta: CHOICE,
  mudanca_desejada: CHOICE,
  ja_quebrou: z.enum(['sim', 'nao']),
  nivel_refem: z.coerce.number().int().min(1).max(10),
  horas_retrabalho: z.coerce.number().int().min(0).max(168),
  valor_hora: z.coerce.number().int().min(0).max(2_000_000),
  gasto_terceiros: z.coerce.number().int().min(0).max(2_000_000_000),
  custo_mensal: z.coerce.number().int().min(0).max(2_000_000_000),
}

const PatchBody = z.object({
  key: z.enum(LEAD_KEYS),
  value: z.union([z.string(), z.number()]),
  lastStep: z.string().max(64).optional(),
  eventName: z.string().max(64).optional(),
})

const EventBody = z.object({
  eventName: z.string().min(1).max(64),
  step: z.string().max(64).optional(),
})

const ContactBody = z.object({
  nome: z.string().trim().min(1).max(200),
  email: z
    .string()
    .trim()
    .max(320)
    .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'E-mail inválido'),
  telefone: z.string().trim().min(8).max(20),
})

/** Respostas do quiz no formato do produto (snake_case) — usado pelo resume do quiz. */
export function leadAnswers(lead: Lead) {
  return {
    segmento: lead.segmento,
    gasto_terceiros: lead.gastoTerceiros,
    forma_de_criar: lead.formaDeCriar,
    ja_quebrou: lead.jaQuebrou,
    nivel_refem: lead.nivelRefem,
    horas_retrabalho: lead.horasRetrabalho,
    valor_hora: lead.valorHora,
    custo_mensal: lead.custoMensal,
    peso_principal: lead.pesoPrincipal,
    visualizacao: lead.visualizacao,
    o_que_falta: lead.oQueFalta,
    mudanca_desejada: lead.mudancaDesejada,
  }
}

/** POST /api/leads — inicia o lead (idempotente se o cookie já aponta p/ um lead). */
export async function createLead(request: Request, deps: LeadDeps): Promise<Response> {
  const existing = getLeadId(request)
  if (existing) {
    const lead = await deps.repo.getLead(existing)
    if (lead) return json({ id: lead.id }, 200)
  }
  const { id } = await deps.repo.createLead()
  await deps.repo.insertEvent(id, 'entrou_landing', 'landing')
  return json({ id }, 201, { 'set-cookie': leadCookie(id, deps.secureCookie) })
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

  const { key, value, lastStep, eventName } = parsed.data
  const parsedValue = VALUE_SCHEMA[key].safeParse(value)
  if (!parsedValue.success) return jsonError('Valor inválido para a pergunta.', 400, 'BAD_REQUEST')

  const set: Record<string, unknown> = {}
  set[KEY_TO_COLUMN[key]] = parsedValue.data

  // Recalcula custo_mensal quando temos horas e valor da hora (em centavos).
  if (key === 'horas_retrabalho' || key === 'valor_hora') {
    const n = parsedValue.data as number
    const horas = key === 'horas_retrabalho' ? n : lead.horasRetrabalho
    const valor = key === 'valor_hora' ? n : lead.valorHora
    if (horas != null && valor != null) {
      set.custoMensal = calcCustoMensalCents(horas, valor)
    }
  }

  if (lastStep) set.lastStep = lastStep
  await deps.repo.updateLead(id, set as LeadUpdate)
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
  await deps.repo.insertEvent(id, parsed.data.eventName, parsed.data.step ?? null)
  return json({ ok: true }, 201)
}

/** POST /api/contact — salva nome/e-mail/telefone do lead (pré-checkout). */
export async function saveContact(request: Request, deps: LeadDeps): Promise<Response> {
  const id = getLeadId(request)
  if (!id) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const parsed = ContactBody.safeParse(await safeJson(request))
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
