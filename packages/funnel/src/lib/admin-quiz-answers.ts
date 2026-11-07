import type { QuizDefinition } from '../analytics/types'
import type { AdminFunnelInfo } from '../funnels/registry'
import type { QuizAnswers } from './quiz-types'

export interface AdminQuizAnswer {
  key: string
  label: string
  options?: Record<string, string>
}

/** Snapshots preserve the actual wording; metadata is the fallback for pre-snapshot leads. */
export function adminQuizAnswers(
  answers: QuizAnswers,
  definition: QuizDefinition | null,
  fallback: AdminFunnelInfo | undefined,
): AdminQuizAnswer[] {
  const questions = new Map(definition?.questions.map((q) => [q.id, q]) ?? [])
  const legacyOrder = Object.keys(fallback?.answerLabels ?? {})
  const position = (key: string) =>
    questions.get(key)?.position ??
    (legacyOrder.includes(key) ? legacyOrder.indexOf(key) : Number.MAX_SAFE_INTEGER)
  return Object.keys(answers)
    .filter((key) => !key.startsWith('_quiz_'))
    .sort((a, b) => position(a) - position(b) || a.localeCompare(b))
    .map((key) => {
      const question = questions.get(key)
      return {
        key,
        label: question
          ? [question.branch, question.title].filter(Boolean).join(' · ')
          : (fallback?.answerLabels[key] ?? key),
        options: question
          ? Object.fromEntries(question.options.map((o) => [o.value, o.label]))
          : fallback?.answerOptions?.[key],
      }
    })
}
