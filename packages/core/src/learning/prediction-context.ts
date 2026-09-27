/**
 * O assunto que a criança precisa conhecer antes de fazer um palpite.
 *
 * O título curto vai na ficha visual. A explicação é a primeira fala do Zappy.
 * Os dois são conteúdo editorial, nunca um texto improvisado a partir do título da cena.
 */
export interface LearningPredictionContext {
  label: string
  explanation: string
}

const texto = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.length <= maximum &&
  value === value.trim()

export function isLearningPredictionContext(value: unknown): value is LearningPredictionContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  if (!('label' in value) || !('explanation' in value)) return false
  return texto(value.label, 180) && texto(value.explanation, 2000)
}
