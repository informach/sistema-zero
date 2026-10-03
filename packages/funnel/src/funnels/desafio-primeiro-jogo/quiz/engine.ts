import type { QuizAnswers, QuizAnswerValue } from '../../../lib/quiz-types'
import { DESAFIO_QUESTIONS, type DesafioQuestion } from './questions'

export const DESAFIO_QUIZ_VERSION = 'desafio-farol-v2'
export const DESAFIO_BASE = '/kids/desafio-primeiro-jogo'
export const DESAFIO_PROFILE_IDS = {
  A: 'tempo-de-tela',
  B: 'criacao-de-jogos',
  C: 'expressao-visual',
  D: 'iniciacao-tecnologica',
} as const
export type DesafioProfile = keyof typeof DESAFIO_PROFILE_IDS
export type DesafioCondition = 'computador' | 'formato' | 'projeto' | 'nivel'
export interface DesafioDecision {
  version: string
  principal: DesafioProfile | null
  motivos: DesafioProfile[]
  interesses: string[]
  state: 'declarado' | 'esclarecido' | 'compartilhado' | 'exploracao' | 'outra_procura'
  unmet: DesafioCondition[]
  pending: DesafioCondition[]
  adequacy: 'condicao_nao_atendida' | 'precisa_conferir' | 'sem_incompatibilidade_declarada'
  next:
    | 'conhecer_projeto'
    | 'retomar_com_apoio'
    | 'conversar_com_filho'
    | 'conferir_condicoes'
    | 'outra_atividade'
  offerPath: string
}
export const answerList = (value: QuizAnswerValue | undefined): string[] =>
  Array.isArray(value) ? value : []
export const quizRevision = (answers: QuizAnswers): number =>
  typeof answers._quiz_revision === 'number' ? answers._quiz_revision : 0
export const isOutsideDesafioAge = (answers: QuizAnswers) =>
  answers.idade === 'menos_9' || answers.idade === '15_mais'
const inRange = (answers: QuizAnswers) => answers.idade === '9_11' || answers.idade === '12_14'
const isProfile = (value: string): value is DesafioProfile =>
  Object.hasOwn(DESAFIO_PROFILE_IDS, value)

export function validChoice(step: DesafioQuestion, value: unknown): boolean {
  const allowed = new Set(step.opcoes.map((o) => o.value))
  if (!step.multiple) return typeof value === 'string' && allowed.has(value)
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= (step.maxSelections ?? 4) &&
    value.every((v) => typeof v === 'string' && allowed.has(v)) &&
    new Set(value).size === value.length &&
    (value.length === 1 || !value.some((v) => step.exclusive?.includes(v)))
  )
}

export function activeDesafioSteps(answers: QuizAnswers): DesafioQuestion[] {
  if (!inRange(answers)) return DESAFIO_QUESTIONS.filter((s) => s.key === 'idade')
  const motives = answerList(answers.motivos)
  return DESAFIO_QUESTIONS.flatMap((step) => {
    if (step.key === 'prioridade') {
      if (motives.length !== 2 || !motives.every(isProfile)) return []
      return [
        {
          ...step,
          opcoes: step.opcoes.filter(
            (o) => motives.some((m) => m === o.value) || o.value === 'iguais',
          ),
        },
      ]
    }
    if (step.key === 'desencontro' && answers.interesse_no_projeto !== 'outra_atividade') return []
    return [step]
  })
}

export function isDesafioQuizComplete(answers: QuizAnswers): boolean {
  return (
    answers._quiz_version === DESAFIO_QUIZ_VERSION &&
    inRange(answers) &&
    activeDesafioSteps(answers).every((s) => validChoice(s, answers[s.key]))
  )
}

export function applyDesafioAnswer(
  previous: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): QuizAnswers | null {
  const current = previous._quiz_version === DESAFIO_QUIZ_VERSION ? previous : {}
  const step = activeDesafioSteps(current).find((s) => s.key === key)
  if (!step || !validChoice(step, value)) return null
  const next: QuizAnswers = { ...current, [key]: Array.isArray(value) ? [...value].sort() : value }
  if (
    key === 'motivos' &&
    [...answerList(current.motivos)].sort().join('|') !== answerList(next.motivos).join('|')
  )
    delete next.prioridade
  const active = new Set(activeDesafioSteps(next).map((s) => s.key))
  for (const question of DESAFIO_QUESTIONS) if (!active.has(question.key)) delete next[question.key]
  next._quiz_version = DESAFIO_QUIZ_VERSION
  next._quiz_revision = quizRevision(previous) + 1
  return next
}

export function desafioDecision(answers: QuizAnswers): DesafioDecision | null {
  if (!isDesafioQuizComplete(answers)) return null
  const motives = answerList(answers.motivos)
  const profiles = motives.filter(isProfile).sort()
  let principal: DesafioProfile | null = profiles[0] ?? null
  let state: DesafioDecision['state'] = 'declarado'
  if (motives.includes('exploracao')) state = 'exploracao'
  else if (motives.includes('outra_procura')) state = 'outra_procura'
  else if (profiles.length === 2) {
    state = answers.prioridade === 'iguais' ? 'compartilhado' : 'esclarecido'
    principal =
      typeof answers.prioridade === 'string' && isProfile(answers.prioridade)
        ? answers.prioridade
        : null
  }
  const unmet: DesafioCondition[] = []
  const pending: DesafioCondition[] = []
  if (answers.equipamento === 'sem_computador') unmet.push('computador')
  if (answers.equipamento === 'a_conferir') pending.push('computador')
  if (answers.formato === 'exige_ao_vivo') unmet.push('formato')
  if (answers.formato === 'a_conferir') pending.push('formato')
  if (answers.interesse_no_projeto === 'outra_atividade') unmet.push('projeto')
  if (answers.experiencia === 'independente') pending.push('nivel')
  const next =
    answers.interesse_no_projeto === 'outra_atividade'
      ? 'outra_atividade'
      : unmet.length || pending.length
        ? 'conferir_condicoes'
        : answers.interesse_no_projeto === 'conversar' || !principal
          ? 'conversar_com_filho'
          : answers.experiencia === 'interrompida'
            ? 'retomar_com_apoio'
            : 'conhecer_projeto'
  const suffix =
    principal === 'A' ? '/tempo-de-tela' : principal === 'D' ? '/iniciacao-tecnologica' : ''
  return {
    version: DESAFIO_QUIZ_VERSION,
    principal,
    motivos: profiles,
    interesses: [...answerList(answers.interesses)].sort(),
    state,
    unmet,
    pending,
    adequacy: unmet.length
      ? 'condicao_nao_atendida'
      : pending.length
        ? 'precisa_conferir'
        : 'sem_incompatibilidade_declarada',
    next,
    offerPath: `${DESAFIO_BASE}/oferta${suffix}`,
  }
}
