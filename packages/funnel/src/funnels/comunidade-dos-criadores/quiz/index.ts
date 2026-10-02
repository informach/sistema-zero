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
import { COMMUNITY_QUESTIONS } from './questions'

export const COMMUNITY_QUIZ: FunnelQuiz = {
  version: QUIZ_VERSION,
  presentation: 'comunidade',
  steps: COMMUNITY_QUESTIONS,
  total: 8,
  valueSchema: Object.fromEntries(
    COMMUNITY_QUESTIONS.map((step) => [
      step.key,
      step.multiple
        ? z
            .array(z.string().max(64))
            .min(1)
            .max(4)
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
}
