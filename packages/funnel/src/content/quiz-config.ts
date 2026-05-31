// Definição tipada do quiz (fonte única para a landing P1 e o restante do quiz).
// 10 perguntas no total: P1 (segmento) aparece na landing; P2..P10 na tela /quiz.
// Copy em pt-BR, verbatim do briefing. `last_step` vai de quiz_pergunta_1..10.

export const LEAD_KEYS = [
  'segmento',
  'gasto_terceiros',
  'forma_de_criar',
  'ja_quebrou',
  'nivel_refem',
  'horas_retrabalho',
  'valor_hora',
  'custo_mensal',
  'peso_principal',
  'visualizacao',
  'o_que_falta',
  'mudanca_desejada',
] as const

export type LeadKey = (typeof LEAD_KEYS)[number]

/** Chaves que guardam números (as monetárias são salvas em CENTAVOS). */
export const NUMERIC_KEYS = new Set<LeadKey>([
  'gasto_terceiros',
  'nivel_refem',
  'horas_retrabalho',
  'valor_hora',
  'custo_mensal',
])

/** Chaves monetárias (o cliente envia centavos; o admin formata como R$). */
export const MONEY_KEYS = new Set<LeadKey>(['gasto_terceiros', 'valor_hora', 'custo_mensal'])

export type Segmento = 'A' | 'B' | 'C' | 'D'

export interface Opcao {
  value: string
  label: string
  /** URL pública da imagem (public/img/...). Renderiza placeholder se ausente. */
  image?: string
}

interface StepBase {
  id: number
  key: LeadKey
  lastStep: string
  eventName: string
  titulo: string
  subtitulo?: string
}

export interface MultiplaEscolhaStep extends StepBase {
  tipo: 'multipla_escolha'
  comImagem?: boolean
  opcoes: Opcao[]
}
export interface SimNaoStep extends StepBase {
  tipo: 'sim_nao'
  sim: string
  nao: string
}
export interface SliderStep extends StepBase {
  tipo: 'slider'
  min: number
  max: number
  labelMin: string
  labelMax: string
}
export interface InputNumeroStep extends StepBase {
  tipo: 'input_numero'
  label: string
  unidade: string
}
export interface CalculadoraStep extends StepBase {
  tipo: 'calculadora'
  campo1: { key: LeadKey; label: string; unidade: string }
  campo2: { key: LeadKey; label: string; unidade: string }
  resultadoKey: LeadKey
}

export type QuizStep =
  | MultiplaEscolhaStep
  | SimNaoStep
  | SliderStep
  | InputNumeroStep
  | CalculadoraStep

