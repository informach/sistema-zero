// Definição do quiz adulto do Desafio, v1, para o registry (`FunnelQuiz`). Sem ramos: o portão de
// idade fica na entrada e não é pergunta gravada.
import { z } from 'zod'
import type { FunnelQuiz } from '../../registry'
import {
  activeDesafioAdultoSteps,
  applyDesafioAdultoAnswer,
  desafioAdultoProfileSlug,
  isDesafioAdultoQuizComplete,
  PROFILE_IDS,
  QUIZ_VERSION,
  validChoice,
} from './engine'
import { DEFAULT_HEADLINE, QUIZ_HEADLINES } from './entry-copy'
import { DESAFIO_ADULTO_QUESTIONS } from './questions'
import { buildDesafioAdultoResult } from './result'
import { PROFILE_LABELS } from './result-copy'

/** Rótulos dos perfis na aba Perfis do /admin. */
export const DESAFIO_ADULTO_PERFIL_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PROFILE_IDS).map(([p, slug]) => [
    slug,
    PROFILE_LABELS[p as keyof typeof PROFILE_IDS],
  ]),
)

export const DESAFIO_ADULTO_QUIZ: FunnelQuiz = {
  version: QUIZ_VERSION,
  presentation: 'desafio-adulto',
  steps: DESAFIO_ADULTO_QUESTIONS,
  total: DESAFIO_ADULTO_QUESTIONS.length,
  valueSchema: Object.fromEntries(
    DESAFIO_ADULTO_QUESTIONS.map((step) => [
      step.key,
      z
        .string()
        .max(64)
        .refine((value) => validChoice(step, value)),
    ]),
  ),
  activeSteps: activeDesafioAdultoSteps,
  applyAnswer: applyDesafioAdultoAnswer,
  isComplete: isDesafioAdultoQuizComplete,
  computePerfil: desafioAdultoProfileSlug,
  headlines: Object.fromEntries(Object.entries(QUIZ_HEADLINES).map(([id, h]) => [id, h.label])),
  defaultHeadline: DEFAULT_HEADLINE,
  conversa: buildDesafioAdultoResult,
}
