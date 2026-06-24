export interface AnswerPair {
  key: string
  value: string | number
}

export type Answers = Record<string, string | number | null>

export interface BaseQuestionProps {
  answers: Answers
  submitting: boolean
  onSubmit: (pairs: AnswerPair[]) => void
}
