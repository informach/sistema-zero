import type { QuizBlock, QuizChoice } from './lesson-block'

/** Cooldown de retry após reprovar (espelha o legado: 5 minutos). */
export const QUIZ_RETRY_COOLDOWN_MS = 5 * 60_000

/** Nota de corte quando o bloco não define `passingScore`. */
export const QUIZ_DEFAULT_PASSING_SCORE = 100

/** Respostas do aluno: questionId → choiceIds marcados. */
export type QuizAnswers = Record<string, string[]>

export interface QuizQuestionResult {
  questionId: string
  correct: boolean
  /** Gabarito — revelado SÓ aqui (resposta do submit), nunca no GET da aula. */
  correctChoiceIds: string[]
  explanation: string | null
}

export interface QuizGrade {
  /** 0–100, inteiro. Quiz sem questões → 100 (nada a errar). */
  score: number
  passed: boolean
  passingScore: number
  questions: QuizQuestionResult[]
}

/**
 * Corrige a tentativa NO SERVIDOR. Uma questão só conta como certa se o conjunto
 * de choices marcados é EXATAMENTE o gabarito (suporta múltipla resposta correta).
 * Respostas para questões inexistentes são ignoradas.
 */
export function gradeQuizAttempt(block: QuizBlock, answers: QuizAnswers): QuizGrade {
  const passingScore = block.passingScore ?? QUIZ_DEFAULT_PASSING_SCORE
  const questions = block.questions.map((q) => {
    const given = new Set(answers[q.id] ?? [])
    const expected = new Set(q.correctChoiceIds)
    const correct = given.size === expected.size && [...expected].every((id) => given.has(id))
    return {
      questionId: q.id,
      correct,
      correctChoiceIds: [...q.correctChoiceIds],
      explanation: q.explanation ?? null,
    }
  })
  const total = questions.length
  const right = questions.filter((q) => q.correct).length
  const score = total > 0 ? Math.round((right / total) * 100) : 100
  return { score, passed: score >= passingScore, passingScore, questions }
}

/**
 * Coerência estrutural do quiz na AUTORIA (defesa além do shape do TypeBox):
 * ids únicos, ≥2 alternativas por questão, ≥1 correta e toda correta existindo
 * nas alternativas — um gabarito órfão tornaria a questão impossível de acertar.
 * Quiz SEM questões é permitido (rascunho em construção no builder).
 * Retorna a mensagem do problema, ou `null` se válido.
 */
export function validateQuizAuthoring(block: QuizBlock): string | null {
  const questionIds = new Set<string>()
  for (const q of block.questions) {
    if (questionIds.has(q.id)) return `Questão com id duplicado: ${q.id}`
    questionIds.add(q.id)
    if (q.choices.length < 2) return 'Cada questão precisa de pelo menos 2 alternativas'
    const choiceIds = new Set<string>()
    for (const c of q.choices) {
      if (choiceIds.has(c.id)) return `Alternativa com id duplicado na questão ${q.id}`
      choiceIds.add(c.id)
    }
    if (q.correctChoiceIds.length === 0) {
      return `A questão ${q.id} precisa de ao menos uma alternativa correta`
    }
    for (const id of q.correctChoiceIds) {
      if (!choiceIds.has(id)) {
        return `A questão ${q.id} marca como correta uma alternativa inexistente (${id})`
      }
    }
  }
  return null
}

/** Resumo das tentativas de um aluno num bloco de quiz (derivado do histórico). */
export interface QuizAttemptSummary {
  attemptsCount: number
  lastScore: number
  lastPassed: boolean
  lastAttemptAt: Date
  /** Alguma tentativa já aprovou? (aprovado uma vez = gate destravado p/ sempre). */
  everPassed: boolean
}

/**
 * Quando o aluno pode tentar de novo. `null` = pode agora (nunca tentou, já
 * aprovou, ou o cooldown da última reprovação já passou).
 */
export function computeRetryAvailableAt(
  summary: QuizAttemptSummary | null,
  now: Date,
  cooldownMs = QUIZ_RETRY_COOLDOWN_MS,
): Date | null {
  if (!summary || summary.everPassed || summary.lastPassed) return null
  const at = new Date(summary.lastAttemptAt.getTime() + cooldownMs)
  return at.getTime() > now.getTime() ? at : null
}

/** Bloco de quiz PROJETADO para o aluno — sem `correctChoiceIds`/`explanation`. */
export interface MemberQuizContent {
  kind: 'quiz'
  questions: { id: string; prompt: string; choices: QuizChoice[] }[]
  passingScore: number | null
}

/**
 * Remove o gabarito do bloco antes de ir ao client (o GET da aula NUNCA revela
 * `correctChoiceIds`/`explanation`; correções só na resposta do submit).
 * `passingScore: null` = quiz de fixação (não bloqueia a conclusão da aula).
 */
export function toMemberFacingQuizContent(block: QuizBlock): MemberQuizContent {
  return {
    kind: 'quiz',
    questions: block.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
    })),
    passingScore: block.passingScore ?? null,
  }
}
