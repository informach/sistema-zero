import 'server-only'
import { z } from 'zod'
import type { PensaChatMessage } from '../../lib/types'
import { completePensaJson } from '../pensa-llm'
import { pensaSafetyClause } from './safety'
import { transcriptForEvaluator } from './stage-z-evaluator'

/**
 * Síntese da IDEIA CLARIFICADA (artefato `idea` — a "Carta da Ideia" no kids):
 * parágrafo ÚNICO, sem quebras de linha, montado SOMENTE com o que a criança
 * disse/escolheu na conversa da etapa Z. Instrução de fidelidade explícita —
 * nada de recurso novo inventado na síntese (PRD §11.5).
 */

const IdeaSchema = z.object({ text: z.string().min(40).max(1200) })

const IDEA_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['text'],
  properties: { text: { type: 'string' } },
} as const

function ideaSystem(mode: 'kids' | 'adult'): string {
  return [
    pensaSafetyClause(mode),
    `Você resume a ideia de um jogo planejado por uma criança, a partir da conversa dela com o Zappy.
REGRAS:
- Use SOMENTE o que a CRIANÇA afirmou ou escolheu. NÃO invente recurso, personagem, tela nem público que ela não citou.
- UM parágrafo único, SEM quebras de linha, em português do Brasil, tom alegre e simples.
- Escreva na 2ª pessoa, celebrando a autoria ("Seu jogo é...", "Quem joga é...").
- O parágrafo deve cobrir: o que é o jogo, quem vai jogar, qual é a graça, qual é a ação principal, quais são as telas em linhas gerais e como saber que ficou bom.
- Entre 300 e 900 caracteres. Sem markdown, sem emojis em excesso (no máximo 1).`,
  ].join('\n\n')
}

/** Conteúdo do artefato `idea`: `{ text }` (contrato do Pensa). */
export async function synthesizeIdea(
  mode: 'kids' | 'adult',
  messages: PensaChatMessage[],
  summary?: string | null,
): Promise<{ text: string }> {
  const result = await completePensaJson({
    system: ideaSystem(mode),
    user: transcriptForEvaluator(messages, summary),
    schema: IdeaSchema,
    jsonSchema: IDEA_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'pensa_idea',
    maxTokens: 600,
    temperature: 0.4,
  })
  // Garantia dura do contrato "sem quebra de linha" (o modelo às vezes teima).
  return { text: result.text.replace(/\s*\n+\s*/g, ' ').trim() }
}
