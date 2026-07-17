/**
 * Definição enxuta de bloco Blockly compatível com Blockly.Blocks.defineBlocksWithJsonArray.
 *
 * ⚠️ NÃO existe campo `level` aqui: o nível do bloco tem fonte ÚNICA em
 * `blockly/blockLevels.ts` (`resolveBlockLevel`). O campo vestigial foi removido
 * na reforma 2D/3D (07/2026) — nada o lia e ele enganava como fonte dupla.
 */
export interface BlockDefinition {
  type: string
  message0?: string
  args0?: unknown[]
  message1?: string
  args1?: unknown[]
  message2?: string
  args2?: unknown[]
  previousStatement?: string | null
  nextStatement?: string | null
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
}
