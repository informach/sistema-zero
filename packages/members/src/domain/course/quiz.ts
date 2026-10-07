import {
  type QuizQuestionSpeech,
  type SceneVozes,
  vozesPublicasDoQuiz,
} from '@sistemazero/core/learning/scene'
import { stableJson } from '../shared/stable-json'
import type { LessonBlockContent, QuizBlock, QuizChoice } from './lesson-block'

export {
  gradeLearningQuiz as gradeQuizAttempt,
  QUIZ_DEFAULT_PASSING_SCORE,
  type QuizAnswers,
  type QuizGrade,
  type QuizQuestionResult,
} from '@sistemazero/core/learning'

/**
 * Cooldown de retry após reprovar. 90s (07/2026; era 5 min): para uma criança de
 * 7–8 anos, 5 minutos é desmotivador — 90s ainda barra o chute em loop (a correção
 * chega no submit, então a janela dá tempo de LER a revisão antes de tentar de novo).
 */
export const QUIZ_RETRY_COOLDOWN_MS = 90_000

/**
 * Coerência estrutural do quiz na AUTORIA (defesa além do shape do TypeBox):
 * ids únicos, ≥2 alternativas por questão, ≥1 correta e toda correta existindo
 * nas alternativas — um gabarito órfão tornaria a questão impossível de acertar.
 * Quiz SEM questões é permitido (rascunho em construção no builder).
 * Retorna a mensagem do problema, ou `null` se válido.
 */
export function validateQuizAuthoring(block: QuizBlock): string | null {
  // Quiz COM nota de corte PRECISA de questões: um quiz vazio não é respondível
  // pelo aluno (a UI nem renderiza), então o gate da aula nunca seria satisfeito
  // → conclusão travada para sempre. Quiz vazio SEM nota de corte segue permitido
  // (rascunho em construção no builder; não bloqueia a conclusão).
  if (block.passingScore !== undefined && block.questions.length === 0) {
    return 'Um quiz com nota de corte precisa de ao menos uma questão'
  }
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
  questions: {
    id: string
    prompt: string
    choices: QuizChoice[]
    /** Só a pronúncia da PERGUNTA: a da explicação contaria o gabarito. */
    zappySpeech?: Pick<QuizQuestionSpeech, 'question'>
  }[]
  passingScore: number | null
  /** Só as falas das perguntas (`vozesPublicasDoQuiz`). */
  vozes?: SceneVozes
}

/**
 * Remove o gabarito do bloco antes de ir ao client (o GET da aula NUNCA revela
 * `correctChoiceIds`/`explanation`, nem a voz ou a pronúncia da explicação; correções só na
 * resposta do submit, que traz também o MP3 da explicação).
 * `passingScore: null` = quiz de fixação (não bloqueia a conclusão da aula).
 */
export function toMemberFacingQuizContent(block: QuizBlock): MemberQuizContent {
  const vozes = vozesPublicasDoQuiz(block)
  return {
    kind: 'quiz',
    questions: block.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      choices: q.choices.map((c) => ({ id: c.id, label: c.label })),
      ...(q.zappySpeech?.question ? { zappySpeech: { question: q.zappySpeech.question } } : {}),
    })),
    passingScore: block.passingScore ?? null,
    ...(vozes ? { vozes } : {}),
  }
}

/**
 * O que, num quiz, faz as tentativas antigas deixarem de valer: as questões (enunciado,
 * alternativas, gabarito, explicação) e a nota de corte. Mudou isso, as tentativas do bloco são
 * apagadas na publicação.
 *
 * ⚠️⚠️ A VOZ fica de fora: o dicionário (`vozes`) e a pronúncia (`zappySpeech`) não mudam o que
 * a criança respondeu. Com a pronúncia dentro, ajustar como o Zappy fala "Letra A" apagaria a
 * aprovação de todo mundo que já passou no quiz (e a aula voltaria a trancar a conclusão).
 */
export function quizGateFingerprint(content: LessonBlockContent): string {
  if (content.kind !== 'quiz') return 'none'
  return stableJson({
    questions: content.questions.map(({ zappySpeech: _voz, ...q }) => q),
    passingScore: content.passingScore ?? null,
  })
}
