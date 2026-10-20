// Motor do quiz adulto v1: puro e seguro para o navegador (sem registry, IO ou conteúdo da
// oferta). Espelha o desenho do quiz Kids v5: perguntas ativas, resposta com versão e revisão,
// perfil por soma de pontos com desempate, uma condicional por perfil e condições a conferir.
import type { SelecaoStep } from '../../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../../lib/quiz-types'
import { ADULT_QUESTIONS, CALCULADORA_POR_SEMANA, PERGUNTAS_DE_PERFIL } from './questions'

export const QUIZ_VERSION = 'comunidade-adulto-v1'
export const PROFILE_IDS = {
  A: 'adulto-horas-livres',
  B: 'adulto-ideia',
  D: 'adulto-por-dentro',
} as const
export type AdultProfile = keyof typeof PROFILE_IDS
const PROFILES = Object.keys(PROFILE_IDS) as AdultProfile[]

/**
 * O perfil soma quatro respostas, uma de cada fase do SPIN. A frase que parece com a pessoa e a
 * frase-síntese valem mais: a primeira é a mais concreta, a segunda a mais refletida.
 */
export const PROFILE_WEIGHTS: Record<(typeof PERGUNTAS_DE_PERFIL)[number], number> = {
  cena: 3,
  preocupacao: 2,
  cena_desejada: 2,
  sintese: 3,
}
/** Desempate do perfil principal: a frase-síntese, depois a frase que parece com a pessoa. */
const TIE_BREAK_PRINCIPAL = ['sintese', 'cena', 'cena_desejada', 'preocupacao'] as const
/** Desempate do segundo perfil: o que incomoda, depois a cena desejada. */
const TIE_BREAK_SECUNDARIO = ['preocupacao', 'cena_desejada', 'cena', 'sintese'] as const
/** A partir disto o diagnóstico é claro; abaixo, o resultado avisa que foi o lado mais forte. */
export const CLEAR_PROFILE_MIN = 4

/** A pergunta extra de cada perfil que tem uma condição a conferir (o A não tem). */
export const CONDITIONAL_BY_PROFILE: Partial<Record<AdultProfile, string>> = {
  B: 'ferramenta',
  D: 'codigo',
}
const CONDITIONAL_KEYS = new Set(Object.values(CONDITIONAL_BY_PROFILE))

export type DecisionState = 'perfil_claro' | 'perfil_aproximado'
export type AdultCondition = 'computador' | 'formato' | 'trabalho' | 'ferramenta' | 'codigo'
export interface AdultDecision {
  profile: AdultProfile
  secondary: AdultProfile | null
  scores: Record<AdultProfile, number>
  state: DecisionState
  unmet: AdultCondition[]
  pending: AdultCondition[]
  adequacy: 'condicao_nao_atendida' | 'precisa_conferir' | 'sem_incompatibilidade_declarada'
}

export const answerList = (value: QuizAnswerValue | undefined): string[] =>
  Array.isArray(value) ? value : []
export const quizRevision = (answers: QuizAnswers): number =>
  typeof answers._quiz_revision === 'number' ? answers._quiz_revision : 0
export const isAdultProfile = (value: unknown): value is AdultProfile =>
  typeof value === 'string' && Object.hasOwn(PROFILE_IDS, value)

/** Pontos de cada perfil. Respostas neutras ("Nenhuma dessas", "Ainda estou conhecendo") não somam. */
export function profileScores(answers: QuizAnswers): Record<AdultProfile, number> {
  const scores = { A: 0, B: 0, D: 0 }
  for (const key of PERGUNTAS_DE_PERFIL) {
    const value = answers[key]
    if (isAdultProfile(value)) scores[value] += PROFILE_WEIGHTS[key]
  }
  return scores
}

function pick(
  candidates: AdultProfile[],
  answers: QuizAnswers,
  order: readonly string[],
): AdultProfile | null {
  if (candidates.length <= 1) return candidates[0] ?? null
  for (const key of order) {
    const value = answers[key]
    if (isAdultProfile(value) && candidates.includes(value)) return value
  }
  return candidates[0] ?? null
}

/**
 * O perfil somado, assim que as quatro perguntas de perfil têm resposta. A cena desejada (N8)
 * não tem opção neutra, então sempre sai um perfil.
 */
