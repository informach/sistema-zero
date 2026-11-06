import KidsConversaQuiz, { type KidsQuizProps } from './spin-quiz/KidsConversaQuiz'
import { kidsVidaConfig } from './spin-quiz/kids-vida-config'

const CONFIG = kidsVidaConfig('desafio')
export default function DesafioQuiz(props: KidsQuizProps) {
  return <KidsConversaQuiz config={CONFIG} {...props} />
}
