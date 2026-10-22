// Entrada do quiz Kids do Desafio, v5 (21/10/2026, Canvas "Quiz do Desafio · Kids e adulto",
// quadro TelasKids). Tráfego frio: o motivo de responder e, logo abaixo, filho ou filha em duas
// cartas. Nenhuma tela antes do resultado cita o Desafio, o jogo, curso, plataforma, preço ou prazo.
// Texto no masculino; `paraFeminino` troca para "ela".

/**
 * Teste A/B da manchete: a padrão fala do jogo; `?manchete=tela` fala da dor do tempo de tela. A
 * variante exibida vai na atribuição do lead (`quizHeadline`), e o /admin separa Performance e
 * Perfis por manchete.
 */
export const QUIZ_HEADLINES = {
  padrao: {
    label: 'Padrão: ele vive no jogo',
    title:
      'Seu filho vive no jogo. Em 2 minutos, veja como esse tempo pode virar algo que ele faz.',
    emphasis: 'veja como esse tempo pode virar algo que ele faz',
  },
  tela: {
    label: 'Tela: a dor do tempo de tela',
    title:
      'Seu filho passa horas na tela. Em 2 minutos, veja o que faria esse tempo render alguma coisa.',
    emphasis: 'veja o que faria esse tempo render alguma coisa',
  },
} as const
export type QuizHeadlineId = keyof typeof QUIZ_HEADLINES
/** A manchete padrão, marcada de forma explícita (o /admin conta nela os leads sem registro). */
export const DEFAULT_HEADLINE: QuizHeadlineId = 'padrao'

export const quizHeadlineId = (param: string | null | undefined): QuizHeadlineId =>
  param && Object.hasOwn(QUIZ_HEADLINES, param) ? (param as QuizHeadlineId) : DEFAULT_HEADLINE

export const QUIZ_ENTRY = {
  eyebrow: 'Para mães, pais e responsáveis',
  /** Título da aba e das prévias de link (curto; a manchete fica na página). */
  pageTitle: 'O que o tempo no jogo pode virar',
  description: 'Responda sobre a rotina dele. O resultado aparece na hora, sem cadastro.',
  note: 'Uma orientação do Sistema Zero Kids. Dá para responder pelo celular.',
  sair: 'Sair',
  /** O chip da tela da idade. */
  sobre: 'Sobre ele',
  voltar: 'Voltar',
  tocar: 'Toque numa opção',
} as const

/** Os rótulos das etapas, por ramo (o chip de cada pergunta). */
export const STAGE_LABELS = {
  '9a17': { rotina: 'A rotina dele', casa: 'A cena de casa', desejo: 'O que você quer' },
  m9: { rotina: 'A rotina de vocês', casa: 'A cena de casa', desejo: 'O que você quer' },
} as const

/** 18 ou mais: a saída para o quiz adulto. Não cita o Desafio (tráfego frio). */
export const ADULT_EXIT = {
  title: 'A partir de 18 anos, a pessoa responde por si',
  text: 'Quem tem 18 anos ou mais faz o próprio caminho, com conta própria. O quiz para adultos tem as perguntas certas para isso.',
  action: 'Abrir o quiz para adultos',
  /** Sem o funil adulto no ar, a saída volta para a página inicial. */
  fallbackAction: 'Voltar para a página inicial',
  fix: 'Corrigir a idade',
} as const
