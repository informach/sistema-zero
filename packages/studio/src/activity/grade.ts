import type {
  ActivityCheck,
  ActivityRunResult,
  CheckResult,
  LessonActivity,
} from '../studio/activity'

function weightOf(check: ActivityCheck): number {
  const w = check.weight
  return typeof w === 'number' && w > 0 ? w : 1
}

/**
 * Agrega os resultados numa nota (0–100) ponderada pelos pesos das checagens —
 * espelha o `gradeQuizAttempt`: sem `passingScore` é FORMATIVA (`passed: true`).
 * Atividade sem checagens → 100 (nada a errar). Resultados são ordenados na ordem
 * das checagens da atividade.
 */
export function gradeActivity(
  activity: LessonActivity,
  results: readonly CheckResult[],
): ActivityRunResult {
  const byId = new Map(results.map((r) => [r.checkId, r]))
  const ordered = activity.checks.map(
    (c): CheckResult =>
      byId.get(c.id) ?? {
        checkId: c.id,
        kind: c.kind,
        passed: false,
        message: 'sem resultado',
        verifiedBy: 'client',
      },
  )
  const totalWeight = activity.checks.reduce((sum, c) => sum + weightOf(c), 0)
  const passedWeight = activity.checks.reduce(
    (sum, c) => sum + (byId.get(c.id)?.passed ? weightOf(c) : 0),
    0,
  )
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100
  const passed = activity.passingScore === undefined ? true : score >= activity.passingScore
  return { results: ordered, score, passed }
}
