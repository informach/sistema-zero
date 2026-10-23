import {
  activeDesafioSteps,
  childGender,
  completesQuiz,
  desafioBranch,
  isAdultExit,
  isDesafioQuizComplete,
  QUIZ_VERSION,
  stepOnScreen,
  validChoice,
} from '../funnels/desafio-primeiro-jogo/quiz/engine'
import {
  ADULT_EXIT,
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  quizHeadlineId,
  STAGE_LABELS,
} from '../funnels/desafio-primeiro-jogo/quiz/entry-copy'
import { GENERO_STEP, IDADE_STEP } from '../funnels/desafio-primeiro-jogo/quiz/questions'
import KidsConversaQuiz, {
  KIDS_EXIT,
  type KidsQuizConfig,
  type KidsQuizProps,
} from './spin-quiz/KidsConversaQuiz'

// Quiz Kids do Desafio, v5 (21/10/2026, Canvas "Quiz do Desafio · Kids e adulto"), no quiz Kids em
// conversa. Nenhuma tela antes do resultado cita o Desafio: nem o topo, que leva só a logo Kids.

const CONFIG: KidsQuizConfig = {
  engine: {
    version: QUIZ_VERSION,
    activeSteps: activeDesafioSteps,
    validChoice,
    isComplete: isDesafioQuizComplete,
    exitCursor: (answers) => (isAdultExit(answers) ? KIDS_EXIT : null),
  },
  isAdultExit,
  childGender,
  branchOf: desafioBranch,
  completesQuiz,
  stepOnScreen,
  headlines: QUIZ_HEADLINES,
  quizHeadlineId,
  entry: QUIZ_ENTRY,
  stageLabels: STAGE_LABELS,
  adultExit: ADULT_EXIT,
  generoStep: GENERO_STEP,
  idadeStep: IDADE_STEP,
  // Idade e as sete perguntas de um ramo.
  defaultTotal: 8,
  analyticsPrefix: 'quiz-desafio-kids',
}

export default function DesafioQuiz(props: KidsQuizProps) {
  return <KidsConversaQuiz config={CONFIG} {...props} />
}
