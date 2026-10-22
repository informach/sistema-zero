// Motor do quiz adulto do Desafio, v1 (21/10/2026). Puro e seguro no navegador: sem registry, IO
// ou copy da oferta. Oito perguntas para todos, sem ramo nem condicional; perfil por soma de pontos
// com desempate, e as condições que a oferta não atende ditas na carta.
import type { SelecaoStep } from '../../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../../lib/quiz-types'
import { DESAFIO_ADULTO_QUESTIONS, PERGUNTAS_DE_PERFIL } from './questions'

export const QUIZ_VERSION = 'desafio-adulto-v1'
export const PROFILE_IDS = {
  A: 'desafio-adulto-horas',
  B: 'desafio-adulto-ideia',
  D: 'desafio-adulto-por-dentro',
} as const
export type DesafioAdultoProfile = keyof typeof PROFILE_IDS
const PROFILES = Object.keys(PROFILE_IDS) as DesafioAdultoProfile[]

/** A frase que parece com a pessoa e a síntese valem mais; a cena de daqui a um mês completa. */
export const PROFILE_WEIGHTS: Record<(typeof PERGUNTAS_DE_PERFIL)[number], number> = {
  cena: 3,
  cena_desejada: 2,
  sintese: 3,
}
/** Desempate: a síntese, depois a frase que parece com a pessoa, depois a cena desejada. */
const TIE_BREAK = ['sintese', 'cena', 'cena_desejada'] as const
/** A partir disto o diagnóstico é claro; abaixo, a carta avisa que é um caminho aproximado. */
export const CLEAR_PROFILE_MIN = 4

export type DecisionState = 'perfil_claro' | 'perfil_aproximado'
/** `computador`: só celular ou tablet (ou a conferir); `formato`: aula ao vivo; `trabalho`. */
export type Condition = 'computador' | 'formato' | 'trabalho'
export type Adequacy =
  | 'condicao_nao_atendida'
  | 'precisa_conferir'
  | 'sem_incompatibilidade_declarada'
export interface DesafioAdultoDecision {
  profile: DesafioAdultoProfile
  scores: Record<DesafioAdultoProfile, number>
  state: DecisionState
  unmet: Condition[]
  pending: Condition[]
  adequacy: Adequacy
}

export const quizRevision = (answers: QuizAnswers): number =>
  typeof answers._quiz_revision === 'number' ? answers._quiz_revision : 0
const isProfile = (value: unknown): value is DesafioAdultoProfile =>
  typeof value === 'string' && Object.hasOwn(PROFILE_IDS, value)

/** Pontos de cada perfil. Respostas neutras ("Nenhuma dessas", "Ainda estou conhecendo") não somam. */
export function profileScores(answers: QuizAnswers): Record<DesafioAdultoProfile, number> {
  const scores = { A: 0, B: 0, D: 0 }
  for (const key of PERGUNTAS_DE_PERFIL) {
    const value = answers[key]
    if (isProfile(value)) scores[value] += PROFILE_WEIGHTS[key]
  }
  return scores
}

/** O perfil, assim que as três perguntas de perfil têm resposta (a cena desejada não tem neutra). */
export function scoredProfile(answers: QuizAnswers): DesafioAdultoProfile | null {
  if (!PERGUNTAS_DE_PERFIL.every((key) => typeof answers[key] === 'string')) return null
  const scores = profileScores(answers)
  const max = Math.max(...PROFILES.map((p) => scores[p]))
  if (max <= 0) return null
  const candidates = PROFILES.filter((p) => scores[p] === max)
  if (candidates.length === 1) return candidates[0] ?? null
  for (const key of TIE_BREAK) {
    const value = answers[key]
    if (isProfile(value) && candidates.includes(value)) return value
  }
  return candidates[0] ?? null
}

/** As perguntas da vez: as oito, sempre. */
export const activeDesafioAdultoSteps = (_answers: QuizAnswers): SelecaoStep[] =>
  DESAFIO_ADULTO_QUESTIONS

export function validChoice(step: SelecaoStep, value: unknown): boolean {
  return typeof value === 'string' && step.opcoes.some((o) => o.value === value)
}

export function isDesafioAdultoQuizComplete(answers: QuizAnswers): boolean {
  return (
    answers._quiz_version === QUIZ_VERSION &&
    DESAFIO_ADULTO_QUESTIONS.every((step) => validChoice(step, answers[step.key]))
  )
}

/**
 * Grava uma resposta e devolve as respostas novas, ou null quando a pergunta não existe ou o valor
 * não é uma opção dela. Respostas de outra versão do quiz são descartadas.
 */
export function applyDesafioAdultoAnswer(
  previous: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): QuizAnswers | null {
  const current = previous._quiz_version === QUIZ_VERSION ? previous : {}
  const step = DESAFIO_ADULTO_QUESTIONS.find((s) => s.key === key)
  if (!step || !validChoice(step, value)) return null
  return {
    ...current,
    [key]: value,
    _quiz_version: QUIZ_VERSION,
    _quiz_revision: quizRevision(previous) + 1,
  }
}

/** Se esta resposta, salva agora, completa o quiz (o botão diz "Ver o resultado"). */
export function completesDesafioAdultoQuiz(
  answers: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): boolean {
  const next = applyDesafioAdultoAnswer(answers, key, value)
  return next !== null && isDesafioAdultoQuizComplete(next)
}

export function desafioAdultoDecision(answers: QuizAnswers): DesafioAdultoDecision | null {
  if (!isDesafioAdultoQuizComplete(answers)) return null
  const profile = scoredProfile(answers)
  if (!profile) return null
  const scores = profileScores(answers)
  const unmet: Condition[] = []
  const pending: Condition[] = []
  if (answers.computador === 'celular_tablet') unmet.push('computador')
  if (answers.computador === 'verificar') pending.push('computador')
  if (answers.garantia === 'ao_vivo') unmet.push('formato')
  if (answers.garantia === 'trabalho') unmet.push('trabalho')
  return {
    profile,
    scores,
    state: scores[profile] >= CLEAR_PROFILE_MIN ? 'perfil_claro' : 'perfil_aproximado',
    unmet,
    pending,
    adequacy: unmet.length
      ? 'condicao_nao_atendida'
      : pending.length
        ? 'precisa_conferir'
        : 'sem_incompatibilidade_declarada',
  }
}

/** O slug do perfil gravado no lead (aba Perfis do /admin). */
export function desafioAdultoProfileSlug(answers: QuizAnswers): string | null {
  const d = desafioAdultoDecision(answers)
  return d ? PROFILE_IDS[d.profile] : null
}
