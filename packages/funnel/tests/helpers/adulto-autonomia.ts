import { ADULT_ENGINES } from '../../src/funnels/adulto-autonomia/engine'
import type {
  AdultMode,
  CompleteAnswers,
  QuestionId,
} from '../../src/funnels/adulto-autonomia/types'
import type { QuizAnswers, QuizAnswerValue } from '../../src/lib/quiz-types'

export const ADULT_CHOICES: CompleteAnswers = {
  interesse: 'ideia',
  experiencia: 'acompanhei',
  computador: 'meu',
  trava: 'entender',
  ajuda: 'repito',
  condicao: ['apoio'],
  efeito: 'referencias',
  peso: 'dependencia',
  conquista: 'compreender',
  beneficio: 'capacidade',
}
export function adultJourney(
  mode: AdultMode,
  patch: Partial<Record<QuestionId, QuizAnswerValue>> = {},
) {
  const e = ADULT_ENGINES[mode],
    choices = { ...ADULT_CHOICES, ...patch }
  let answers: QuizAnswers = {}
  const responses: { key: string; value: QuizAnswerValue }[] = []
  while (!e.isComplete(answers)) {
    const step = e.activeSteps(answers).find((s) => !e.validChoice(s, answers[s.key]))
    if (!step) throw new Error('Incomplete adult journey without a next step')
    const id = e.questionId(step.key)!,
      value = choices[id]
    if (!e.validChoice(step, value)) throw new Error(`Invalid fixture choice: ${id}`)
    const next = e.applyAnswer(answers, step.key, value)
    if (!next) throw new Error(`Rejected fixture choice: ${id}`)
    responses.push({ key: step.key, value })
    answers = next
    if (responses.length > 10) throw new Error('Adult journey exceeded ten questions')
  }
  return { answers, responses }
}
