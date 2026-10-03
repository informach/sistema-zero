import { z } from 'zod'
import type { FunnelQuiz } from '../../registry'
import {
  activeDesafioSteps,
  applyDesafioAnswer,
  DESAFIO_PROFILE_IDS,
  DESAFIO_QUIZ_VERSION,
  desafioDecision,
  isDesafioQuizComplete,
  validChoice,
} from './engine'
import { DESAFIO_QUESTIONS } from './questions'

export const DESAFIO_PERFIL_LABELS = {
  'tempo-de-tela': 'Aprender no tempo de tela combinado',
  'criacao-de-jogos': 'Um primeiro jogo funcionando',
  'expressao-visual': 'Desenhos, personagens e histórias',
  'iniciacao-tecnologica': 'Iniciação em programação',
}
export const DESAFIO_QUIZ: FunnelQuiz = {
  version: DESAFIO_QUIZ_VERSION,
  presentation: 'desafio',
  steps: DESAFIO_QUESTIONS,
  total: 8,
  valueSchema: Object.fromEntries(
    DESAFIO_QUESTIONS.map((step) => [
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
  activeSteps: activeDesafioSteps,
  applyAnswer: applyDesafioAnswer,
  isComplete: isDesafioQuizComplete,
  computePerfil: (answers) => {
    const principal = desafioDecision(answers)?.principal
    return principal ? DESAFIO_PROFILE_IDS[principal] : null
  },
}
