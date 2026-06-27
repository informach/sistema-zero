// Definição tipada do quiz (fonte única). As 10 perguntas rodam todas na tela
// /quiz (a P1, com imagens, é o primeiro passo; `/` redireciona para /quiz).
// Copy em pt-BR, verbatim do briefing. `last_step` vai de quiz_pergunta_1..10.

export const LEAD_KEYS = [
  'segmento', // P1
  'tipo_criar', // P2 (não pontua)
  'relacao_ia', // P3
  'ja_quebrou', // P4
  'trava_principal', // P5
  'custo_principal', // P6
  'horas_retrabalho', // P7 (calculadora)
  'valor_hora', // P7 (calculadora)
  'custo_mensal', // P7 (derivado)
  'mudanca_desejada', // P8
  'proximo_passo', // P9
  'sintese', // P10 (não pontua)
] as const

export type LeadKey = (typeof LEAD_KEYS)[number]

/** Chaves que guardam números (as monetárias são salvas em CENTAVOS). */
export const NUMERIC_KEYS = new Set<LeadKey>(['horas_retrabalho', 'valor_hora', 'custo_mensal'])

/** Chaves monetárias (o cliente envia centavos; o admin formata como R$). */
export const MONEY_KEYS = new Set<LeadKey>(['valor_hora', 'custo_mensal'])

export interface Opcao {
  value: string
  label: string
  /** Selo curto no badge (ex.: emoji 🎮 ou letra). Default: o próprio `value`. */
  badge?: string
  /** URL pública da imagem (public/img/...). Renderiza placeholder se ausente. */
  image?: string
}

interface StepBase {
  id: number
  key: string
  lastStep: string
  eventName: string
  titulo: string
  /** Aviso/subtítulo opcional renderizado abaixo do título (ex.: P7). */
  subtitulo?: string
}

export interface MultiplaEscolhaStep extends StepBase {
  tipo: 'multipla_escolha'
  comImagem?: boolean
  /**
   * Layout dos cards quando `comImagem` (todas as opções com `image`):
   * - `'fundo'` (default): foto cobre o card com gradiente e o texto por cima.
   * - `'topo'`: foto no topo + texto legível embaixo (melhor p/ textos longos).
   */
  imagemLayout?: 'fundo' | 'topo'
  opcoes: Opcao[]
}
export interface CalculadoraStep extends StepBase {
  tipo: 'calculadora'
  campo1: { key: string; label: string; unidade: string }
  campo2: { key: string; label: string; unidade: string }
  resultadoKey: string
}

/** Calculadora com o 1º campo PRÉ-PREENCHIDO por uma resposta anterior (`sourceKey`). */
export interface CalculadoraPrefilledStep extends StepBase {
  tipo: 'calculadora_prefilled'
  campo1: { key: string; label: string; unidade: string; sourceKey: string }
  campo2: { key: string; label: string; unidade: string }
  resultadoKey: string
  /** Fórmula do preview: campo1 × campo2 × multiplicador (ex.: 52 semanas/ano). */
  multiplicador: number
  /** Texto do resultado (template com `{resultado}`). */
  textoResultado: string
}

/** Entrada de um número (ex.: horas/dia). O botão "Continuar" envia o valor. */
export interface InputNumeroStep extends StepBase {
  tipo: 'input_numero'
  label: string
  unidade?: string
  min: number
  max: number
}

/** Slider de `min`..`max` (ex.: 1–10) com rótulos nas pontas. "Continuar" envia o valor. */
export interface SliderStep extends StepBase {
  tipo: 'slider'
  min: number
  max: number
  label?: string
  minLabel: string
  maxLabel: string
}

/** Sim/Não: 2 opções fixas com rótulos próprios; valores `'sim'`/`'nao'`. */
export interface SimNaoStep extends StepBase {
  tipo: 'sim_nao'
  opcaoSim: string
  opcaoNao: string
}

