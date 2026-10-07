import type { SceneVozes } from './scene/voz'
import { audioDaExplicacao, type QuizQuestionSpeech } from './scene/voz-quiz'

/** Shared by server grading and the explicitly local author rehearsal. Answer keys never
 * travel in the student's lesson response. */
export interface LearningQuizDefinition {
  passingScore?: number
  questions: {
    id: string
    correctChoiceIds: string[]
    explanation?: string
    zappySpeech?: QuizQuestionSpeech
  }[]
  /** A voz do Zappy do quiz; o MP3 da explicação só sai daqui, junto da correção. */
  vozes?: SceneVozes
}
export type QuizAnswers = Record<string, string[]>
export interface QuizQuestionResult {
  questionId: string
  correct: boolean
  correctChoiceIds: string[]
  explanation: string | null
  /** A explicação na voz do Zappy, quando foi gerada na autoria. */
  explanationAudioUrl?: string
}
export interface QuizGrade {
  score: number
  passed: boolean
  passingScore: number
  questions: QuizQuestionResult[]
}
export const QUIZ_DEFAULT_PASSING_SCORE = 100
export function gradeLearningQuiz(block: LearningQuizDefinition, answers: QuizAnswers): QuizGrade {
  const hasGate = block.passingScore !== undefined
  const passingScore = block.passingScore ?? QUIZ_DEFAULT_PASSING_SCORE
  const questions = block.questions.map((q) => {
    const given = new Set(answers[q.id] ?? [])
    const expected = new Set(q.correctChoiceIds)
    const explanationAudioUrl = audioDaExplicacao(q, block.vozes)
    return {
      questionId: q.id,
      correct: given.size === expected.size && [...expected].every((id) => given.has(id)),
      correctChoiceIds: [...q.correctChoiceIds],
      explanation: q.explanation ?? null,
      ...(explanationAudioUrl ? { explanationAudioUrl } : {}),
    }
  })
  const score = questions.length
    ? Math.round((questions.filter((q) => q.correct).length / questions.length) * 100)
    : 100
  return { score, passed: hasGate ? score >= passingScore : true, passingScore, questions }
}
