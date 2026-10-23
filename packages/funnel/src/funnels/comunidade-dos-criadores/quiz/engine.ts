import type { SelecaoStep } from '../../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../../lib/quiz-types'
import { flexionar, type Genero } from './genero'
import {
  CALCULADORA_POR_DIA,
  COMMUNITY_QUESTIONS,
  type CommunityBranch,
  GENERO_STEP,
  IDADE_STEP,
  PERGUNTAS_DE_PERFIL,
  PERGUNTAS_DE_PERFIL_M9,
  QUESTIONS_9A17,
  QUESTIONS_M9,
} from './questions'

// Motor do quiz v6 (20/10/2026). Puro e seguro no navegador: sem registry, IO ou copy da oferta.
// A entrada (filho ou filha, idade) é comum; a idade abre o ramo 9 a 17 (a lógica da v5), o ramo
// menor de 9 (criar junto) ou a saída de 18 ou mais.

export const QUIZ_VERSION = 'comunidade-orientacao-v6'

/** Perfis do ramo 9 a 17 (as letras da v5) e os slugs gravados no lead (≤ 32 caracteres). */
export const PROFILE_IDS = {
  A: '9a17-tela',
  B: '9a17-jogos',
  C: '9a17-desenho',
  D: '9a17-programacao',
  F: '9a17-escola',
} as const
export type CommunityProfile = keyof typeof PROFILE_IDS
const PROFILES = Object.keys(PROFILE_IDS) as CommunityProfile[]

/** Perfis do ramo menor de 9. */
export const PROFILE_IDS_M9 = {
  A: 'm9-tempo-a-dois',
  B: 'm9-ideias',
  D: 'm9-curiosidade',
} as const
export type M9Profile = keyof typeof PROFILE_IDS_M9
const PROFILES_M9 = Object.keys(PROFILE_IDS_M9) as M9Profile[]

/**
 * O perfil soma quatro respostas, uma de cada fase do SPIN (decisão da dona: "uma pergunta só
 * não basta"). A cena de casa e a frase-síntese valem mais porque são as mais concretas e as
 * mais refletidas. Os dois ramos usam os mesmos pesos.
 */
export const PROFILE_WEIGHTS: Record<(typeof PERGUNTAS_DE_PERFIL)[number], number> = {
  cena: 3,
  preocupacao: 2,
  cena_desejada: 2,
  sintese: 3,
}
const PESO_M9: Record<(typeof PERGUNTAS_DE_PERFIL_M9)[number], number> = {
  m9_cena: 3,
  m9_preocupacao: 2,
  m9_cena_desejada: 2,
  m9_sintese: 3,
}
/** Desempate do perfil principal: a frase-síntese (a mais refletida), depois a cena de casa. */
const TIE_BREAK_PRINCIPAL = ['sintese', 'cena', 'cena_desejada', 'preocupacao'] as const
const TIE_BREAK_PRINCIPAL_M9 = ['m9_sintese', 'm9_cena', 'm9_cena_desejada', 'm9_preocupacao']
/** Desempate do segundo perfil: a preocupação, depois a cena desejada. */
const TIE_BREAK_SECUNDARIO = ['preocupacao', 'cena_desejada', 'cena', 'sintese'] as const
const TIE_BREAK_SECUNDARIO_M9 = ['m9_preocupacao', 'm9_cena_desejada', 'm9_cena', 'm9_sintese']
/** A partir disto o diagnóstico é claro; abaixo, o resultado abre com "o caminho mais perto". */
export const CLEAR_PROFILE_MIN = 4

/** A pergunta extra de cada perfil do ramo 9 a 17 que tem uma condição a conferir. */
export const CONDITIONAL_BY_PROFILE: Partial<Record<CommunityProfile, string>> = {
  B: 'ferramenta',
  C: 'desenho',
  F: 'escola',
}
const CONDITIONAL_KEYS = new Set(Object.values(CONDITIONAL_BY_PROFILE))

export type DecisionState = 'perfil_claro' | 'perfil_aproximado'
export type Condition = 'ferramenta' | 'desenho' | 'formato' | 'computador' | 'reforco' | 'sozinho'
export type Adequacy =
  | 'condicao_nao_atendida'
  | 'precisa_conferir'
  | 'sem_incompatibilidade_declarada'

interface DecisionBase {
  scores: Record<string, number>
  state: DecisionState
  gender: Genero
  unmet: Condition[]
  pending: Condition[]
  adequacy: Adequacy
}
export interface Decision917 extends DecisionBase {
  branch: '9a17'
  profile: CommunityProfile
  secondary: CommunityProfile | null
  ageBand: '9_12' | '13_17'
}
export interface DecisionM9 extends DecisionBase {
  branch: 'm9'
  profile: M9Profile
  secondary: M9Profile | null
}
export type CommunityDecision = Decision917 | DecisionM9

export const answerList = (value: QuizAnswerValue | undefined): string[] =>
  Array.isArray(value) ? value : []
export const childGender = (answers: QuizAnswers): Genero =>
  answers.genero === 'filha' ? 'f' : 'm'
