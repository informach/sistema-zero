// Quiz atual e definições históricas para leitura administrativa.
import { createAdultQuiz } from '../../adulto-autonomia'
import { PROFILE_IDS } from './engine'
import { DESAFIO_ADULTO_QUESTIONS } from './questions'
import { PROFILE_LABELS } from './result-copy'
export const DESAFIO_ADULTO_PERFIL_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(PROFILE_IDS).map(([p, slug]) => [
    slug,
    PROFILE_LABELS[p as keyof typeof PROFILE_IDS],
  ]),
)
export const DESAFIO_ADULTO_QUIZ = createAdultQuiz('desafio', DESAFIO_ADULTO_QUESTIONS)
