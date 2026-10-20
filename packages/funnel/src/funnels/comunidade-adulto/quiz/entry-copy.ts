// Entrada do quiz adulto v1 (tráfego frio). Uma coisa só: o motivo de responder e o botão. A
// manchete fala de quem sempre quis fazer um jogo; nenhuma tela antes do resultado cita a área
// adulta, curso, plataforma ou preço. Fonte: quiz-dados.json (`adulto.entrada`) e o Canvas
// `QuizAdultoTelas.html`.

/**
 * Teste A/B da manchete: a padrão fala da vontade antiga; `?manchete=ideia` fala da ideia
 * guardada. A variante exibida vai na atribuição do lead (`quizHeadline`), e o /admin separa
 * Performance e Perfis por manchete. A ênfase é o trecho destacado do título.
 */
export const QUIZ_HEADLINES = {
  padrao: {
    label: 'Padrão: sempre quis fazer um jogo',
    title:
      'Você sempre quis fazer um jogo. Em 3 minutos, veja o que está te travando e por onde começar.',
    emphasis: 'o que está te travando e por onde começar',
  },
  ideia: {
    label: 'Ideia: a ideia de jogo guardada há anos',
    title:
      'Aquela ideia de jogo que está na sua cabeça há anos. Em 3 minutos, veja o que falta para ela sair de lá.',
    emphasis: 'o que falta para ela sair de lá',
  },
} as const
export type QuizHeadlineId = keyof typeof QUIZ_HEADLINES
/** A manchete padrão, marcada de forma explícita (o /admin conta nela os leads sem registro). */
export const DEFAULT_HEADLINE: QuizHeadlineId = 'padrao'

export const quizHeadlineId = (param: string | null | undefined): QuizHeadlineId =>
  param && Object.hasOwn(QUIZ_HEADLINES, param) ? (param as QuizHeadlineId) : DEFAULT_HEADLINE

export const QUIZ_ENTRY = {
  eyebrow: 'Para quem tem 18 anos ou mais',
  /** Título da aba e das prévias de link (curto; a manchete fica na página). */
  pageTitle: 'Você sempre quis fazer um jogo',
  description:
    'Responda sobre como você joga e o que já tentou. O resultado aparece na hora, sem cadastro.',
  /** Selos abaixo da descrição (a ilha os escreve em caixa alta). */
  chips: ['3 minutos', 'Sem cadastro', 'Resultado na hora'],
  button: 'Começar',
  /** Link discreto do portão de idade: leva à tela de saída `minor`. */
  minorLink: 'Tenho menos de 18 anos',
  note: 'Uma orientação do Sistema Zero. Dá para responder pelo celular.',
  /**
   * Saída de quem tem menos de 18 (Canvas). É uma saída, e não uma pergunta: pode nomear o
   * produto Kids. Nada mais é gravado sobre idade.
   */
  minor: {
    title: 'Com menos de 18, o caminho é com o responsável',
    text: 'A área adulta é para quem tem 18 anos ou mais. A Comunidade dos Criadores Kids é para quem tem até 17, com a conta no nome de um responsável. Peça para ele responder o quiz infantil.',
    button: 'Abrir o quiz para o responsável',
    href: '/kids/comunidade-dos-criadores/quiz',
  },
} as const

/** Rótulos das etapas na barra de progresso (Canvas). */
export const QUIZ_STAGES = {
  rotina: 'SUA ROTINA',
  trava: 'O QUE TRAVA',
  quer: 'O QUE VOCÊ QUER',
} as const