export const quizRevision = (answers: QuizAnswers): number =>
  typeof answers._quiz_revision === 'number' ? answers._quiz_revision : 0
/** As respostas desta versão (as de outra versão contam como vazias). */
const atuais = (answers: QuizAnswers): QuizAnswers =>
  answers._quiz_version === QUIZ_VERSION ? answers : {}

/** O ramo que a idade abre, ou null antes da escolha. */
export function communityBranch(answers: QuizAnswers): CommunityBranch | null {
  const idade = atuais(answers).idade
  if (idade === '9_12' || idade === '13_17') return '9a17'
  if (idade === 'menos_9') return 'm9'
  if (idade === '18_mais') return 'adulto'
  return null
}
/** 18 ou mais: a orientação Kids termina e a pessoa vai para o quiz adulto. */
export const isAdultExit = (answers: QuizAnswers): boolean => communityBranch(answers) === 'adulto'

const isProfile = (value: unknown): value is CommunityProfile =>
  typeof value === 'string' && Object.hasOwn(PROFILE_IDS, value)
/** No menor de 9, a cena dos avós (`A2`) soma para o tempo a dois (A). */
const asM9Profile = (value: unknown): M9Profile | null =>
  value === 'A2'
    ? 'A'
    : typeof value === 'string' && Object.hasOwn(PROFILE_IDS_M9, value)
      ? (value as M9Profile)
      : null

/** Pontos de cada perfil do ramo 9 a 17. Respostas neutras não somam. */
export function profileScores(answers: QuizAnswers): Record<CommunityProfile, number> {
  const scores = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  for (const key of PERGUNTAS_DE_PERFIL) {
    const value = answers[key]
    if (isProfile(value)) scores[value] += PROFILE_WEIGHTS[key]
  }
  return scores
}

/** Pontos de cada perfil do ramo menor de 9. O irmão e as respostas neutras não somam. */
export function profileScoresM9(answers: QuizAnswers): Record<M9Profile, number> {
  const scores = { A: 0, B: 0, D: 0 }
  for (const key of PERGUNTAS_DE_PERFIL_M9) {
    const profile = asM9Profile(answers[key])
    if (profile) scores[profile] += PESO_M9[key]
  }
  return scores
}

function pick<P extends string>(
  candidates: P[],
  answers: QuizAnswers,
  order: readonly string[],
  read: (value: unknown) => P | null,
): P | null {
  if (candidates.length <= 1) return candidates[0] ?? null
  for (const key of order) {
    const value = read(answers[key])
    if (value && candidates.includes(value)) return value
  }
  return candidates[0] ?? null
}
const readProfile = (value: unknown) => (isProfile(value) ? value : null)

/** O perfil somado do ramo 9 a 17, assim que as quatro perguntas de perfil têm resposta. */
export function scoredProfile(answers: QuizAnswers): CommunityProfile | null {
  if (!PERGUNTAS_DE_PERFIL.every((key) => typeof answers[key] === 'string')) return null
  const scores = profileScores(answers)
  const max = Math.max(...PROFILES.map((p) => scores[p]))
  if (max <= 0) return null
  return pick(
    PROFILES.filter((p) => scores[p] === max),
    answers,
    TIE_BREAK_PRINCIPAL,
    readProfile,
  )
}

/** O perfil somado do ramo menor de 9 (a cena desejada não tem opção neutra). */
export function scoredProfileM9(answers: QuizAnswers): M9Profile | null {
  if (!PERGUNTAS_DE_PERFIL_M9.every((key) => typeof answers[key] === 'string')) return null
  const scores = profileScoresM9(answers)
  const max = Math.max(...PROFILES_M9.map((p) => scores[p]))
  if (max <= 0) return null
  return pick(
    PROFILES_M9.filter((p) => scores[p] === max),
    answers,
    TIE_BREAK_PRINCIPAL_M9,
    asM9Profile,
  )
}

function secondaryOf<P extends string>(
  scores: Record<P, number>,
  profile: P,
  answers: QuizAnswers,
  order: readonly string[],
  read: (value: unknown) => P | null,
): P | null {
  const others = (Object.keys(scores) as P[]).filter((p) => p !== profile && scores[p] >= 2)
  if (!others.length) return null
  const max = Math.max(...others.map((p) => scores[p]))
  return pick(
    others.filter((p) => scores[p] === max),
    answers,
    order,
    read,
  )
}

