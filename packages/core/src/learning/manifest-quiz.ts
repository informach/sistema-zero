/** Same Markdown fields as the native lesson quiz; validated again by members on import. */
export interface ManifestQuiz {
  kind: 'quiz'
  passingScore: number
  questions: Array<{
    id: string
    prompt: string
    choices: { id: string; label: string }[]
    correctChoiceIds: string[]
    explanation?: string
  }>
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const text = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.trim().length > 0 && v.length <= max
export function isManifestQuiz(v: unknown): v is ManifestQuiz {
  if (
    !record(v) ||
    v.kind !== 'quiz' ||
    typeof v.passingScore !== 'number' ||
    !Number.isFinite(v.passingScore) ||
    v.passingScore <= 0 ||
    v.passingScore > 100 ||
    !Array.isArray(v.questions) ||
    v.questions.length < 1 ||
    v.questions.length > 30
  )
    return false
  const ids = new Set<string>()
  return v.questions.every((q) => {
    if (
      !record(q) ||
      !text(q.id, 64) ||
      ids.has(q.id) ||
      !text(q.prompt, 5000) ||
      !Array.isArray(q.choices) ||
      q.choices.length < 2 ||
      q.choices.length > 20 ||
      !Array.isArray(q.correctChoiceIds) ||
      q.correctChoiceIds.length < 1 ||
      (q.explanation !== undefined && !text(q.explanation, 5000))
    )
      return false
    ids.add(q.id)
    const choices = new Set<string>()
    if (
      !q.choices.every((c) => {
        if (!record(c) || !text(c.id, 64) || !text(c.label, 2000) || choices.has(c.id)) return false
        choices.add(c.id)
        return true
      })
    )
      return false
    return (
      new Set(q.correctChoiceIds).size === q.correctChoiceIds.length &&
      q.correctChoiceIds.every((id) => typeof id === 'string' && choices.has(id))
    )
  })
}
