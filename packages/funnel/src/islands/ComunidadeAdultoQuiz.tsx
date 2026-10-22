import {
  activeAdultSteps,
  completesAdultQuiz,
  isAdultQuizComplete,
  QUIZ_VERSION,
  stepOnScreen,
  validChoice,
} from '../funnels/comunidade-adulto/quiz/engine'
import {
  QUIZ_ENTRY,
  QUIZ_HEADLINES,
  QUIZ_STAGES,
  quizHeadlineId,
} from '../funnels/comunidade-adulto/quiz/entry-copy'
import AdultoConversaQuiz, {
  type AdultoQuizConfig,
  type AdultoQuizProps,
} from './spin-quiz/AdultoConversaQuiz'

// Quiz adulto v1 da Comunidade dos Criadores (20/10/2026, Canvas `QuizAdultoTelas.html`), no quiz
// adulto em conversa.

const CONFIG: AdultoQuizConfig = {
  engine: {
    version: QUIZ_VERSION,
    activeSteps: activeAdultSteps,
    validChoice,
    isComplete: isAdultQuizComplete,
  },
  completesQuiz: completesAdultQuiz,
  stepOnScreen,
  headlines: QUIZ_HEADLINES,
  quizHeadlineId,
  entry: QUIZ_ENTRY,
  stages: QUIZ_STAGES,
  brandName: 'COMUNIDADE DOS CRIADORES',
  analyticsPrefix: 'quiz-adulto',
}

export default function ComunidadeAdultoQuiz(props: AdultoQuizProps) {
  return <AdultoConversaQuiz config={CONFIG} {...props} />
}