export const QUIZ_STEPS: QuizStep[] = [
  {
    id: 1,
    key: 'segmento',
    lastStep: 'quiz_pergunta_1',
    eventName: 'respondeu_pergunta_1',
    tipo: 'multipla_escolha',
    comImagem: true,
    titulo: 'Qual frase mais combina com você hoje?',
    opcoes: [
      {
        value: 'A',
        label: 'Tenho uma ideia parada há meses e não sei como tirar do papel',
        image: '/img/q1-card-a.webp',
      },
      {
        value: 'B',
        label: 'Já criei algo com IA, mas quebra ou trava e eu não sei resolver',
        image: '/img/q1-card-b.webp',
      },
      {
        value: 'C',
        label: 'Dependo de freelancer ou da IA pra cada ajuste, e isso me incomoda',
        image: '/img/q1-card-c.webp',
      },
      {
        value: 'D',
        label: 'Crio com IA, mas tenho a sensação de estar fazendo errado sem perceber',
        image: '/img/q1-card-d.webp',
      },
    ],
  },
  {
    id: 2,
    key: 'gasto_terceiros',
    lastStep: 'quiz_pergunta_2',
    eventName: 'respondeu_pergunta_2',
    tipo: 'input_numero',
    titulo:
      'Quanto você já gastou (ou já te orçaram) com freelancer ou desenvolvedor pra mexer em coisas que você gostaria de resolver por conta própria?',
    label: 'Valor aproximado',
    unidade: 'R$',
  },
  {
    id: 3,
    key: 'forma_de_criar',
    lastStep: 'quiz_pergunta_3',
    eventName: 'respondeu_pergunta_3',
    tipo: 'multipla_escolha',
    titulo: 'Como você costuma criar suas coisas com a IA hoje?',
    opcoes: [
      { value: 'A', label: 'Peço, ela entrega, eu copio e torço pra funcionar' },
      { value: 'B', label: 'Vou testando na tentativa e erro até dar certo de algum jeito' },
      { value: 'C', label: 'Sigo tutoriais e adapto como dá pro meu caso' },
      { value: 'D', label: 'Chamo alguém pra fazer a parte técnica pra mim' },
    ],
  },
  {
    id: 4,
    key: 'ja_quebrou',
    lastStep: 'quiz_pergunta_4',
    eventName: 'respondeu_pergunta_4',
    tipo: 'sim_nao',
    titulo:
      'Já aconteceu de algo seu funcionar por uns dias e depois quebrar, e você não saber por onde começar a olhar?',
    sim: 'Sim, já passei por isso',
    nao: 'Não, ainda não',
  },
  {
    id: 5,
    key: 'nivel_refem',
    lastStep: 'quiz_pergunta_5',
    eventName: 'respondeu_pergunta_5',
    tipo: 'slider',
    titulo: 'Quando algo dá errado no que você criou com a IA, o quanto você se sente refém dela?',
    min: 1,
    max: 10,
    labelMin: 'Eu resolvo, estou no controle',
    labelMax: 'Fico totalmente travado, dependo dela',
  },
  {
    id: 6,
    key: 'custo_mensal',
    lastStep: 'quiz_pergunta_6',
    eventName: 'respondeu_pergunta_6',
    tipo: 'calculadora',
    titulo: 'Vamos ver quanto o tempo travado custa pra você.',
    campo1: {
      key: 'horas_retrabalho',
      label: 'Horas por semana que você perde tentando fazer a IA consertar algo',
      unidade: 'horas',
    },
    campo2: {
      key: 'valor_hora',
      label: 'Quanto vale a sua hora de trabalho',
      unidade: 'R$',
    },
    resultadoKey: 'custo_mensal',
  },
  {
    id: 7,
    key: 'peso_principal',
    lastStep: 'quiz_pergunta_7',
    eventName: 'respondeu_pergunta_7',
    tipo: 'multipla_escolha',
    titulo: 'Olhando esse valor, o que mais pesa pra você?',
    opcoes: [
      { value: 'A', label: 'O dinheiro que escorre em retrabalho e em terceiros' },
      { value: 'B', label: 'O tempo que eu poderia usar criando, não consertando' },
      { value: 'C', label: 'A sensação de não ter controle do que é meu' },
      { value: 'D', label: 'As ideias boas que ficam paradas porque eu travo' },
    ],
  },
  {
    id: 8,
    key: 'visualizacao',
    lastStep: 'quiz_pergunta_8',
    eventName: 'respondeu_pergunta_8',
    tipo: 'multipla_escolha',
    titulo:
      'Imagine que daqui a 30 dias você abre o seu projeto, a IA gera, você entende o que ela fez, ajusta dois detalhes e põe no ar funcionando. O que muda primeiro?',
    opcoes: [
      { value: 'A', label: 'Eu mesmo mexo no que precisa, na hora, sem esperar ninguém' },
      { value: 'B', label: 'Explico pra um sócio ou cliente como funciona, com segurança' },
      { value: 'C', label: 'Tiro do papel aquela ideia que estava parada há meses' },
      { value: 'D', label: 'Olho o que a IA gerou e sei dizer se está certo antes de publicar' },
    ],
  },
  {
    id: 9,
    key: 'o_que_falta',
    lastStep: 'quiz_pergunta_9',
    eventName: 'respondeu_pergunta_9',
    tipo: 'multipla_escolha',
    titulo: 'O que mais falta pra você sair dessa posição?',
    opcoes: [
      { value: 'A', label: 'Um critério pra saber quando confiar na IA e quando questionar' },
      { value: 'B', label: 'Entender o mínimo do que está acontecendo por baixo' },
      { value: 'C', label: 'Parar de depender de outra pessoa pra cada ajuste' },
      { value: 'D', label: 'Um ponto de partida claro, porque hoje eu me perco' },
    ],
  },
  {
    id: 10,
    key: 'mudanca_desejada',
    lastStep: 'quiz_pergunta_10',
    eventName: 'respondeu_pergunta_10',
    tipo: 'multipla_escolha',
    titulo: 'Se desse pra mudar uma coisa a partir de hoje, qual seria?',
    opcoes: [
      { value: 'A', label: 'Passar a comandar a IA, em vez de depender dela' },
      { value: 'B', label: 'Criar com qualidade, confiando no que ponho no ar' },
      { value: 'C', label: 'Ter autonomia pra tocar minhas ideias por conta própria' },
      { value: 'D', label: 'Entender o que faço, pra parar de criar no escuro' },
    ],
  },
]

export const TOTAL_PERGUNTAS = QUIZ_STEPS.length
export const PERGUNTA_1 = QUIZ_STEPS[0] as MultiplaEscolhaStep
/** Perguntas exibidas na tela /quiz (P2..P10). */
export const QUIZ_STEPS_RESTANTES = QUIZ_STEPS.slice(1)
