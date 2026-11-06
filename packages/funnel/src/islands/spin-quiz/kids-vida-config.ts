import { KIDS_ENGINES } from '../../funnels/kids-vida/engine'
import {
  ADULT_EXIT,
  QUIZ_HEADLINES,
  quizEntry,
  quizHeadlineId,
  STAGE_LABELS,
} from '../../funnels/kids-vida/entry'
import type { KidsMode } from '../../funnels/kids-vida/types'
import { KIDS_EXIT, type KidsQuizConfig } from './KidsConversaQuiz'
export function kidsVidaConfig(mode: KidsMode): KidsQuizConfig {
  const e = KIDS_ENGINES[mode]
  return {
    engine: {
      version: e.version,
      activeSteps: e.activeSteps,
      validChoice: e.validChoice,
      isComplete: e.isComplete,
      exitCursor: (a) => (e.isAdultExit(a) ? KIDS_EXIT : null),
    },
    isAdultExit: e.isAdultExit,
    childGender: e.childGender,
    branchOf: e.branchOf,
    completesQuiz: e.completesQuiz,
    stepOnScreen: e.stepOnScreen,
    headlines: QUIZ_HEADLINES,
    quizHeadlineId,
    entry: quizEntry(mode),
    stageLabels: STAGE_LABELS,
    adultExit: ADULT_EXIT,
    generoStep: e.genero,
    idadeStep: e.idade,
    defaultTotal: 10,
    analyticsPrefix: mode === 'desafio' ? 'quiz-desafio-kids' : 'quiz-kids',
  }
}
