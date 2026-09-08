export interface PracticeTopicView {
  courseSlug: string
  lessonId: string
  blockId: string
  title: string
  questionCount: number
}

export interface PracticeSessionView {
  id: string
  title: string
  courseSlug: string
  lessonId: string
  createdAt: string
  completedAt: string | null
  questions: {
    id: string
    prompt: string
    choices: { id: string; label: string }[]
    multiple: boolean
  }[]
  answers: Record<string, string[]> | null
  review: {
    score: number
    questions: {
      questionId: string
      correct: boolean
      correctChoiceIds: string[]
      explanation: string | null
    }[]
  } | null
}
