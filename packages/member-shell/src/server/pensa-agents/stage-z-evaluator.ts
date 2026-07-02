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
- who: pra quem é o jogo (quem vai jogar).
- problem: qual é a graça / por que alguém vai querer jogar de novo.
- action: qual é a ação principal do jogador (o que ele FAZ).
- screens: quais telas ou etapas principais o jogo tem (em linhas gerais já basta: ex. título, jogo, fim).
- success: como saber que o jogo ficou bom de verdade.
REGRAS:
- Só marque true se a INFORMAÇÃO VEIO DA CRIANÇA. Sugestão apresentada pelo Zappy mas NÃO confirmada pela criança = false.
- Resposta vaga que o Zappy ainda está clareando = false.
- ready = true SOMENTE quando as 5 forem true.
- Para versões 2+ (a conversa dirá), who e screens herdados da versão anterior contam como true a menos que a novidade os mude.`

const EvaluatorSchema = z.object({
  answered: z.object({
    who: z.boolean(),
    problem: z.boolean(),
    action: z.boolean(),
    screens: z.boolean(),
    success: z.boolean(),
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
      required: ['who', 'problem', 'action', 'screens', 'success'],
      properties: {
        who: { type: 'boolean' },
        problem: { type: 'boolean' },
        action: { type: 'boolean' },
        screens: { type: 'boolean' },
        success: { type: 'boolean' },
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
    answered.who && answered.problem && answered.action && answered.screens && answered.success
  return { answered, ready }
}
