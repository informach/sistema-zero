// Definição do quiz adulto v1 para o registry (`FunnelQuiz`). Sem ramos: o portão de idade fica
// na entrada e não é pergunta gravada.
import { z } from 'zod'
import type { FunnelQuiz } from '../../registry'
import {
  activeAdultSteps,
  adultDecision,
  applyAdultAnswer,
  isAdultQuizComplete,
  PROFILE_IDS,
  QUIZ_VERSION,
  validChoice,
} from './engine'
import { DEFAULT_HEADLINE, QUIZ_HEADLINES } from './entry-copy'
import { ADULT_QUESTIONS } from './questions'
import { buildAdultResult } from './result'

/** Rótulos dos perfis na aba Perfis do /admin (slug → nome do spec). */
export const ADULT_PROFILE_LABELS: Record<string, string> = {
  [PROFILE_IDS.A]: 'Horas livres',
  [PROFILE_IDS.B]: 'Ideia',
  [PROFILE_IDS.D]: 'Por dentro',
}

export const COMUNIDADE_ADULTO_QUIZ: FunnelQuiz = {
  version: QUIZ_VERSION,
  presentation: 'comunidade-adulto',
  steps: ADULT_QUESTIONS,
  // Dez perguntas para todos; os perfis B e D ganham uma condicional.
  total: 10,
  valueSchema: Object.fromEntries(
    ADULT_QUESTIONS.map((step) => [
      step.key,
      step.multiple
        ? z
            .array(z.string().max(64))
            .min(1)
            .max(step.maxSelections ?? step.opcoes.length)
            .refine((value) => validChoice(step, value))
        : z
            .string()
            .max(64)
            .refine((value) => validChoice(step, value)),
    ]),
  ),
  activeSteps: activeAdultSteps,
  applyAnswer: applyAdultAnswer,
  isComplete: isAdultQuizComplete,
  computePerfil: (answers) => {
    const profile = adultDecision(answers)?.profile
    return profile ? PROFILE_IDS[profile] : null
  },
  headlines: Object.fromEntries(Object.entries(QUIZ_HEADLINES).map(([id, h]) => [id, h.label])),
  defaultHeadline: DEFAULT_HEADLINE,
  conversa: buildAdultResult,
}
