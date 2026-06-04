import { describe, expect, test } from 'bun:test'
import type { QuizBlock } from '../../src/domain/course/lesson-block'
import {
  computeRetryAvailableAt,
  gradeQuizAttempt,
  QUIZ_RETRY_COOLDOWN_MS,
  type QuizAttemptSummary,
  toMemberFacingQuizContent,
} from '../../src/domain/course/quiz'

const quiz: QuizBlock = {
  kind: 'quiz',
  passingScore: 100,
  questions: [
    {
      id: 'q1',
      prompt: '2 + 2?',
      choices: [
        { id: 'a', label: '3' },
        { id: 'b', label: '4' },
      ],
      correctChoiceIds: ['b'],
      explanation: 'Aritmética básica.',
    },
    {
      id: 'q2',
      prompt: 'Pares?',
      choices: [
        { id: 'a', label: '1' },
        { id: 'b', label: '2' },
        { id: 'c', label: '4' },
      ],
      correctChoiceIds: ['b', 'c'],
    },
  ],
}

describe('gradeQuizAttempt', () => {
  test('acerto total → 100 e aprovado', () => {
    const g = gradeQuizAttempt(quiz, { q1: ['b'], q2: ['b', 'c'] })
    expect(g.score).toBe(100)
    expect(g.passed).toBe(true)
    expect(g.questions.map((q) => q.correct)).toEqual([true, true])
  })

  test('multiselect exige o conjunto EXATO (parcial/extra = errada)', () => {
    expect(gradeQuizAttempt(quiz, { q1: ['b'], q2: ['b'] }).score).toBe(50)
    expect(gradeQuizAttempt(quiz, { q1: ['b'], q2: ['a', 'b', 'c'] }).score).toBe(50)
  })

  test('questão sem resposta conta como errada; respostas extras são ignoradas', () => {
    const g = gradeQuizAttempt(quiz, { q1: ['b'], inexistente: ['x'] })
    expect(g.score).toBe(50)
    expect(g.passed).toBe(false)
  })

  test('passingScore default é 100; abaixo dele reprova', () => {
    const semCorte: QuizBlock = { ...quiz, passingScore: undefined }
    expect(gradeQuizAttempt(semCorte, { q1: ['b'], q2: ['b'] }).passed).toBe(false)
    expect(gradeQuizAttempt(semCorte, { q1: ['b'], q2: ['b'] }).passingScore).toBe(100)
  })

  test('passingScore parcial (50) aprova com metade', () => {
    const meio: QuizBlock = { ...quiz, passingScore: 50 }
    expect(gradeQuizAttempt(meio, { q1: ['b'], q2: [] }).passed).toBe(true)
  })

  test('correções carregam gabarito e explicação', () => {
    const g = gradeQuizAttempt(quiz, { q1: ['a'], q2: [] })
    expect(g.questions[0]).toMatchObject({
      questionId: 'q1',
      correct: false,
      correctChoiceIds: ['b'],
      explanation: 'Aritmética básica.',
    })
    expect(g.questions[1]?.explanation).toBeNull()
  })
})

describe('toMemberFacingQuizContent (anti-vazamento de gabarito)', () => {
  test('remove correctChoiceIds e explanation; mantém id/prompt/choices', () => {
    const m = toMemberFacingQuizContent(quiz)
    expect(JSON.stringify(m)).not.toContain('correctChoiceIds')
    expect(JSON.stringify(m)).not.toContain('explanation')
    expect(m.questions[0]).toEqual({
      id: 'q1',
      prompt: '2 + 2?',
      choices: [
        { id: 'a', label: '3' },
        { id: 'b', label: '4' },
      ],
    })
    expect(m.passingScore).toBe(100)
  })

  test('quiz sem passingScore expõe null (fixação, não bloqueia)', () => {
    expect(toMemberFacingQuizContent({ ...quiz, passingScore: undefined }).passingScore).toBeNull()
  })
})

describe('computeRetryAvailableAt', () => {
  const now = new Date('2026-06-04T12:00:00.000Z')
  const base: QuizAttemptSummary = {
    attemptsCount: 1,
    lastScore: 50,
    lastPassed: false,
    lastAttemptAt: now,
    everPassed: false,
  }

  test('reprovou agora → bloqueado por 5 min', () => {
    const at = computeRetryAvailableAt(base, now)
    expect(at?.getTime()).toBe(now.getTime() + QUIZ_RETRY_COOLDOWN_MS)
  })

  test('cooldown vencido → liberado', () => {
    const depois = new Date(now.getTime() + QUIZ_RETRY_COOLDOWN_MS + 1)
    expect(computeRetryAvailableAt(base, depois)).toBeNull()
  })

  test('nunca tentou / já aprovou / última aprovada → liberado', () => {
    expect(computeRetryAvailableAt(null, now)).toBeNull()
    expect(computeRetryAvailableAt({ ...base, everPassed: true }, now)).toBeNull()
    expect(computeRetryAvailableAt({ ...base, lastPassed: true }, now)).toBeNull()
  })
})
