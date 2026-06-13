import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { ADVANCED_BLOCKS } from './advanced'
import { CANVAS_BLOCKS } from './canvas'
import { CSS_BLOCKS } from './css'
import { FUNCTION_BLOCKS } from './functions'
import { HTML_BLOCKS } from './html'
import { JS_BLOCKS } from './js'
import { MATH_BLOCKS } from './math'
import { OBJECT_BLOCKS } from './objects'
import { OOP_BLOCKS } from './oop'
import type { BlockDefinition } from './types'
import { VALUE_BLOCKS } from './values'

export type { BlockDefinition }
export {
  ADVANCED_BLOCKS,
  CANVAS_BLOCKS,
  CSS_BLOCKS,
  FUNCTION_BLOCKS,
  HTML_BLOCKS,
  JS_BLOCKS,
  MATH_BLOCKS,
  OBJECT_BLOCKS,
  OOP_BLOCKS,
  VALUE_BLOCKS,
}

export const CORE_BLOCKS: BlockDefinition[] = [
  ...HTML_BLOCKS,
  ...CSS_BLOCKS,
  ...JS_BLOCKS,
  ...CANVAS_BLOCKS,
  ...VALUE_BLOCKS,
  ...MATH_BLOCKS,
  ...OOP_BLOCKS,
  ...OBJECT_BLOCKS,
  ...FUNCTION_BLOCKS,
  ...ADVANCED_BLOCKS,
]

let coreRegistered = false

/**
 * Registra todos os blocos core no Blockly. Idempotente — chamar mais de uma vez é seguro.
 */
export function registerCoreBlocks(): void {
  if (coreRegistered) return
  Blockly.defineBlocksWithJsonArray(CORE_BLOCKS as object[])
  coreRegistered = true
}

/**
 * Registra blocos arbitrários (usado por extensões oficiais).
 * Idempotente por tipo: se já existir um bloco com mesmo `type`, ignora.
 */
export function registerExtensionBlocks(blocks: BlockDefinition[]): void {
  const novos = blocks.filter((b) => !Blockly.Blocks[b.type])
  if (novos.length > 0) Blockly.defineBlocksWithJsonArray(novos as object[])
}

/**
 * APENAS para teardown de teste. Remove os blocos de uma extensão pelo tipo.
 *
 * O registro `Blockly.Blocks` é um global de módulo (UMD) compartilhado por
 * todas as instâncias `<Studio>` na página (invariante #5), então a remoção de
 * extensão por-instância NUNCA chama isto — apagar uma definição derrubaria as
 * outras instâncias que ainda a usam. A categoria some porque a toolbox é
 * reconstruída a partir do `installedExtensions`; ver `removeExtension` em
 * `state/extensionsAdapter.ts`.
 */
export function unregisterBlocks(types: string[]): void {
  for (const t of types) {
    delete Blockly.Blocks[t]
  }
}
