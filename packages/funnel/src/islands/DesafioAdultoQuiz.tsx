import AdultoConversaQuiz, { type AdultoQuizProps } from './spin-quiz/AdultoConversaQuiz'
import { adultQuizConfig } from './spin-quiz/adulto-autonomia-config'

const CONFIG = adultQuizConfig('desafio')
export default function DesafioAdultoQuiz(props: AdultoQuizProps) {
  return <AdultoConversaQuiz config={CONFIG} {...props} />
}