/** A lista ativa do percurso: a entrada e, pela idade, as perguntas do ramo. */
export function activeCommunitySteps(answers: QuizAnswers): SelecaoStep[] {
  const current = atuais(answers)
  const branch = communityBranch(current)
  if (branch === 'm9') return [GENERO_STEP, IDADE_STEP, ...QUESTIONS_M9]
  if (branch !== '9a17') return [GENERO_STEP, IDADE_STEP]
  const profile = scoredProfile(current)
  const extra = profile ? CONDITIONAL_BY_PROFILE[profile] : undefined
  return [
    GENERO_STEP,
    IDADE_STEP,
    ...QUESTIONS_9A17.filter((s) => !CONDITIONAL_KEYS.has(s.key) || s.key === extra),
  ]
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

/** Completo só nos ramos que têm resultado (9 a 17 e menor de 9). */
export function isCommunityQuizComplete(answers: QuizAnswers): boolean {
  const branch = communityBranch(answers)
  return (
    (branch === '9a17' || branch === 'm9') &&
    activeCommunitySteps(answers).every((step) => validChoice(step, answers[step.key]))
  )
}

export function applyCommunityAnswer(
  previous: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): QuizAnswers | null {
  const current = atuais(previous)
  const step = activeCommunitySteps(current).find((s) => s.key === key)
  if (!step || !validChoice(step, value)) return null
  const next: QuizAnswers = { ...current, [key]: Array.isArray(value) ? [...value].sort() : value }
  next._quiz_version = QUIZ_VERSION
  // Trocar a idade troca o ramo, e mudar uma resposta de perfil pode trocar a pergunta extra: as
  // respostas que saíram do percurso são apagadas.
  const active = new Set(activeCommunitySteps(next).map((s) => s.key))
  for (const question of COMMUNITY_QUESTIONS)
    if (!active.has(question.key)) delete next[question.key]
  next._quiz_revision = quizRevision(previous) + 1
  return next
}

/**
 * Se esta resposta, salva agora, completa o quiz (o próximo passo é o resultado). Calcula com a
 * resposta escolhida: a frase-síntese pode abrir uma pergunta extra.
 */
export function completesQuiz(answers: QuizAnswers, key: string, value: QuizAnswerValue): boolean {
  const next = applyCommunityAnswer(answers, key, value)
  return next !== null && isCommunityQuizComplete(next)
}

const adequacyOf = (unmet: Condition[], pending: Condition[]): Adequacy =>
  unmet.length
    ? 'condicao_nao_atendida'
    : pending.length
      ? 'precisa_conferir'
      : 'sem_incompatibilidade_declarada'

export function communityDecision(answers: QuizAnswers): CommunityDecision | null {
  if (!isCommunityQuizComplete(answers)) return null
  const gender = childGender(answers)
  const unmet: Condition[] = []
  const pending: Condition[] = []
  if (communityBranch(answers) === 'm9') {
    const profile = scoredProfileM9(answers)
    if (!profile) return null
    const scores = profileScoresM9(answers)
    if (answers.m9_computador === 'celular_tablet') unmet.push('computador')
    if (answers.m9_computador === 'organizar' || answers.m9_computador === 'verificar')
      pending.push('computador')
    if (answers.m9_garantia === 'ao_vivo') unmet.push('formato')
    if (answers.m9_garantia === 'sozinho') pending.push('sozinho')
    return {
      branch: 'm9',
      profile,
      secondary: secondaryOf(scores, profile, answers, TIE_BREAK_SECUNDARIO_M9, asM9Profile),
      scores,
      state: scores[profile] >= CLEAR_PROFILE_MIN ? 'perfil_claro' : 'perfil_aproximado',
      gender,
      unmet,
      pending,
      adequacy: adequacyOf(unmet, pending),
    }
  }
  const profile = scoredProfile(answers)
  if (!profile) return null
  const scores = profileScores(answers)
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
    branch: '9a17',
    profile,
    secondary: secondaryOf(scores, profile, answers, TIE_BREAK_SECUNDARIO, readProfile),
    scores,
    state: scores[profile] >= CLEAR_PROFILE_MIN ? 'perfil_claro' : 'perfil_aproximado',
    gender,
    ageBand: answers.idade === '13_17' ? '13_17' : '9_12',
    unmet,
    pending,
    adequacy: adequacyOf(unmet, pending),
  }
}

/** O slug do perfil gravado no lead (`computePerfil`). */
export function communityProfileSlug(answers: QuizAnswers): string | null {
  const decision = communityDecision(answers)
  if (!decision) return null
  return decision.branch === 'm9' ? PROFILE_IDS_M9[decision.profile] : PROFILE_IDS[decision.profile]
}

/**
 * A pergunta como a família a vê: no feminino quando a entrada é "Na minha filha" e, na
 * calculadora (I6), com o título montado pelo tempo de tela da S2.
 */
export function stepOnScreen(step: SelecaoStep, answers: QuizAnswers): SelecaoStep {
  if (step.key === 'genero') return step
  const genero = childGender(answers)
  const porDia = CALCULADORA_POR_DIA[String(answers.tempo_tela)]
  const titulo =
    step.key === 'tempo_criacao' && porDia
      ? `${porDia} por ano em jogos e vídeos. Quanto desse tempo vira alguma coisa que ele mesmo fez?`
      : step.titulo
  return {
    ...step,
    titulo: flexionar(titulo, genero),
    subtitulo: step.subtitulo && flexionar(step.subtitulo, genero),
    opcoes: step.opcoes.map((o) => ({ ...o, label: flexionar(o.label, genero) })),
  }
}
