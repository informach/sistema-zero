import type { QuizAnswerValue } from '../../lib/quiz-types'

export type AdultMode = 'desafio' | 'comunidade'
export type QuestionId =
  | 'interesse'
  | 'experiencia'
  | 'computador'
  | 'trava'
  | 'ajuda'
  | 'condicao'
  | 'efeito'
  | 'peso'
  | 'conquista'
  | 'beneficio'
export type Goal = 'comecar' | 'compreender' | 'concluir' | 'autoria' | 'explorar'
export interface CompleteAnswers {
  interesse: 'ideia' | 'entender' | 'prazer' | 'descobrir'
  experiencia: 'nunca' | 'acompanhei' | 'parei' | 'terminei' | 'proprio'
  computador: 'meu' | 'compartilhado' | 'verificar' | 'celular'
  trava: 'comecar' | 'entender' | 'testar' | 'organizar' | 'nenhuma'
  ajuda: 'paro' | 'repito' | 'investigo' | 'pergunto' | 'nao_sei'
  condicao: Array<'tempo' | 'apoio' | 'ao_vivo' | 'livre' | 'nenhuma'>
  efeito: 'guardado' | 'referencias' | 'avanco' | 'tranquilo'
  peso: 'dependencia' | 'incerteza' | 'inacabado' | 'possibilidades' | 'tranquilo'
  conquista: 'comecar' | 'compreender' | 'concluir' | 'autoria' | 'explorar'
  beneficio: 'capacidade' | 'prazer' | 'compartilhar' | 'possibilidades' | 'conhecer'
}
export interface AdultQuestion {
  id: QuestionId
  number: number
  multiple: boolean
  variants: {
    key: string
    title: string
    note: string
    options: { id: string; label: string; detail: string }[]
  }[]
}
export type AdultQuestionData = Record<AdultMode, AdultQuestion[]>
export type NormalizedAnswers = Partial<Record<QuestionId, QuizAnswerValue>>
export interface AdultNarrative {
  mode: AdultMode
  goal: Goal
  flags: string[]
  title: string
  lead: string
  priority: string
  reasoning: string[]
  productLead: string
  mechanism: string
  practice: [string, string][]
  continuity: string[]
  fit: string[]
  benefit: string
  note: string
  product: string
  cta: string
  href: string
  productionHref: string
  warningFirst: boolean
  disclaimer: string
}