export function scoredProfile(answers: QuizAnswers): AdultProfile | null {
  if (!PERGUNTAS_DE_PERFIL.every((key) => typeof answers[key] === 'string')) return null
  const scores = profileScores(answers)
  const max = Math.max(...PROFILES.map((p) => scores[p]))
  if (max <= 0) return null
  return pick(
    PROFILES.filter((p) => scores[p] === max),
    answers,
    TIE_BREAK_PRINCIPAL,
  )
}

/** O segundo perfil: outro lado que somou ao menos 2 pontos. */
export function secondaryProfile(answers: QuizAnswers, profile: AdultProfile): AdultProfile | null {
  const scores = profileScores(answers)
  const others = PROFILES.filter((p) => p !== profile && scores[p] >= 2)
  if (!others.length) return null
  const max = Math.max(...others.map((p) => scores[p]))
  return pick(
    others.filter((p) => scores[p] === max),
    answers,
    TIE_BREAK_SECUNDARIO,
  )
}

/** As perguntas da vez: as dez de todos e a condicional do perfil somado (B ou D). */
export function activeAdultSteps(answers: QuizAnswers): SelecaoStep[] {
  const profile = scoredProfile(answers)
  const extra = profile ? CONDITIONAL_BY_PROFILE[profile] : undefined
  return ADULT_QUESTIONS.filter((s) => !CONDITIONAL_KEYS.has(s.key) || s.key === extra)
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

export function isAdultQuizComplete(answers: QuizAnswers): boolean {
  return (
    answers._quiz_version === QUIZ_VERSION &&
    activeAdultSteps(answers).every((step) => validChoice(step, answers[step.key]))
  )
}

/**
 * Grava uma resposta e devolve as respostas novas, ou null quando a pergunta não está ativa ou o
 * valor não é uma opção dela. Respostas de outra versão do quiz são descartadas.
 */
export function applyAdultAnswer(
  previous: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): QuizAnswers | null {
  const current = previous._quiz_version === QUIZ_VERSION ? previous : {}
  const step = activeAdultSteps(current).find((s) => s.key === key)
  if (!step || !validChoice(step, value)) return null
  const next: QuizAnswers = { ...current, [key]: Array.isArray(value) ? [...value].sort() : value }
  // Mudar uma resposta de perfil pode trocar a pergunta extra: a do perfil antigo sai.
  const active = new Set(activeAdultSteps(next).map((s) => s.key))
  for (const question of ADULT_QUESTIONS) if (!active.has(question.key)) delete next[question.key]
  next._quiz_version = QUIZ_VERSION
  next._quiz_revision = quizRevision(previous) + 1
  return next
}

/**
 * Se esta resposta, salva agora, completa o quiz (o botão diz "Ver o resultado"). Calcula com a
 * resposta escolhida: a frase-síntese pode abrir a pergunta extra do perfil.
 */
export function completesAdultQuiz(
  answers: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): boolean {
  const next = applyAdultAnswer(answers, key, value)
  return next !== null && isAdultQuizComplete(next)
}

export function adultDecision(answers: QuizAnswers): AdultDecision | null {
  if (!isAdultQuizComplete(answers)) return null
  const profile = scoredProfile(answers)
  if (!profile) return null
  const scores = profileScores(answers)
  const unmet: AdultCondition[] = []
  const pending: AdultCondition[] = []
  if (answers.computador === 'celular_tablet') unmet.push('computador')
  if (answers.computador === 'compartilhado' || answers.computador === 'verificar')
    pending.push('computador')
  if (answers.garantia === 'ao_vivo') unmet.push('formato')
  if (answers.garantia === 'trabalho') unmet.push('trabalho')
  if (['unity', 'unreal', 'roblox', 'outra'].includes(String(answers.ferramenta)))
    unmet.push('ferramenta')
  if (answers.ferramenta === 'nao_pensei') pending.push('ferramenta')
  if (answers.codigo === 'codigo_ja') pending.push('codigo')
  return {
    profile,
    secondary: secondaryProfile(answers, profile),
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

/** A pergunta como a pessoa a vê: na calculadora (I6), o título repete as horas da S2. */
export function stepOnScreen(step: SelecaoStep, answers: QuizAnswers): SelecaoStep {
  const porSemana = CALCULADORA_POR_SEMANA[String(answers.tempo_jogo)]
  if (step.key !== 'tempo_criacao' || !porSemana) return step
  return { ...step, titulo: `${porSemana} por ano. Quanto disso virou alguma coisa sua?` }
}
