import type { SelecaoStep } from '../../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../../lib/quiz-types'
import { flexionar, type Genero } from './genero'
import { CALCULADORA_POR_DIA, COMMUNITY_QUESTIONS, PERGUNTAS_DE_PERFIL } from './questions'

export const QUIZ_VERSION = 'comunidade-orientacao-v5'
export const PROFILE_IDS = {
  A: 'tempo-de-tela',
  B: 'criacao-de-jogos',
  C: 'expressao-visual',
  D: 'formacao-tecnologica',
  F: 'habilidades-escolares',
} as const
export type CommunityProfile = keyof typeof PROFILE_IDS
const PROFILES = Object.keys(PROFILE_IDS) as CommunityProfile[]

/**
 * O perfil soma quatro respostas, uma de cada fase do SPIN (decisão da dona: "uma pergunta só
 * não basta"). A cena de casa e a frase-síntese valem mais porque são as mais concretas e as
 * mais refletidas.
 */
export const PROFILE_WEIGHTS: Record<(typeof PERGUNTAS_DE_PERFIL)[number], number> = {
  cena: 3,
  preocupacao: 2,
  cena_desejada: 2,
  sintese: 3,
}
/** Desempate do perfil principal: a frase-síntese (a mais refletida), depois a cena de casa. */
const TIE_BREAK_PRINCIPAL = ['sintese', 'cena', 'cena_desejada', 'preocupacao'] as const
/** Desempate do segundo perfil: a preocupação, depois a cena desejada. */
const TIE_BREAK_SECUNDARIO = ['preocupacao', 'cena_desejada', 'cena', 'sintese'] as const
/** A partir disto o diagnóstico é claro; abaixo, o resultado abre com "o caminho mais perto". */
export const CLEAR_PROFILE_MIN = 4

/** A pergunta extra de cada perfil que tem uma condição a conferir. */
export const CONDITIONAL_BY_PROFILE: Partial<Record<CommunityProfile, string>> = {
  B: 'ferramenta',
  C: 'desenho',
  F: 'escola',
}
const CONDITIONAL_KEYS = new Set(Object.values(CONDITIONAL_BY_PROFILE))

export type DecisionState = 'perfil_claro' | 'perfil_aproximado'
export type Condition = 'ferramenta' | 'desenho' | 'formato' | 'computador' | 'reforco'
export interface CommunityDecision {
  profile: CommunityProfile
  secondary: CommunityProfile | null
  scores: Record<CommunityProfile, number>
  state: DecisionState
  gender: Genero
  ageBand: '9_11' | '12_14'
  unmet: Condition[]
  pending: Condition[]
  adequacy: 'condicao_nao_atendida' | 'precisa_conferir' | 'sem_incompatibilidade_declarada'
}

const IN_RANGE = new Set(['filho_9_11', 'filha_9_11', 'filho_12_14', 'filha_12_14'])

export const answerList = (value: QuizAnswerValue | undefined): string[] =>
  Array.isArray(value) ? value : []
export const inCommunityAgeRange = (answers: QuizAnswers): boolean =>
  IN_RANGE.has(String(answers.crianca))
export const isOutsideCommunityAge = (answers: QuizAnswers): boolean =>
  answers.crianca === 'menos_9' || answers.crianca === '15_mais'
export const childGender = (answers: QuizAnswers): Genero =>
  String(answers.crianca).startsWith('filha') ? 'f' : 'm'
export const quizRevision = (answers: QuizAnswers): number =>
  typeof answers._quiz_revision === 'number' ? answers._quiz_revision : 0
const isProfile = (value: unknown): value is CommunityProfile =>
  typeof value === 'string' && Object.hasOwn(PROFILE_IDS, value)

/** Pontos de cada perfil. Respostas neutras ("nenhuma", "ainda quero conhecer") não somam. */
export function profileScores(answers: QuizAnswers): Record<CommunityProfile, number> {
  const scores = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  for (const key of PERGUNTAS_DE_PERFIL) {
    const value = answers[key]
    if (isProfile(value)) scores[value] += PROFILE_WEIGHTS[key]
  }
  return scores
}

