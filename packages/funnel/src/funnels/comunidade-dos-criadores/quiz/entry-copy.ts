// Entrada do quiz v6 (20/10/2026, Canvas de 19/10): o motivo de responder e, logo abaixo, a primeira
// escolha (filho ou filha) em duas cartas. Nenhuma tela antes do resultado cita a Comunidade nem
// apresenta a criação de jogos como solução. Texto no masculino; `paraFeminino` troca para "ela".

/**
 * Teste A/B da manchete (decisão da dona): a recomendada é o padrão; `?manchete=tela` mostra a
 * alternativa pela dor mais comum. A variante exibida vai na atribuição do lead
 * (`quizHeadline`), e o /admin separa Performance e Perfis por manchete.
 */
export const QUIZ_HEADLINES = {
  padrao: {
    label: 'Padrão: ele vive no jogo',
    title:
      'Seu filho vive no jogo. Em 3 minutos, veja como usar isso para ele aprender de verdade.',
    emphasis: 'veja como usar isso para ele aprender de verdade',
  },
  tela: {
    label: 'Tela: a dor do tempo de tela',
    title:
      'Seu filho passa horas na tela. Em 3 minutos, veja o que faria esse tempo render alguma coisa.',
    emphasis: 'render alguma coisa',
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
  pageTitle: 'Como usar o jogo para seu filho aprender',
  description: 'Responda sobre a rotina dele. O resultado aparece na hora, sem cadastro.',
  note: 'Uma orientação do Sistema Zero Kids. Dá para responder pelo celular.',
  /** O link do topo que leva de volta à bio. */
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

/** 18 ou mais: a saída para o quiz adulto (a pessoa responde por si). */
export const ADULT_EXIT = {
  title: 'A partir de 18 anos, é a área adulta',
  text: 'O Sistema Zero tem uma área para quem tem 18 anos ou mais, com conta própria. Quem responde é a própria pessoa, no quiz adulto.',
  action: 'Abrir o quiz adulto',
  /** Sem o funil adulto no ar, a saída volta para a página inicial. */
  fallbackAction: 'Voltar para a página inicial',
  fix: 'Corrigir a idade',
} as const
