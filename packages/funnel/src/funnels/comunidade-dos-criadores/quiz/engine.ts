import type { SelecaoStep } from '../../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../../lib/quiz-types'
import { COMMUNITY_QUESTIONS } from './questions'

export const QUIZ_VERSION = 'comunidade-orientacao-v2'
export const PROFILE_IDS = {
  A: 'tempo-de-tela',
  B: 'criacao-de-jogos',
  C: 'expressao-visual',
  D: 'formacao-tecnologica',
} as const
export type CommunityProfile = keyof typeof PROFILE_IDS
export type DecisionState =
  | 'prioridade_declarada'
  | 'prioridade_esclarecida'
  | 'misto_sem_prioridade'
  | 'exploratorio'
  | 'fora_das_opcoes'
export type Condition = 'ferramenta' | 'desenho' | 'formato' | 'computador'
export interface CommunityDecision {
  profile: CommunityProfile | null
  state: DecisionState
  objectives: CommunityProfile[]
  secondary: CommunityProfile | null
  interests: string[]
  unmet: Condition[]
  pending: Condition[]
  adequacy: 'condicao_nao_atendida' | 'precisa_conferir' | 'sem_incompatibilidade_declarada'
}

export const answerList = (value: QuizAnswerValue | undefined): string[] =>
  Array.isArray(value) ? value : []
export const inCommunityAgeRange = (answers: QuizAnswers): boolean =>
  answers.q1 === '9_a_11' || answers.q1 === '12_a_14'
export const isOutsideCommunityAge = (answers: QuizAnswers): boolean =>
  answers.q1 === 'ate_8' || answers.q1 === '15_mais'
export const quizRevision = (answers: QuizAnswers): number =>
  typeof answers._quiz_revision === 'number' ? answers._quiz_revision : 0
const isProfile = (value: string): value is CommunityProfile => Object.hasOwn(PROFILE_IDS, value)

/** Pure and browser-safe: no registry, IO or offer content imports. */
export function activeCommunitySteps(answers: QuizAnswers): SelecaoStep[] {
  if (!inCommunityAgeRange(answers)) return COMMUNITY_QUESTIONS.filter((s) => s.key === 'q1')
  const objectives = answerList(answers.q4)
  const interests = answerList(answers.q3)
  return COMMUNITY_QUESTIONS.flatMap((step) => {
    if (step.key === 'qt') {
      if (objectives.length !== 2 || !objectives.every(isProfile)) return []
      return [
        {
          ...step,
          opcoes: step.opcoes.filter(
            (o) => objectives.some((p) => p === o.value) || o.value === 'iguais',
          ),
        },
      ]
    }
    if (
      step.key === 'qb' &&
      !objectives.includes('B') &&
      !interests.includes('jogo') &&
      answers.q2 !== 'criar_jogo'
    )
      return []
    if (
      step.key === 'qc' &&
      !objectives.includes('C') &&
      !interests.includes('visual') &&
      answers.q2 !== 'desenhar'
    )
      return []
    return [step]
  })
}

export function validChoice(step: SelecaoStep, value: unknown): boolean {
  const allowed = new Set(step.opcoes.map((o) => o.value))
  if (!step.multiple) return typeof value === 'string' && allowed.has(value)
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > (step.maxSelections ?? step.opcoes.length)
  )
    return false
  if (
    !value.every((v) => typeof v === 'string' && allowed.has(v)) ||
    new Set(value).size !== value.length
  )
    return false
  return value.length === 1 || !value.some((v) => step.exclusive?.includes(v))
}

export function isCommunityQuizComplete(answers: QuizAnswers): boolean {
  return (
    answers._quiz_version === QUIZ_VERSION &&
    inCommunityAgeRange(answers) &&
    activeCommunitySteps(answers).every((step) => validChoice(step, answers[step.key]))
  )
}

export function applyCommunityAnswer(
  previous: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): QuizAnswers | null {
  const current = previous._quiz_version === QUIZ_VERSION ? previous : {}
  const step = activeCommunitySteps(current).find((s) => s.key === key)
  if (!step || !validChoice(step, value)) return null
  const next: QuizAnswers = { ...current, [key]: Array.isArray(value) ? [...value].sort() : value }
  if (
    key === 'q4' &&
    [...answerList(current.q4)].sort().join('|') !== answerList(next.q4).join('|')
  )
    delete next.qt
  const active = new Set(activeCommunitySteps(next).map((s) => s.key))
  for (const question of COMMUNITY_QUESTIONS)
    if (!active.has(question.key)) delete next[question.key]
  next._quiz_version = QUIZ_VERSION
  next._quiz_revision = quizRevision(previous) + 1
  return next
}

export function communityDecision(answers: QuizAnswers): CommunityDecision | null {
  if (!isCommunityQuizComplete(answers)) return null
  const objectives = answerList(answers.q4).filter(isProfile).sort()
  let state: DecisionState = 'prioridade_declarada'
  let profile: CommunityProfile | null = objectives[0] ?? null
  if (answerList(answers.q4).includes('outro')) state = 'fora_das_opcoes'
  else if (answerList(answers.q4).includes('explorar')) state = 'exploratorio'
  else if (objectives.length === 2) {
    state = answers.qt === 'iguais' ? 'misto_sem_prioridade' : 'prioridade_esclarecida'
    profile = typeof answers.qt === 'string' && isProfile(answers.qt) ? answers.qt : null
  }
  const active = new Set(activeCommunitySteps(answers).map((s) => s.key))
  const unmet: Condition[] = []
  const pending: Condition[] = []
  if (active.has('qb')) {
    if (answers.qb === 'roblox' || answers.qb === 'minecraft') unmet.push('ferramenta')
    if (answers.qb === 'outra_especifica' || answers.qb === 'conversar') pending.push('ferramenta')
  }
  if (active.has('qc')) {
    if (answers.qc === 'sem_jogos') unmet.push('desenho')
    if (answers.qc === 'ver_exemplo') pending.push('desenho')
  }
  if (answers.q7 === 'exige_ao_vivo') unmet.push('formato')
  if (answers.q7 === 'prefere_ao_vivo' || answers.q7 === 'conhecer') pending.push('formato')
  if (answers.q8 === 'celular_tablet') unmet.push('computador')
  if (answers.q8 === 'organizar' || answers.q8 === 'verificar') pending.push('computador')
  return {
    profile,
    state,
    objectives,
    secondary: profile ? (objectives.find((p) => p !== profile) ?? null) : null,
    interests: [...answerList(answers.q3)].sort(),
    unmet,
    pending,
    adequacy: unmet.length
      ? 'condicao_nao_atendida'
      : pending.length
        ? 'precisa_conferir'
        : 'sem_incompatibilidade_declarada',
  }
}
