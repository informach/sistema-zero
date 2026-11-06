export type KidsMode = 'desafio' | 'comunidade'
export type Age = 'm9' | '9a12' | '13a17'
export type QuestionId =
  | 'idade'
  | 'interesse'
  | 'cena'
  | 'tentativas'
  | 'impacto'
  | 'alcance'
  | 'prioridade'
  | 'beneficio'
  | 'apoio'
  | 'condicao'
export interface QuestionCopy {
  key: string
  title: string
  note?: string
  stage: string
  spin: string
  options: [string, string][]
}
export interface QuestionGroup {
  number: number
  id: QuestionId
  variants: QuestionCopy[]
}
export type QuestionData = Record<KidsMode, Record<Age, QuestionGroup[]>>
/** Somente após o motor validar todas as dez respostas do percurso. */
export type CompleteAnswers = Record<QuestionId | 'genero', string>