function pick(
  candidates: CommunityProfile[],
  answers: QuizAnswers,
  order: readonly string[],
): CommunityProfile | null {
  if (candidates.length <= 1) return candidates[0] ?? null
  for (const key of order) {
    const value = answers[key]
    if (isProfile(value) && candidates.includes(value)) return value
  }
  return candidates[0] ?? null
}

/**
 * O perfil somado, assim que as quatro perguntas de perfil têm resposta. A cena desejada (N8)
 * não tem opção neutra, então sempre sai um perfil.
 */
export function scoredProfile(answers: QuizAnswers): CommunityProfile | null {
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

function secondaryProfile(answers: QuizAnswers, profile: CommunityProfile) {
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

/** Pure and browser-safe: no registry, IO or offer content imports. */
export function activeCommunitySteps(answers: QuizAnswers): SelecaoStep[] {
  if (!inCommunityAgeRange(answers)) return COMMUNITY_QUESTIONS.filter((s) => s.key === 'crianca')
  const profile = scoredProfile(answers)
  const extra = profile ? CONDITIONAL_BY_PROFILE[profile] : undefined
  return COMMUNITY_QUESTIONS.filter((s) => !CONDITIONAL_KEYS.has(s.key) || s.key === extra)
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
  // Mudar uma resposta de perfil pode trocar a pergunta extra: a do perfil antigo sai.
  const active = new Set(activeCommunitySteps(next).map((s) => s.key))
  for (const question of COMMUNITY_QUESTIONS)
    if (!active.has(question.key)) delete next[question.key]
  next._quiz_version = QUIZ_VERSION
  next._quiz_revision = quizRevision(previous) + 1
  return next
}

/**
 * Se esta resposta, salva agora, completa o quiz (o botão diz "Ver o resultado"). Calcula com a
 * resposta escolhida: a frase-síntese pode abrir uma pergunta extra, e corrigir a idade não
 * termina nada.
 */
export function completesQuiz(answers: QuizAnswers, key: string, value: QuizAnswerValue): boolean {
  const next = applyCommunityAnswer(answers, key, value)
  return next !== null && isCommunityQuizComplete(next)
}

export function communityDecision(answers: QuizAnswers): CommunityDecision | null {
  if (!isCommunityQuizComplete(answers)) return null
  const profile = scoredProfile(answers)
  if (!profile) return null
  const scores = profileScores(answers)
  const unmet: Condition[] = []
  const pending: Condition[] = []
  if (answers.computador === 'celular_tablet') unmet.push('computador')
  if (answers.computador === 'organizar' || answers.computador === 'verificar')
    pending.push('computador')
  if (answers.garantia === 'ao_vivo') unmet.push('formato')
  if (answers.ferramenta === 'roblox' || answers.ferramenta === 'minecraft')
    unmet.push('ferramenta')
  if (answers.ferramenta === 'outra' || answers.ferramenta === 'conversar')
    pending.push('ferramenta')
  if (answers.desenho === 'so_desenho') unmet.push('desenho')
  if (answers.escola === 'reforco') pending.push('reforco')
  return {
    profile,
    secondary: secondaryProfile(answers, profile),
    scores,
    state: scores[profile] >= CLEAR_PROFILE_MIN ? 'perfil_claro' : 'perfil_aproximado',
    gender: childGender(answers),
    ageBand: String(answers.crianca).endsWith('12_14') ? '12_14' : '9_11',
    unmet,
    pending,
    adequacy: unmet.length
      ? 'condicao_nao_atendida'
      : pending.length
        ? 'precisa_conferir'
        : 'sem_incompatibilidade_declarada',
  }
}

/**
 * A pergunta como a família a vê: no feminino quando a P1 é "Filha" e, na calculadora (I6), com o
 * título montado pelo tempo de tela da S2.
 */
export function stepOnScreen(step: SelecaoStep, answers: QuizAnswers): SelecaoStep {
  const genero = childGender(answers)
  const porDia = CALCULADORA_POR_DIA[String(answers.tempo_tela)]
  const titulo =
    step.key === 'tempo_criacao' && porDia
      ? `${porDia} por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?`
      : step.titulo
  if (step.key === 'crianca') return step
  return {
    ...step,
    titulo: flexionar(titulo, genero),
    subtitulo: step.subtitulo && flexionar(step.subtitulo, genero),
    opcoes: step.opcoes.map((o) => ({ ...o, label: flexionar(o.label, genero) })),
  }
}
