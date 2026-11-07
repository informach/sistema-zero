import AdultoConversaQuiz, { type AdultoQuizProps } from './spin-quiz/AdultoConversaQuiz'
import { adultQuizConfig } from './spin-quiz/adulto-autonomia-config'

const CONFIG = adultQuizConfig('comunidade')
export default function ComunidadeAdultoQuiz(props: AdultoQuizProps) {
  return <AdultoConversaQuiz config={CONFIG} {...props} />
}
