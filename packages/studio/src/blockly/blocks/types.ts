/**
 * Definição enxuta de bloco Blockly compatível com Blockly.Blocks.defineBlocksWithJsonArray.
 *
 * ⚠️ NÃO existe campo `level` aqui: o nível do bloco tem fonte ÚNICA em
 * `blockly/blockLevels.ts` (`resolveBlockLevel`). O campo vestigial foi removido
 * na reforma 2D/3D (07/2026) — nada o lia e ele enganava como fonte dupla.
 */
export type BehaviorArea = 'start' | 'events' | 'loops'

export type StatementContext =
  | 'statement'
  | 'event-body'
  | 'loop-body'
  | 'function-body'
  | 'async-function-body'
  | 'derived-constructor-body'
  | 'derived-method-body'
  | 'class-member'
  | 'draw-world'
  | 'draw-hud'
  | 'map-draw'
  | 'map-enter'

export interface BlockPlacement {
  root: readonly BehaviorArea[]
  nested: readonly StatementContext[]
  role: 'declaration' | 'command' | 'event' | 'loop' | 'value'
  phase?: 'update' | 'periodic' | 'draw-world' | 'draw-hud'
}

export interface BlockDefinition {
  type: string
  message0?: string
  args0?: unknown[]
  message1?: string
  args1?: unknown[]
  message2?: string
  args2?: unknown[]
  previousStatement?: string | string[] | null
  nextStatement?: string | string[] | null
  output?: string | null
  colour?: string | number
  tooltip?: string
  helpUrl?: string
  inputsInline?: boolean
  /** Nome de um mutator registrado (ex.: argumentos variádicos em new/chamar método). */
  mutator?: string
  /** Extensões registradas a aplicar ao bloco. */
  extensions?: string[]
  /**
   * Quando `true`, o bloco é registrado no Blockly (para que workspaces salvos
   * que o contenham ainda carreguem) mas NÃO aparece na paleta da toolbox.
   * Usado para blocos legados substituídos por versões mais novas.
   */
  hidden?: boolean
  /**
   * Exceção explícita ao contrato inferido pelo catálogo central. A maioria dos
   * blocos usa a regra canônica do seu papel; somente contextos especializados
   * precisam declarar uma substituição junto à definição.
   */
  placement?: BlockPlacement
}
