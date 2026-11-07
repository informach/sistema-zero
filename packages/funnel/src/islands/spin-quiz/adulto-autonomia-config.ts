import { ADULT_ENGINES } from '../../funnels/adulto-autonomia/engine'
import { DEFAULT_HEADLINE, ENTRY } from '../../funnels/adulto-autonomia/entry'
import type { AdultMode } from '../../funnels/adulto-autonomia/types'
import type { AdultoQuizConfig } from './AdultoConversaQuiz'

export function adultQuizConfig(mode: AdultMode): AdultoQuizConfig {
  const e = ADULT_ENGINES[mode],
    copy = ENTRY[mode]
  return {
    engine: e,
    completesQuiz: e.completesQuiz,
    defaultTotal: 10,
    headlines: { [DEFAULT_HEADLINE]: { title: copy.title, emphasis: copy.emphasis } },
    quizHeadlineId: () => DEFAULT_HEADLINE,
    entry: {
      eyebrow: 'Uma ideia sua pode ganhar forma',
      description: copy.description,
      chips: ['10 perguntas', 'Para pessoas de 18 anos ou mais'],
      button: copy.action,
      minorLink: 'Tenho menos de 18 anos',
      note: '',
      minor: {
        title: 'A área Kids recebe crianças e adolescentes.',
        text: 'Converse com seu responsável para conhecer a proposta do Sistema Zero Kids. A conta adulta é para pessoas a partir de 18 anos.',
        button: 'Conhecer com meu responsável',
        href: `/kids/${mode === 'desafio' ? 'desafio-primeiro-jogo' : 'comunidade-dos-criadores'}/quiz`,
      },
    },
    stages: {},
    analyticsPrefix: mode === 'desafio' ? 'quiz-desafio-adulto' : 'quiz-adulto',
  }
}
