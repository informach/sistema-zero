import type { BlockLevel, ExampleExperience, ProjectAsset } from '#core'
import type { SZIRV2 } from '#ir'
import type { BlockDefinition } from '../blockly/blocks/types'

export type ExtensionPermission = 'canvas' | 'keyboard' | 'mouse' | 'audio' | 'storage' | 'network'

export interface ProjectRunScheduler {
  onFrame(callback: (deltaSeconds: number) => void): () => void
  everyFrames(frames: number, callback: () => void): () => void
  everySeconds(seconds: number, callback: () => void): () => void
  pause(): void
  resume(): void
  dispose(): void
}

/** Handles são números no iframe do navegador e objetos no ambiente Bun/Node. */
export type ProjectRunTimeoutHandle = number | ReturnType<typeof setTimeout>
export type ProjectRunIntervalHandle = number | ReturnType<typeof setInterval>

export interface ProjectRunContext {
  signal: AbortSignal
  scheduler: ProjectRunScheduler
  /** Executa um callback dentro da fronteira terminal da partida atual. */
  run<T>(callback: () => T): T | undefined
  /** Distingue o sinal interno de reinício de erros reais do projeto. */
  isControlSignal(error: unknown): boolean
  setTimeout(callback: () => void, delayMs: number): ProjectRunTimeoutHandle
  setInterval(callback: () => void, delayMs: number): ProjectRunIntervalHandle
  requestFrame(callback: FrameRequestCallback): number
  /**
   * Instala um handler de propriedade DOM (onclick/onload/onerror) que deixa de
   * executar e é removido quando a partida atual termina.
   */
  setEventHandler(
    target: object | null | undefined,
    property: string,
    callback: (event: Event) => unknown,
  ): void
  registerResource(dispose: () => void): void
  requestRestart(): void
}

export type ProjectLifecycleTarget =
  | 'core'
  | 'game-2d'
  | 'game-2d-advanced'
  | 'game-3d'
  | 'game-3d-advanced'
  | 'world-3d'

/** Descreve como o gerador conversa com o adapter implementado no iframe. */
export interface RuntimeLifecycleContract {
  target: ProjectLifecycleTarget
  extensionId?: string
  globalName?: string
  runMethod?: string
  runId?: string
  /** A factory pode rodar novamente em memória e precisa descartar recursos web. */
  managedProjectRun?: boolean
  bootMethod?: string
  restartMethod?: string
  pauseMethod?: string
  resumeMethod?: string
  disposeMethod?: string
}

/**
 * Default do `minLevel` de extensão SEM classificação: `intermediario-3d` — o
 * degrau em que o legado `intermediario` normaliza. Preserva "aparecia quando o
 * intermediário antigo aparecia" para perfis legados e é CONSERVADOR para os
 * degraus novos (extensão nova não vaza p/ Inventor/Explorador sem opt-in).
 */
export const DEFAULT_EXTENSION_MIN_LEVEL: BlockLevel = 'intermediario-3d'

/** Degrau mínimo efetivo de uma extensão (fonte única — não use `?? '…'` inline). */
export function extensionMinLevel(ext: Pick<ExtensionDefinition, 'minLevel'>): BlockLevel {
  return ext.minLevel ?? DEFAULT_EXTENSION_MIN_LEVEL
}

export interface ExtensionManifest {
  /** Identificador único (kebab-case). Ex.: 'game-2d'. */
  id: string
  name: string
  version: string
  description: string
  category: string
  /** Sempre true; o catálogo do Sistema Zero só aceita extensões oficiais. */
  official: true
  /** Não-oficiais nunca aparecem; este flag é apenas auto-documentação. */
  enabledByDefault: boolean
  permissions: ExtensionPermission[]
  /**
   * Documentação em markdown para o usuário final — NÃO é o prompt da IA. O
   * contexto da IA vive em `ExtensionDefinition.ai.promptContext`.
   */
  docs: string
}

export type ExtensionExampleDifficulty = 'beginner' | 'intermediate' | 'advanced'