export type QuizStep =
  | MultiplaEscolhaStep
  | CalculadoraStep
  | CalculadoraPrefilledStep
  | InputNumeroStep
  | SliderStep
  | SimNaoStep

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
        label:
          'Tenho uma ideia ou um problema que daria pra resolver com um sistema, mas acho que isso é coisa de programador',
        image: '/img/no-comando-da-ia/q1-card-a.webp',
      },
      {
        value: 'B',
        label: 'Já criei algo com IA, funcionou, e depois quebrou sem eu saber por quê',
        image: '/img/no-comando-da-ia/q1-card-b.webp',
      },
      {
        value: 'C',
        label: 'Tenho algo no ar, mas dependo de freelancer ou da IA pra cada mudança',
        image: '/img/no-comando-da-ia/q1-card-c.webp',
      },
      {
        value: 'D',
        label: 'Crio com IA, mas fico com a sensação de estar fazendo errado sem perceber',
        image: '/img/no-comando-da-ia/q1-card-d.webp',
      },
    ],
  },
  {
    id: 2,
    key: 'tipo_criar',
    lastStep: 'quiz_pergunta_2',
    eventName: 'respondeu_pergunta_2',
    tipo: 'multipla_escolha',
    titulo: 'Que tipo de coisa você gostaria de tirar do papel?',
    opcoes: [
      {
        value: 'A',
        label: 'Um sistema simples pra organizar processos, clientes, tarefas ou informações',
      },
      { value: 'B', label: 'Uma página, quiz, calculadora ou ferramenta pra vender melhor' },
      { value: 'C', label: 'Uma automação pra economizar tempo no meu trabalho' },
      { value: 'D', label: 'Um app ou plataforma que está parada na minha cabeça há um tempo' },
      { value: 'E', label: 'Ainda não sei bem, só quero entender o que é possível' },
    ],
  },
  {
    id: 3,
    key: 'relacao_ia',
    lastStep: 'quiz_pergunta_3',
    eventName: 'respondeu_pergunta_3',
    tipo: 'multipla_escolha',
    titulo: 'Qual é a sua relação com a IA hoje quando pensa em criar algo?',
    opcoes: [
      { value: 'A', label: 'Ainda não comecei, porque não sei por onde ir' },
      { value: 'B', label: 'Peço, ela entrega, eu copio e torço pra funcionar' },
      { value: 'C', label: 'Sigo tutoriais e adapto como dá pro meu caso' },
      { value: 'D', label: 'Chamo alguém pra fazer a parte técnica pra mim' },
    ],
  },
  {
    id: 4,
    key: 'ja_quebrou',
    lastStep: 'quiz_pergunta_4',
    eventName: 'respondeu_pergunta_4',
    tipo: 'multipla_escolha',
    titulo:
      'Já aconteceu de algo seu funcionar por uns dias e depois quebrar, e você não saber por onde começar a olhar?',
    opcoes: [
      { value: 'A', label: 'Sim, já passei por isso' },
      { value: 'B', label: 'Ainda não, porque nem cheguei a criar algo de verdade' },
      {
        value: 'C',
        label: 'Não exatamente, mas tenho medo de publicar algo sem saber se está certo',
      },
      { value: 'D', label: 'Não, meu problema maior é depender de alguém para ajustar' },
    ],
  },
  {
    id: 5,
    key: 'trava_principal',
    lastStep: 'quiz_pergunta_5',
    eventName: 'respondeu_pergunta_5',
    tipo: 'multipla_escolha',
    titulo: 'Quando você pensa em criar um sistema, o que mais te trava?',
    opcoes: [
      { value: 'A', label: 'Não sei transformar minha ideia num plano claro' },
      { value: 'B', label: 'Travo quando dá erro ou precisa mudar algo' },
      { value: 'C', label: 'Dependo de outra pessoa pra cada ajuste' },
      { value: 'D', label: 'Não sei avaliar se o que a IA entrega está certo' },
    ],
  },
  {
    id: 6,
    key: 'custo_principal',
    lastStep: 'quiz_pergunta_6',
    eventName: 'respondeu_pergunta_6',
    tipo: 'multipla_escolha',
    titulo: 'Olhando o que mais te trava, o que isso já te custou?',
    opcoes: [
      { value: 'A', label: 'Uma ideia boa parada há meses' },
      { value: 'B', label: 'Tempo tentando fazer a IA consertar sem sair do lugar' },
      { value: 'C', label: 'Dinheiro ou espera com freelancer e terceiros' },
      { value: 'D', label: 'A insegurança de não saber se o que publiquei está de pé' },
      {
        value: 'E',
        label:
          'Ainda não me custou dinheiro, mas vejo gente saindo na frente enquanto a minha ideia segue parada',
      },
    ],
  },
  {
    id: 7,
    key: 'custo_mensal',
    lastStep: 'quiz_pergunta_7',
    eventName: 'respondeu_pergunta_7',
    tipo: 'calculadora',
    titulo: 'Quer ver quanto esse bloqueio te custa por mês?',
    subtitulo: 'Se você ainda não começou ou nunca tentou nada, é só colocar 0 nos dois campos.',
    campo1: {
      key: 'horas_retrabalho',
      label:
        'Horas por semana que você perde por causa desse bloqueio, travado, pesquisando, esperando ou refazendo',
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
    id: 8,
    key: 'mudanca_desejada',
    lastStep: 'quiz_pergunta_8',
    eventName: 'respondeu_pergunta_8',
    tipo: 'multipla_escolha',
    titulo:
      'Imagine que daqui a 30 dias você senta pra tirar a sua ideia do papel: conversa com a IA sabendo o que pedir, entende o que ela te entregou e sabe qual é o próximo passo. O que muda primeiro pra você?',
    opcoes: [
      {
        value: 'A',
        label: 'Tiro do papel aquela ideia que estava parada, agora com um plano claro pra começar',
      },
      {
        value: 'B',
        label: 'Quando algo dá errado, eu sei onde olhar, em vez de abrir outra conversa no escuro',
      },
      { value: 'C', label: 'Eu mesmo faço os ajustes simples, na hora, sem esperar ninguém' },
      { value: 'D', label: 'Olho o que a IA entregou e sei dizer se está certo antes de publicar' },
    ],
  },
  {
    id: 9,
    key: 'proximo_passo',
    lastStep: 'quiz_pergunta_9',
    eventName: 'respondeu_pergunta_9',
    tipo: 'multipla_escolha',
    titulo: 'Pra dar esse primeiro passo nos próximos 30 dias, o que você mais precisa agora?',
    opcoes: [
      { value: 'A', label: 'Organizar a ideia num plano claro antes de pedir pra IA construir' },
      { value: 'B', label: 'Um critério pra entender e confiar no que a IA me entrega' },
      { value: 'C', label: 'Conseguir resolver os ajustes simples sem depender de ninguém' },
      { value: 'D', label: 'Uma forma de testar se está certo antes de publicar' },
    ],
  },
  {
    id: 10,
    key: 'sintese',
    lastStep: 'quiz_pergunta_10',
    eventName: 'respondeu_pergunta_10',
    tipo: 'multipla_escolha',
    titulo: 'Pra fechar: o que você quer que mude no seu jeito de criar com IA?',
    opcoes: [
      { value: 'A', label: 'Sair do pedir e torcer e passar a conduzir com critério' },
      { value: 'B', label: 'Transformar a ideia solta em algo que a IA consiga construir' },
      { value: 'C', label: 'Avaliar e ajustar o que a IA entrega sem depender de terceiros' },
      { value: 'D', label: 'Parar de me sentir refém da ferramenta e voltar pro comando' },
    ],
  },
]

export const TOTAL_PERGUNTAS = QUIZ_STEPS.length
