import { createHash } from 'node:crypto'
import type { FunnelDef } from '../funnels/registry'
import type { QuizDefinition } from './types'

function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered)
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, ordered(v)]),
    )
  return value
}
const hash = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(ordered(value)))
    .digest('hex')

/** Server-only. The browser receives the ID; it never recreates or supplies a definition. */
export function quizDefinition(funnel: FunnelDef): QuizDefinition | null {
  const quiz = funnel.content.quiz
  if (!quiz) return null
  const version = quiz.version ?? 'sem-versao-declarada'
  const id = hash({
    funnel: funnel.key,
    version,
    steps: quiz.steps,
    logic: [
      quiz.activeSteps,
      quiz.applyAnswer,
      quiz.derive,
      quiz.isComplete,
      quiz.computePerfil,
    ].map((fn) => fn?.toString() ?? null),
  })
  return {
    id,
    funnel: funnel.key,
    version,
    questions: quiz.steps.map((step, index) => ({
      id: step.key,
      title: step.titulo,
      position: index + 1,
      type: step.tipo,
      revision: hash(step),
      options:
        'opcoes' in step
          ? step.opcoes.map(({ value, label }) => ({ value, label }))
          : step.tipo === 'sim_nao'
            ? [
                { value: 'sim', label: step.opcaoSim },
                { value: 'nao', label: step.opcaoNao },
              ]
            : [],
    })),
  }
}
