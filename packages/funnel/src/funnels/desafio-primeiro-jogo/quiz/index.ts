import { z } from 'zod'
import type { FunnelQuiz } from '../../registry'
import {
  activeDesafioSteps,
  applyDesafioAnswer,
  desafioBranch,
  desafioProfileSlug,
  isDesafioQuizComplete,
  PROFILE_IDS,
  PROFILE_IDS_M9,
  QUIZ_VERSION,
  validChoice,
} from './engine'
import { DEFAULT_HEADLINE, QUIZ_HEADLINES } from './entry-copy'
import { BRANCHES, DESAFIO_QUESTIONS } from './questions'
import { DESAFIO_QUESTIONS_V4 } from './questions-v4'
import { buildDesafioKidsResult } from './result'
import { PROFILE_LABELS_9A17, PROFILE_LABELS_M9 } from './result-copy'

/**
 * Rótulos dos perfis no /admin. O ramo de 9 a 17 usa os slugs da v4 (os Perfis seguem comparáveis
 * entre as versões); o menor de 9 tem os seus.
 */
export const DESAFIO_PERFIL_LABELS: Record<string, string> = Object.fromEntries([
  ...Object.entries(PROFILE_IDS).map(([p, slug]) => [
    slug,
    PROFILE_LABELS_9A17[p as keyof typeof PROFILE_IDS],
  ]),
  ...Object.entries(PROFILE_IDS_M9).map(([p, slug]) => [
    slug,
    PROFILE_LABELS_M9[p as keyof typeof PROFILE_IDS_M9],
  ]),
])

export const DESAFIO_QUIZ: FunnelQuiz = {
  version: QUIZ_VERSION,
  presentation: 'desafio-kids',
  steps: DESAFIO_QUESTIONS,
  // Idade + as sete perguntas do ramo. A carta de filho ou filha fica fora da contagem da tela.
  total: 8,
  valueSchema: Object.fromEntries(
    DESAFIO_QUESTIONS.map((step) => [
      step.key,
      z
        .string()
        .max(64)
        .refine((value) => validChoice(step, value)),
    ]),
  ),
  activeSteps: activeDesafioSteps,
  applyAnswer: applyDesafioAnswer,
  isComplete: isDesafioQuizComplete,
  computePerfil: desafioProfileSlug,
  headlines: Object.fromEntries(Object.entries(QUIZ_HEADLINES).map(([id, h]) => [id, h.label])),
  defaultHeadline: DEFAULT_HEADLINE,
  // A v4 só rotula as respostas de leads antigos no /admin.
  legacySteps: DESAFIO_QUESTIONS_V4,
  branches: BRANCHES,
  branchOf: desafioBranch,
  conversa: buildDesafioKidsResult,
}
