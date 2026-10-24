// Contratos compartilhados pelos quizzes dos funis ativos.

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
  /** Nome curto da pergunta na aba Performance do /admin. Ausente: "Pergunta N". */
  rotuloCurto?: string
  /** Pergunta que só aparece em alguns percursos: no /admin ela não quebra a cadeia de etapas. */
  condicional?: boolean
  /**
   * Ramo do quiz a que a pergunta pertence (id em `FunnelQuiz.branches`). Ausente: a pergunta é
   * comum a todos os percursos. O /admin numera e encadeia cada ramo à parte.
   */
  ramo?: string
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
/** Explicit confirmation, with optional multiple/exclusive choices. */
export interface SelecaoStep extends StepBase {
  tipo: 'selecao'
  /**
   * Etapa da barra do quiz. Comunidade Kids: rotina → casa → desejo (v4: filho/objetivos/começo).
   * Comunidade adulta: rotina → trava → quer.
   */
  etapa: 'rotina' | 'casa' | 'desejo' | 'filho' | 'objetivos' | 'comeco' | 'trava' | 'quer'
  /** Opções em cartas grandes (com a `image` de cada opção, quando houver) em vez de lista. */
  cartas?: boolean
  opcoes: Opcao[]
  multiple?: boolean
  maxSelections?: number
  exclusive?: string[]
  shuffle?: boolean
  fixedLast?: string[]
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
  | SelecaoStep
  | MultiplaEscolhaStep
  | CalculadoraStep
  | CalculadoraPrefilledStep
  | InputNumeroStep
  | SliderStep
  | SimNaoStep
