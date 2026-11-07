import KidsConversaQuiz, { type KidsQuizProps } from './spin-quiz/KidsConversaQuiz'
import { kidsVidaConfig } from './spin-quiz/kids-vida-config'

const CONFIG = kidsVidaConfig('comunidade')
export default function ComunidadeQuiz(props: KidsQuizProps) {
  return <KidsConversaQuiz config={CONFIG} {...props} />
}
