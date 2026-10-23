import type { SelecaoStep } from '../../../content/quiz-config'
import type { QuizAnswers, QuizAnswerValue } from '../../../lib/quiz-types'
import { flexionar, type Genero } from '../../comunidade-dos-criadores/quiz/genero'
import {
  DESAFIO_QUESTIONS,
  type DesafioBranch,
  GENERO_STEP,
  IDADE_STEP,
  PERGUNTAS_DE_PERFIL,
  PERGUNTAS_DE_PERFIL_M9,
  QUESTIONS_9A17,
  QUESTIONS_M9,
} from './questions'

// Motor do quiz Kids do Desafio, v5 (21/10/2026). Puro e seguro no navegador: sem registry, IO ou
// copy da oferta. A entrada (filho ou filha, idade) é comum; a idade abre o ramo de 9 a 17, o ramo
// menor de 9 (criar junto) ou a saída de 18 ou mais, que leva ao quiz adulto do Desafio.

export const QUIZ_VERSION = 'desafio-farol-v5'

/**
 * Perfis do ramo de 9 a 17. Os slugs são os da v4, para a aba Perfis do /admin continuar
 * comparável entre as versões (A tempo de tela, B a ideia de jogo, C personagens, D por dentro).
 */
export const PROFILE_IDS = {
  A: 'tempo-de-tela',
  B: 'criacao-de-jogos',
  C: 'expressao-visual',
  D: 'iniciacao-tecnologica',
} as const
export type DesafioProfile = keyof typeof PROFILE_IDS
const PROFILES = Object.keys(PROFILE_IDS) as DesafioProfile[]

/** Perfis do ramo menor de 9. */
export const PROFILE_IDS_M9 = {
  A: 'm9-tempo-a-dois',
  B: 'm9-ideias',
  D: 'm9-curiosidade',
} as const
export type M9Profile = keyof typeof PROFILE_IDS_M9
const PROFILES_M9 = Object.keys(PROFILE_IDS_M9) as M9Profile[]

/**
 * O perfil soma três respostas: a cena de casa e a síntese valem mais (a mais concreta e a mais
 * refletida); a cena desejada completa. Os dois ramos usam os mesmos pesos.
 */
export const PROFILE_WEIGHTS: Record<(typeof PERGUNTAS_DE_PERFIL)[number], number> = {
  cena: 3,
  cena_desejada: 2,
  sintese: 3,
}
const PESO_M9: Record<(typeof PERGUNTAS_DE_PERFIL_M9)[number], number> = {
  m9_cena: 3,
  m9_cena_desejada: 2,
  m9_sintese: 3,
}
/** Desempate do perfil principal: a síntese, depois a cena de casa, depois a cena desejada. */
const TIE_BREAK = ['sintese', 'cena', 'cena_desejada'] as const
const TIE_BREAK_M9 = ['m9_sintese', 'm9_cena', 'm9_cena_desejada'] as const
/** A partir disto o diagnóstico é claro; abaixo, a carta avisa que é um caminho aproximado. */
export const CLEAR_PROFILE_MIN = 4

export type DecisionState = 'perfil_claro' | 'perfil_aproximado'
/** `computador`: só celular ou tablet (ou a conferir); `formato`: professor ao vivo. */
export type Condition = 'computador' | 'formato'
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
  profile: DesafioProfile
  ageBand: '9_12' | '13_17'
}
export interface DecisionM9 extends DecisionBase {
  branch: 'm9'
  profile: M9Profile
}
export type DesafioDecision = Decision917 | DecisionM9

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
export function desafioBranch(answers: QuizAnswers): DesafioBranch | null {
  const idade = atuais(answers).idade
  if (idade === '9_12' || idade === '13_17') return '9a17'
  if (idade === 'menos_9') return 'm9'
  if (idade === '18_mais') return 'adulto'
  return null
}
/** 18 ou mais: o quiz Kids termina e a pessoa vai para o quiz adulto do Desafio. */
export const isAdultExit = (answers: QuizAnswers): boolean => desafioBranch(answers) === 'adulto'

const isProfile = (value: unknown): value is DesafioProfile =>
  typeof value === 'string' && Object.hasOwn(PROFILE_IDS, value)
/** No menor de 9, a cena dos avós (`A2`) soma para o tempo a dois (A). */
const asM9Profile = (value: unknown): M9Profile | null =>
  value === 'A2'
    ? 'A'
    : typeof value === 'string' && Object.hasOwn(PROFILE_IDS_M9, value)
      ? (value as M9Profile)
      : null

/** Pontos de cada perfil no ramo de 9 a 17. Respostas neutras não somam. */
export function profileScores(answers: QuizAnswers): Record<DesafioProfile, number> {
  const scores = { A: 0, B: 0, C: 0, D: 0 }
  for (const key of PERGUNTAS_DE_PERFIL) {
    const value = answers[key]
    if (isProfile(value)) scores[value] += PROFILE_WEIGHTS[key]
  }
  return scores
}

/** Pontos de cada perfil no ramo menor de 9. */
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

/** O perfil do ramo de 9 a 17, assim que as três perguntas de perfil têm resposta. */
export function scoredProfile(answers: QuizAnswers): DesafioProfile | null {
  if (!PERGUNTAS_DE_PERFIL.every((key) => typeof answers[key] === 'string')) return null
  const scores = profileScores(answers)
  const max = Math.max(...PROFILES.map((p) => scores[p]))
  if (max <= 0) return null
  return pick(
    PROFILES.filter((p) => scores[p] === max),
    answers,
    TIE_BREAK,
    (v) => (isProfile(v) ? v : null),
  )
}

