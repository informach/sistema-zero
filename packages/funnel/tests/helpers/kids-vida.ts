import { KIDS_ENGINES } from '../../src/funnels/kids-vida/engine'
import type { KidsMode, QuestionId } from '../../src/funnels/kids-vida/types'
import type { QuizAnswers } from '../../src/lib/quiz-types'

export const DEFAULT_CHOICES: Record<QuestionId | 'genero', string> = {
  genero: 'filho',
  idade: '9a12',
  interesse: 'jogos',
  cena: 'comecar',
  tentativas: 'parte',
  impacto: 'apoio',
  alcance: 'outros',
  prioridade: 'planejar',
  beneficio: 'filho',
  apoio: 'perto',
  condicao: 'geral',
}
const AGE: Record<string, string> = {
  m9: 'menos_9',
  '9a12': '9_12',
  '13a17': '13_17',
  adulto: '18_mais',
}
export function kidsJourney(mode: KidsMode, patch: Record<string, string> = {}) {
  const e = KIDS_ENGINES[mode],
    choice = {
      ...DEFAULT_CHOICES,
      ...(mode === 'comunidade' ? { tentativas: 'retoma' } : {}),
      ...patch,
    }
  let answers: QuizAnswers = {}
  const responses: { key: string; value: string }[] = []
  while (!e.isComplete(answers) && !e.isAdultExit(answers)) {
    const step = e.activeSteps(answers).find((s) => !e.validChoice(s, answers[s.key]))
    if (!step) throw new Error('Incomplete journey without next question')
    const id =
      step.key === 'genero' ? 'genero' : step.key === 'idade' ? 'idade' : step.key.split('_')[2]!
    const requested = id === 'idade' ? AGE[choice.idade] : choice[id as keyof typeof choice]
    const option = step.opcoes.find((o) => o.value === requested)
    if (!option && Object.hasOwn(patch, id))
      throw new Error(`Unknown fixture answer: ${id}=${patch[id]} for ${step.key}`)
    const value = option?.value ?? step.opcoes[0]!.value
    const next = e.applyAnswer(answers, step.key, value)
    if (!next) throw new Error(`Rejected fixture answer: ${step.key}=${value}`)
    responses.push({ key: step.key, value })
    answers = next
    if (responses.length > 11) throw new Error('Journey exceeded ten questions plus entry')
  }
  return { answers, responses }
}
