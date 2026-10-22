import {
  activeCommunitySteps,
  childGender,
  communityBranch,
  completesQuiz,
  isAdultExit,
  isCommunityQuizComplete,
  QUIZ_VERSION,
  stepOnScreen,
  validChoice,
} from '../funnels/comunidade-dos-criadores/quiz/engine'
import {
  ADULT_EXIT,
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  quizHeadlineId,
  STAGE_LABELS,
} from '../funnels/comunidade-dos-criadores/quiz/entry-copy'
import { GENERO_STEP, IDADE_STEP } from '../funnels/comunidade-dos-criadores/quiz/questions'
import KidsConversaQuiz, {
  KIDS_EXIT,
  type KidsQuizConfig,
  type KidsQuizProps,
} from './spin-quiz/KidsConversaQuiz'

// Quiz v6 da Comunidade Kids (20/10/2026, Canvas de 19/10), no quiz Kids em conversa.

const CONFIG: KidsQuizConfig = {
  engine: {
    version: QUIZ_VERSION,
    activeSteps: activeCommunitySteps,
    validChoice,
    isComplete: isCommunityQuizComplete,
    exitCursor: (answers) => (isAdultExit(answers) ? KIDS_EXIT : null),
  },
  isAdultExit,
  childGender,
  branchOf: communityBranch,
  completesQuiz,
  stepOnScreen,
  headlines: QUIZ_HEADLINES,
  quizHeadlineId,
  entry: QUIZ_ENTRY,
  stageLabels: STAGE_LABELS,
  adultExit: ADULT_EXIT,
  generoStep: GENERO_STEP,
  idadeStep: IDADE_STEP,
  // Idade e nove perguntas (o 9 a 17 sem a extra), até a idade abrir um ramo.
  defaultTotal: 10,
  analyticsPrefix: 'quiz-kids',
}

export default function ComunidadeQuiz(props: KidsQuizProps) {
  return <KidsConversaQuiz config={CONFIG} {...props} />
}
