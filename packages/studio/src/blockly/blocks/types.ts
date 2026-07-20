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
  /** Contextos ancestrais que invalidam o bloco mesmo quando outro contexto permitido coincide. */
  forbiddenNested?: readonly StatementContext[]
  role: 'declaration' | 'command' | 'event' | 'loop' | 'value'
  phase?: 'update' | 'periodic' | 'draw-world' | 'draw-hud'
}

/**
 * Vocabulário curto para declarar o posicionamento junto de catálogos grandes.
 * Cada preset é expandido pelo registro central; nenhum deles infere semântica
 * pelo nome do bloco.
 */
export type BlockPlacementPreset =
  | 'command'
  | 'start-declaration'
  | 'event'
  | 'event-body'
  | 'loop-update'
  | 'loop-periodic'
  | 'loop-draw-world'
  | 'loop-draw-hud'
  | 'loop-body'
  | 'legacy-start'
  | 'start-only-command'
  | 'resource-creator'
  | 'class-member'
  | 'switch-case'

export type BlockPlacementDeclaration = BlockPlacement | BlockPlacementPreset

export type BlockMigration =
  | 'keep'
  | 'unwrap-start'
  | 'unwrap-load'
  | 'remove-engine-boot'
  | 'lift-periodic-loop'

interface BlockDefinitionBase {
  type: string
  message0?: string
  args0?: unknown[]
  message1?: string
  args1?: unknown[]
  message2?: string
  args2?: unknown[]
  message3?: string
  args3?: unknown[]
  message4?: string
  args4?: unknown[]
  message5?: string
  args5?: unknown[]
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
}

export type ProjectAreaBlockType =
  | 'sz_frame_structure'
  | 'sz_frame_appearance'
  | 'sz_frame_behavior'
  | 'sz_frame_start'
  | 'sz_frame_events'
  | 'sz_frame_loops'

type ContentStatementCheck = 'HTMLNode' | 'CSSEntry' | 'CSSDecl' | 'KeyframeStep'

export type BlockDefinition = BlockDefinitionBase &
  (
    | {
        type: ProjectAreaBlockType
        previousStatement?: never
        nextStatement?: never
        output?: never
        placement?: never
        migration?: never
      }
    | {
        previousStatement: ContentStatementCheck
        nextStatement: ContentStatementCheck
        output?: never
        placement?: never
        migration?: never
      }
    | {
        output: string | null
        previousStatement?: never
        nextStatement?: never
        /** Valores dependentes de contexto, como dados de evento, declaram onde cabem. */
        placement?: BlockPlacementDeclaration
        migration?: never
      }
    | {
        /** Contrato semântico obrigatório para todo bloco executável de comportamento. */
        placement: BlockPlacementDeclaration
        previousStatement?: string | string[] | null
        nextStatement?: string | string[] | null
        output?: never
        /** Regra explícita de compatibilidade; ausente significa `keep`. */
        migration?: BlockMigration
      }
  )
