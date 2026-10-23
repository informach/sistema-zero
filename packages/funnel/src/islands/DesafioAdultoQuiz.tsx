import {
  activeDesafioAdultoSteps,
  completesDesafioAdultoQuiz,
  isDesafioAdultoQuizComplete,
  QUIZ_VERSION,
  validChoice,
} from '../funnels/desafio-adulto/quiz/engine'
import {
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  QUIZ_STAGES,
  quizHeadlineId,
} from '../funnels/desafio-adulto/quiz/entry-copy'
import AdultoConversaQuiz, {
  type AdultoQuizConfig,
  type AdultoQuizProps,
} from './spin-quiz/AdultoConversaQuiz'

// Quiz adulto do Desafio, v1 (21/10/2026, Canvas "Quiz do Desafio · Kids e adulto"), no quiz adulto
// em conversa. O topo leva só a logo: nenhuma tela antes do resultado cita o Desafio.

const CONFIG: AdultoQuizConfig = {
  engine: {
    version: QUIZ_VERSION,
    activeSteps: activeDesafioAdultoSteps,
    validChoice,
    isComplete: isDesafioAdultoQuizComplete,
  },
  completesQuiz: completesDesafioAdultoQuiz,
  headlines: QUIZ_HEADLINES,
  quizHeadlineId,
  entry: QUIZ_ENTRY,
  stages: QUIZ_STAGES,
  analyticsPrefix: 'quiz-desafio-adulto',
}

export default function DesafioAdultoQuiz(props: AdultoQuizProps) {
  return <AdultoConversaQuiz config={CONFIG} {...props} />
}