export interface ExtensionExample {
  name: string
  experience: ExampleExperience
  description?: string
  /** Complexidade editorial para descoberta; não altera os blocos liberados. */
  difficulty?: ExtensionExampleDifficulty
  /** Conceitos pesquisáveis, em linguagem curta para criança/professor. */
  concepts?: readonly string[]
  /** Família do jogo (plataforma, corrida, RPG, quebra-cabeça…). */
  genre?: string
  /** Posição opcional num percurso recomendado; menor aparece primeiro. */
  recommendedOrder?: number
  /** Destaca o exemplo no percurso inicial da galeria. */
  featured?: boolean
  ir: SZIRV2
  /**
   * Assets embutidos que o exemplo precisa (ex.: um sprite pequeno do inimigo). Como
   * os assets de jogos reais são pesados, use SÓ imagens minúsculas geradas (ver o
   * `invadersStarfieldPng` do exemplo clássico). Vazio/ausente = exemplo sem asset.
   */
  assets?: ProjectAsset[]
}

/** Catálogo pesado de exemplos, carregado somente quando alguma UI o exibe. */
export interface ExtensionExamplesProvider {
  /** Quantidade disponível para metadados e estados vazios sem baixar o catálogo. */
  count: number
  /** Importa o chunk dos exemplos preservando a ordem editorial declarada. */
  load(): Promise<readonly ExtensionExample[]>
}

/**
 * Toolbox category contract — equivalente ao formato Blockly mas tipado. O
 * `contents` aceita blocos OU sub-categorias aninhadas (grupos coloridos por
 * domínio, à la Scratch/MakeCode — ex.: Jogo 2D → Sprites/Movimento/Quando…).
 */
/** Sombras pré-preenchidas dos slots `input_value` de um bloco da paleta, no formato
 * do toolbox do Blockly (ex.: { TITLE: { shadow: { type, fields } } }) — estrutura livre. */
// biome-ignore lint/suspicious/noExplicitAny: o formato de shadow do Blockly é livre.
export type ToolboxBlockInputs = Record<string, any>

export interface ExtensionToolboxCategory {
  kind: 'category'
  name: string
  colour: string
  contents: Array<
    { kind: 'block'; type: string; inputs?: ToolboxBlockInputs } | ExtensionToolboxCategory
  >
}

export type ExtensionRuntimeDefinition = {
  /** Contrato interno do ciclo de vida; obrigatório em toda extensão oficial. */
  lifecycle: RuntimeLifecycleContract
  /** Módulos ESM exigidos pelo bootstrap. */
  esmImports?: Record<string, string>
} & (
  | {
      /** Compatibilidade para fixtures/runtimes pequenos já residentes. */
      bootstrapScript: string
      loadBootstrapScript?: never
    }
  | {
      /** Importa o chunk pesado somente quando a extensão vai executar. */
      bootstrapScript?: never
      loadBootstrapScript(): Promise<string>
    }
)

/**
 * Definição completa de uma extensão oficial — bundlada estaticamente.
 */
export interface ExtensionDefinition {
  manifest: ExtensionManifest
  /** Provider assíncrono obrigatório; mantém IRs e assets fora do boot do Studio. */
  examples: ExtensionExamplesProvider
  /** Extensões oficiais que não podem coexistir no mesmo projeto. */
  conflictsWith?: readonly string[]
  /**
   * Degrau mínimo de aprendizado para a categoria da extensão aparecer na paleta
   * (divulgação progressiva). Ausente ⇒ `DEFAULT_EXTENSION_MIN_LEVEL`. Use
   * `extensionMinLevel(ext)` nos call sites (nunca `?? '…'` inline).
   */
  minLevel?: BlockLevel
  blockly: {
    /** Block JSON definitions (compatíveis com defineBlocksWithJsonArray). */
    blocks: BlockDefinition[]
    toolboxCategory: ExtensionToolboxCategory
  }
  runtime: ExtensionRuntimeDefinition
  ai?: {
    /** Manual completo, disponível para operações especializadas/retrieval. */
    promptContext?: string
    /** Resumo operacional enviado em toda chamada; evita pagar o manual inteiro. */
    promptSummary?: string
    /** Carrega o manual completo somente quando uma operação especializada pedir. */
    loadPromptContext?: () => Promise<string>
  }
}
