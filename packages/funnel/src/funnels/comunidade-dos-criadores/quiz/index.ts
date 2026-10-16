import { z } from 'zod'
import type { FunnelQuiz } from '../../registry'
import {
  activeCommunitySteps,
  applyCommunityAnswer,
  communityDecision,
  isCommunityQuizComplete,
  PROFILE_IDS,
  QUIZ_VERSION,
  validChoice,
} from './engine'
import { DEFAULT_HEADLINE, QUIZ_HEADLINES } from './entry-copy'
import { COMMUNITY_QUESTIONS } from './questions'
import { COMMUNITY_QUESTIONS_V4 } from './questions-v4'

export const COMMUNITY_QUIZ: FunnelQuiz = {
  version: QUIZ_VERSION,
  presentation: 'comunidade',
  steps: COMMUNITY_QUESTIONS,
  // Dez perguntas para todos; os perfis B, C e F ganham uma condicional.
  total: 10,
  valueSchema: Object.fromEntries(
    COMMUNITY_QUESTIONS.map((step) => [
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
  activeSteps: activeCommunitySteps,
  applyAnswer: applyCommunityAnswer,
  isComplete: isCommunityQuizComplete,
  computePerfil: (answers) => {
    const profile = communityDecision(answers)?.profile
    return profile ? PROFILE_IDS[profile] : null
  },
  headlines: Object.fromEntries(Object.entries(QUIZ_HEADLINES).map(([id, h]) => [id, h.label])),
  defaultHeadline: DEFAULT_HEADLINE,
  legacySteps: COMMUNITY_QUESTIONS_V4,
}
