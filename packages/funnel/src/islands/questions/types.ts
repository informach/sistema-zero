import type { LeadKey } from '../../content/quiz-config'

export interface AnswerPair {
  key: LeadKey
  value: string | number
}

export type Answers = Record<string, string | number | null>

export interface BaseQuestionProps {
  answers: Answers
  submitting: boolean
  onSubmit: (pairs: AnswerPair[]) => void
}
