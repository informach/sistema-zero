// Entrada do quiz adulto do Desafio, v1 (21/10/2026, Canvas "Quiz do Desafio · Kids e adulto",
// quadros PlanoAdulto e TelasAdulto). Tráfego frio: o motivo de responder e o botão. Nenhuma tela
// antes do resultado cita o Desafio, o jogo, curso, plataforma, preço ou prazo.

/**
 * Teste A/B da manchete: a padrão fala da vontade antiga; `?manchete=ideia` fala da ideia
 * guardada. A variante exibida vai na atribuição do lead (`quizHeadline`), e o /admin separa
 * Performance e Perfis por manchete. A ênfase é o trecho destacado do título.
 */
export const QUIZ_HEADLINES = {
  padrao: {
    label: 'Padrão: sempre quis fazer um jogo',
    title: 'Você sempre quis fazer um jogo. Em 2 minutos, veja por onde começar o primeiro.',
    emphasis: 'por onde começar o primeiro',
  },
  ideia: {
    label: 'Ideia: a ideia de jogo guardada há anos',
    title:
      'Aquela ideia de jogo que está na sua cabeça há anos. Em 2 minutos, veja o que falta para ela sair do papel.',
    emphasis: 'o que falta para ela sair do papel',
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
  pageTitle: 'Por onde começar o seu primeiro jogo',
  description:
    'Responda sobre como você joga e o que já tentou. O resultado aparece na hora, sem cadastro.',
  /** Selos abaixo da descrição (a ilha os escreve em caixa alta). */
  chips: ['2 minutos', 'Sem cadastro', 'Resultado na hora'],
  button: 'Começar',
  /** Link discreto do portão de idade: leva à tela de saída `minor`. */
  minorLink: 'Tenho menos de 18 anos',
  note: 'Uma orientação do Sistema Zero. Dá para responder pelo celular.',
  /** Saída de quem tem menos de 18: o quiz Kids do Desafio, com o responsável. Nada é gravado. */
  minor: {
    title: 'Com menos de 18, quem responde é o responsável',
    text: 'Para quem tem até 17 anos, a conta fica no nome de um responsável. Peça para ele responder o quiz para famílias.',
    button: 'Abrir o quiz para famílias',
    href: '/kids/desafio-primeiro-jogo/quiz',
  },
} as const

/** Rótulos das etapas na barra de progresso (Canvas). */
export const QUIZ_STAGES = {
  rotina: 'SUA ROTINA',
  trava: 'O QUE TRAVA',
  quer: 'O QUE VOCÊ QUER',
} as const
