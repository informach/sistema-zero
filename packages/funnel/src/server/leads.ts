import { z } from 'zod'
import { LEAD_KEYS, type LeadKey } from '../content/quiz-config'
import type { FunnelRepo, Lead, LeadUpdate } from '../db/repo'
import { ContactSchema } from '../lib/contact-schema'
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
  tipo_criar: 'tipoCriar',
  relacao_ia: 'relacaoIa',
  ja_quebrou: 'jaQuebrou',
  trava_principal: 'travaPrincipal',
  custo_principal: 'custoPrincipal',
  horas_retrabalho: 'horasRetrabalho',
  valor_hora: 'valorHora',
  custo_mensal: 'custoMensal',
  mudanca_desejada: 'mudancaDesejada',
  proximo_passo: 'proximoPasso',
  sintese: 'sintese',
}

const CHOICE_ABCD = z.enum(['A', 'B', 'C', 'D'])
const CHOICE_ABCDE = z.enum(['A', 'B', 'C', 'D', 'E'])

/**
 * Validação do `value` por chave do quiz. Escolhas viram enums fechados (antes
 * qualquer string até 2000 chars era aceita) — P2 e P6 têm 5 opções (A–E), as
 * demais 4 (A–D). Numéricos ganham limite superior: os centavos cabem em
 * `integer` (int4) e o produto `horas × valor × 4` de `calcCustoMensalCents`
 * (168 × 2.000.000 × 4 ≈ 1,3e9) não estoura int4. (Se precisar de valores
 * maiores, migrar as colunas de centavos p/ bigint.)
 */
const VALUE_SCHEMA: Record<LeadKey, z.ZodTypeAny> = {
  segmento: CHOICE_ABCD,
  tipo_criar: CHOICE_ABCDE,
  relacao_ia: CHOICE_ABCD,
  ja_quebrou: CHOICE_ABCD,
  trava_principal: CHOICE_ABCD,
  custo_principal: CHOICE_ABCDE,
  mudanca_desejada: CHOICE_ABCD,
  proximo_passo: CHOICE_ABCD,
  sintese: CHOICE_ABCD,
  horas_retrabalho: z.coerce.number().int().min(0).max(168),
  valor_hora: z.coerce.number().int().min(0).max(2_000_000),
  custo_mensal: z.coerce.number().int().min(0).max(2_000_000_000),
}

/**
 * Eventos que o CLIENTE pode registrar (analytics). Enum FECHADO: os marcos
 * server-side (`entrou_landing`, `viu_resultado`, `pagamento_iniciado`,
 * `pagamento_confirmado`) ficam de fora de propósito — antes, qualquer string
 * ≤64 era aceita e um cliente podia forjar `pagamento_confirmado`, inflando a
 * conversão do dashboard (além de poluir a tabela com cardinalidade arbitrária).
 */
const CLIENT_EVENTS = [
  'respondeu_pergunta_1',
  'respondeu_pergunta_2',
  'respondeu_pergunta_3',
  'respondeu_pergunta_4',
  'respondeu_pergunta_5',
  'respondeu_pergunta_6',
  'respondeu_pergunta_7',
  'respondeu_pergunta_8',
  'respondeu_pergunta_9',
  'respondeu_pergunta_10',
  'viu_pagina_vendas',
  'abriu_checkout',
  'enviou_precheckout',
  'redirecionou_checkout',
] as const

const PatchBody = z.object({
  key: z.enum(LEAD_KEYS),
  value: z.union([z.string(), z.number()]),
  lastStep: z.string().max(64).optional(),
  eventName: z.enum(CLIENT_EVENTS).optional(),
})

/**
 * Metadados opcionais do evento — shape FECHADO e pequeno (sem objeto arbitrário
 * vindo do browser). Hoje só `perfil_resultado` (no `viu_pagina_vendas`).
 */
const EventMetadata = z.object({ perfil_resultado: z.string().max(32) }).partial()

const EventBody = z.object({
  eventName: z.enum(CLIENT_EVENTS),
  step: z.string().max(64).optional(),
  metadata: EventMetadata.optional(),
})

/** Respostas do quiz no formato do produto (snake_case) — usado pelo resume do quiz. */
export function leadAnswers(lead: Lead) {
  return {
    segmento: lead.segmento,
    tipo_criar: lead.tipoCriar,
    relacao_ia: lead.relacaoIa,
    ja_quebrou: lead.jaQuebrou,
    trava_principal: lead.travaPrincipal,
    custo_principal: lead.custoPrincipal,
    horas_retrabalho: lead.horasRetrabalho,
    valor_hora: lead.valorHora,
    custo_mensal: lead.custoMensal,
    mudanca_desejada: lead.mudancaDesejada,
    proximo_passo: lead.proximoPasso,
    sintese: lead.sintese,
  }
}

/**
 * POST /api/leads — inicia o lead (idempotente se o cookie já aponta p/ um lead).
 * Devolve também as respostas atuais → o quiz resolve em UMA ida ao servidor (sem
 * GET + POST), mostrando a pergunta certa mais rápido (retoma de onde parou).
 */
export async function createLead(request: Request, deps: LeadDeps): Promise<Response> {
  const existing = getLeadId(request)
  if (existing) {
    const lead = await deps.repo.getLead(existing)
    if (lead) {
      return json({ id: lead.id, answers: leadAnswers(lead), lastStep: lead.lastStep }, 200)
    }
  }
  const { id } = await deps.repo.createLead()
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