/** O perfil do ramo menor de 9. */
export function scoredProfileM9(answers: QuizAnswers): M9Profile | null {
  if (!PERGUNTAS_DE_PERFIL_M9.every((key) => typeof answers[key] === 'string')) return null
  const scores = profileScoresM9(answers)
  const max = Math.max(...PROFILES_M9.map((p) => scores[p]))
  if (max <= 0) return null
  return pick(
    PROFILES_M9.filter((p) => scores[p] === max),
    answers,
    TIE_BREAK_M9,
    asM9Profile,
  )
}

/** As perguntas da vez: a entrada e as do ramo que a idade abriu (nenhuma no 18 ou mais). */
export function activeDesafioSteps(answers: QuizAnswers): SelecaoStep[] {
  const branch = desafioBranch(answers)
  if (branch === '9a17') return [GENERO_STEP, IDADE_STEP, ...QUESTIONS_9A17]
  if (branch === 'm9') return [GENERO_STEP, IDADE_STEP, ...QUESTIONS_M9]
  return [GENERO_STEP, IDADE_STEP]
}

export function validChoice(step: SelecaoStep, value: unknown): boolean {
  const allowed = new Set(step.opcoes.map((o) => o.value))
  return typeof value === 'string' && allowed.has(value)
}

/** Completo quando o ramo foi respondido inteiro (o 18 ou mais nunca completa: ele sai). */
export function isDesafioQuizComplete(answers: QuizAnswers): boolean {
  if (answers._quiz_version !== QUIZ_VERSION) return false
  const branch = desafioBranch(answers)
  if (branch !== '9a17' && branch !== 'm9') return false
  return activeDesafioSteps(answers).every((step) => validChoice(step, answers[step.key]))
}

/**
 * Grava uma resposta e devolve as respostas novas, ou null quando a pergunta não está ativa ou o
 * valor não é uma opção dela. Respostas de outra versão do quiz são descartadas; trocar a idade
 * de ramo apaga as respostas do ramo anterior.
 */
export function applyDesafioAnswer(
  previous: QuizAnswers,
  key: string,
  value: QuizAnswerValue,
): QuizAnswers | null {
  const current = atuais(previous)
  const withAge = key === IDADE_STEP.key ? { ...current, idade: value } : current
  const step = activeDesafioSteps(
    withAge._quiz_version ? withAge : { ...withAge, _quiz_version: QUIZ_VERSION },
  ).find((s) => s.key === key)
  if (!step || !validChoice(step, value)) return null
  const next: QuizAnswers = { ...current, [key]: value, _quiz_version: QUIZ_VERSION }
  const active = new Set(activeDesafioSteps(next).map((s) => s.key))
  for (const question of DESAFIO_QUESTIONS) if (!active.has(question.key)) delete next[question.key]
  next._quiz_revision = quizRevision(previous) + 1
  return next
}

/** Se esta resposta, salva agora, completa o quiz (o leitor de tela ouve "e ver o resultado"). */
export function completesQuiz(answers: QuizAnswers, key: string, value: QuizAnswerValue): boolean {
  const next = applyDesafioAnswer(answers, key, value)
  return next !== null && isDesafioQuizComplete(next)
}

function adequacyOf(unmet: Condition[], pending: Condition[]): Adequacy {
  return unmet.length
    ? 'condicao_nao_atendida'
    : pending.length
      ? 'precisa_conferir'
      : 'sem_incompatibilidade_declarada'
}

export function desafioDecision(answers: QuizAnswers): DesafioDecision | null {
  if (!isDesafioQuizComplete(answers)) return null
  const gender = childGender(answers)
  if (desafioBranch(answers) === 'm9') {
    const profile = scoredProfileM9(answers)
    if (!profile) return null
    const scores = profileScoresM9(answers)
    const unmet: Condition[] = []
    const pending: Condition[] = []
    if (answers.m9_computador === 'celular_tablet') unmet.push('computador')
    if (answers.m9_computador === 'verificar') pending.push('computador')
    if (answers.m9_garantia === 'ao_vivo') unmet.push('formato')
    return {
      branch: 'm9',
      profile,
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
  const unmet: Condition[] = []
  const pending: Condition[] = []
  if (answers.computador === 'celular_tablet') unmet.push('computador')
  if (answers.computador === 'verificar') pending.push('computador')
  if (answers.garantia === 'ao_vivo') unmet.push('formato')
  return {
    branch: '9a17',
    profile,
    scores,
    state: scores[profile] >= CLEAR_PROFILE_MIN ? 'perfil_claro' : 'perfil_aproximado',
    gender,
    unmet,
    pending,
    adequacy: adequacyOf(unmet, pending),
    ageBand: answers.idade === '13_17' ? '13_17' : '9_12',
  }
}

/** O slug do perfil gravado no lead (aba Perfis do /admin). */
export function desafioProfileSlug(answers: QuizAnswers): string | null {
  const d = desafioDecision(answers)
  if (!d) return null
  return d.branch === 'm9' ? PROFILE_IDS_M9[d.profile] : PROFILE_IDS[d.profile]
}

/** A pergunta como a família a vê: no feminino quando a entrada foi "Na minha filha". */
export function stepOnScreen(step: SelecaoStep, answers: QuizAnswers): SelecaoStep {
  if (childGender(answers) !== 'f' || step.key === GENERO_STEP.key) return step
  const f = (s: string) => flexionar(s, 'f')
  return {
    ...step,
    titulo: f(step.titulo),
    ...(step.subtitulo ? { subtitulo: f(step.subtitulo) } : {}),
    opcoes: step.opcoes.map((o) => ({ ...o, label: f(o.label) })),
  }
}
