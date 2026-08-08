import 'server-only'
import { z } from 'zod'
import type { PensaChatMessage, PensaZState } from '../../lib/types'
import { completePensaJson, pensaChatModel } from '../pensa-llm'

/**
 * Avaliador ESTRUTURADO da etapa Z: roda APÓS cada turno do chat (segunda chamada,
 * modelo barato do chat) e devolve quais das 5 perguntas a CRIANÇA já respondeu
 * explicitamente. É o que acende as estrelas do QuestionTracker e habilita o botão
 * "Criar a Carta da Ideia" — a decisão nunca é do agente de conversa (anti-inferência
 * em camada dupla: regra no system do chat + juiz determinístico aqui).
 */

const EVALUATOR_SYSTEM = `Você audita uma conversa entre o Zappy (assistente) e uma criança planejando um jogo.
Julgue quais das 5 perguntas a CRIANÇA JÁ RESPONDEU DE FORMA EXPLÍCITA, com decisão dela própria (texto que ela escreveu ou sugestão que ela clicou e enviou):
- idea: a ideia do jogo em uma frase.
- objective: o objetivo do jogador.
- controls: como o jogador controla o jogo.
- outcome: como vence E como perde.
- dimension: uma escolha explícita entre 2D e 3D.
REGRAS:
- Só marque true se a INFORMAÇÃO VEIO DA CRIANÇA. Sugestão apresentada pelo Zappy mas NÃO confirmada pela criança = false.
- Resposta vaga que o Zappy ainda está clareando = false.
- ready = true SOMENTE quando as 5 forem true.
- Para versões 2+, confirme as cinco decisões para o incremento planejado.`

const EvaluatorSchema = z.object({
  answered: z.object({
    idea: z.boolean(),
    objective: z.boolean(),
    controls: z.boolean(),
    outcome: z.boolean(),
    dimension: z.boolean(),
  }),
  ready: z.boolean(),
})

const EVALUATOR_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['answered', 'ready'],
  properties: {
    answered: {
      type: 'object',
      additionalProperties: false,
      required: ['idea', 'objective', 'controls', 'outcome', 'dimension'],
      properties: {
        idea: { type: 'boolean' },
        objective: { type: 'boolean' },
        controls: { type: 'boolean' },
        outcome: { type: 'boolean' },
        dimension: { type: 'boolean' },
      },
    },
    ready: { type: 'boolean' },
  },
} as const

/** Janela de transcript enviada ao juiz (as últimas N mensagens bastam). */
const EVALUATOR_WINDOW = 40

export function transcriptForEvaluator(messages: PensaChatMessage[], summary?: string | null) {
  const window = messages.slice(-EVALUATOR_WINDOW)
  const lines = window.map(
    (m) => `${m.role === 'user' ? 'CRIANÇA' : 'ZAPPY'}: ${m.content.replace(/\n+/g, ' ')}`,
  )
  return [summary ? `RESUMO das mensagens antigas: ${summary}` : '', ...lines]
    .filter(Boolean)
    .join('\n')
}

/**
 * Roda o juiz sobre o transcript ATUALIZADO (inclui o turno recém-terminado).
 * `ready` é DERIVADO (nunca confiar no bool cru do modelo com answered incompleto).
 */
export async function evaluateStageZ(
  messages: PensaChatMessage[],
  summary?: string | null,
): Promise<PensaZState> {
  const result = await completePensaJson({
    system: EVALUATOR_SYSTEM,
    user: transcriptForEvaluator(messages, summary),
    schema: EvaluatorSchema,
    jsonSchema: EVALUATOR_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_stage_z_state',
    model: pensaChatModel(),
    maxTokens: 200,
    temperature: 0,
  })
  const answered = result.answered
  const ready =
    answered.idea &&
    answered.objective &&
    answered.controls &&
    answered.outcome &&
    answered.dimension
  return { answered, ready }
}

const SUMMARY_SYSTEM = `Você resume uma conversa entre o Zappy e uma criança planejando um jogo, para NÃO perder o começo quando a conversa fica longa (a próxima resposta só enxerga as mensagens recentes + este resumo).
Escreva um RESUMO curto (no máximo 6 frases), em 3ª pessoa, guardando SÓ o que a CRIANÇA decidiu: ideia, objetivo, controles, vitória, derrota, 2D/3D, personagens/itens citados e o que ela recusou. NÃO invente; se algo não foi decidido, não afirme. Sem saudação, sem markdown, sem a linha SUGESTÕES.`

const SummarySchema = z.object({ summary: z.string() })
const SUMMARY_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary'],
  properties: { summary: { type: 'string' } },
} as const

/**
 * Resume a conversa da etapa Z (chamada barata do modelo do chat) quando ela passa
 * da janela do prompt — o resumo entra no `RESUMO` do system e no transcript do
 * evaluator, então a criança pode conversar bastante sobre um jogo grande sem que o
 * começo (o coração da ideia) suma do contexto. Best-effort (o chamador engole erro).
 */
export async function summarizeStageZ(messages: PensaChatMessage[]): Promise<string> {
  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'CRIANÇA' : 'ZAPPY'}: ${m.content.replace(/\n+/g, ' ')}`)
    .join('\n')
    .slice(0, 24_000)
  const result = await completePensaJson({
    system: SUMMARY_SYSTEM,
    user: transcript,
    schema: SummarySchema,
    jsonSchema: SUMMARY_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_stage_z_summary',
    model: pensaChatModel(),
    maxTokens: 400,
    temperature: 0.2,
  })
  return result.summary.trim().slice(0, 2000)
}
