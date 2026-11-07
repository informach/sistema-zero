// Quiz atual e definições históricas para leitura administrativa.
import { createAdultQuiz } from '../../adulto-autonomia'
import { PROFILE_IDS } from './engine'
import { ADULT_QUESTIONS } from './questions'
export const ADULT_PROFILE_LABELS: Record<string, string> = {
  [PROFILE_IDS.A]: 'Horas livres',
  [PROFILE_IDS.B]: 'Ideia',
  [PROFILE_IDS.D]: 'Por dentro',
}
export const COMUNIDADE_ADULTO_QUIZ = createAdultQuiz('comunidade', ADULT_QUESTIONS)
