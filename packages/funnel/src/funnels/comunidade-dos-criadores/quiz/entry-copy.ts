// Entrada para tráfego frio (v5, 16/10/2026). A manchete diz o motivo de responder: sair sabendo
// por onde começar, a partir do que a criança já faz. Nenhuma tela antes do resultado cita a
// Comunidade nem apresenta a criação de jogos como solução.

/**
 * Teste A/B da manchete (decisão da dona): a recomendada é o padrão; `?manchete=tela` mostra a
 * alternativa pela dor mais comum. A variante exibida vai na atribuição do lead
 * (`quizHeadline`), e o /admin separa Performance e Perfis por manchete.
 */
export const QUIZ_HEADLINES = {
  padrao: {
    label: 'Padrão: o que ele já gosta de fazer',
    title:
      'Em três minutos, veja como usar o que seu filho já gosta de fazer para ele aprender mais',
    emphasis: 'o que seu filho já gosta de fazer',
  },
  tela: {
    label: 'Tela: a dor do tempo de tela',
    title:
      'Seu filho passa horas na tela. Em três minutos, veja o que faria esse tempo ajudar no aprendizado dele.',
    emphasis: 'ajudar no aprendizado dele',
  },
} as const
export type QuizHeadlineId = keyof typeof QUIZ_HEADLINES
/** A manchete padrão, marcada de forma explícita (o /admin conta nela os leads sem registro). */
export const DEFAULT_HEADLINE: QuizHeadlineId = 'padrao'

export const quizHeadlineId = (param: string | null | undefined): QuizHeadlineId =>
  param && Object.hasOwn(QUIZ_HEADLINES, param) ? (param as QuizHeadlineId) : DEFAULT_HEADLINE

/** O endereço do quiz que mantém a manchete que a família viu (o padrão não leva parâmetro). */
export const quizPathWithHeadline = (basePath: string, headline: string | null | undefined) => {
  const id = quizHeadlineId(headline)
  return id === DEFAULT_HEADLINE ? `${basePath}/quiz` : `${basePath}/quiz?manchete=${id}`
}

export const QUIZ_ENTRY = {
  eyebrow: 'Para famílias com crianças de 9 a 14 anos',
  /** Título da aba e das prévias de link (curto; a manchete fica na página). */
  pageTitle: 'O que seu filho já gosta de fazer pode ajudar ele a aprender mais',
  description:
    'Pode ser o que ele já gosta de fazer, como jogos, vídeos, desenhos ou perguntas sobre como as coisas funcionam, ou o que preocupa você, como a lição de casa. Você responde sobre a rotina dele e, no fim, vê as suas respostas organizadas, por que aquilo acontece e por onde começar. O resultado aparece aqui mesmo, logo depois da última resposta.',
  /** A lateral lista as situações que o quiz olha, e não soluções. */
  lookAtTitle: 'O que o quiz olha',
  lookAt: [
    { icon: 'schedule', title: 'O tempo de tela' },
    { icon: 'lightbulb', title: 'As ideias que ele inventa' },
    { icon: 'brush', title: 'Os desenhos' },
    { icon: 'search', title: 'A curiosidade sobre como as coisas funcionam' },
    { icon: 'menu_book', title: 'A lição de casa' },
  ],
  note: 'Uma orientação do Sistema Zero Kids para mães, pais e responsáveis. Você pode responder pelo celular.',
} as const
