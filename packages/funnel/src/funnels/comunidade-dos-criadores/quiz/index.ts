import { z } from 'zod'
import type { FunnelQuiz } from '../../registry'
import {
  activeCommunitySteps,
  applyCommunityAnswer,
  communityBranch,
  communityProfileSlug,
  isCommunityQuizComplete,
  QUIZ_VERSION,
  validChoice,
} from './engine'
import { DEFAULT_HEADLINE, QUIZ_HEADLINES } from './entry-copy'
import { BRANCHES, COMMUNITY_QUESTIONS } from './questions'
import { COMMUNITY_QUESTIONS_V4 } from './questions-v4'
import { COMMUNITY_QUESTIONS_V5 } from './questions-v5'
import { buildCommunityResult } from './result'

export const COMMUNITY_QUIZ: FunnelQuiz = {
  version: QUIZ_VERSION,
  presentation: 'comunidade',
  steps: COMMUNITY_QUESTIONS,
  // De 9 a 17: idade + nove perguntas (+ a extra dos perfis B, C e F). Menor de 9: idade + oito.
  // A carta de filho ou filha fica fora da contagem da tela.
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
  computePerfil: communityProfileSlug,
  headlines: Object.fromEntries(Object.entries(QUIZ_HEADLINES).map(([id, h]) => [id, h.label])),
  defaultHeadline: DEFAULT_HEADLINE,
  // A v5 e a v4 só rotulam as respostas de leads antigos no /admin.
  legacySteps: [...COMMUNITY_QUESTIONS_V5, ...COMMUNITY_QUESTIONS_V4],
  branches: BRANCHES,
  branchOf: communityBranch,
  conversa: buildCommunityResult,
}
