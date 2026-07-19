import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { materializeBlockDefinition, registerBlockContracts } from '../blockContracts'
import { ADVANCED_BLOCKS } from './advanced'
import { CANVAS_BLOCKS, CANVAS_GROUPS } from './canvas'
import { CANVAS3D_BLOCKS, CANVAS3D_GROUPS } from './canvas3d'
import { CSS_BLOCKS, CSS_GROUPS } from './css'
import { DOM_BLOCKS } from './dom'
import { FRAME_BLOCKS } from './frames'
import { FUNCTION_BLOCKS } from './functions'
import { HTML_BLOCKS, HTML_GROUPS } from './html'
import { JS_BLOCKS, JS_GROUPS } from './js'
import { MATH_BLOCKS } from './math'
import { OBJECT_BLOCKS } from './objects'
import { OOP_BLOCKS } from './oop'
import { SVG_BLOCKS, SVG_GROUPS } from './svg'
import type { BlockDefinition } from './types'
import { VALUE_BLOCKS } from './values'

export type { BlockDefinition }
export {
  ADVANCED_BLOCKS,
  CANVAS_BLOCKS,
  CANVAS_GROUPS,
  CANVAS3D_BLOCKS,
  CANVAS3D_GROUPS,
  CSS_BLOCKS,
  CSS_GROUPS,
  DOM_BLOCKS,
  FRAME_BLOCKS,
  FUNCTION_BLOCKS,
  HTML_BLOCKS,
  HTML_GROUPS,
  JS_BLOCKS,
  JS_GROUPS,
  MATH_BLOCKS,
  OBJECT_BLOCKS,
  OOP_BLOCKS,
  SVG_BLOCKS,
  SVG_GROUPS,
  VALUE_BLOCKS,
}

export const CORE_BLOCKS: BlockDefinition[] = [
  ...FRAME_BLOCKS,
  ...HTML_BLOCKS,
  ...SVG_BLOCKS,
  ...CSS_BLOCKS,
  ...DOM_BLOCKS,
  ...JS_BLOCKS,
  ...CANVAS_BLOCKS,
  ...CANVAS3D_BLOCKS,
  ...VALUE_BLOCKS,
  ...MATH_BLOCKS,
  ...OOP_BLOCKS,
  ...OBJECT_BLOCKS,
  ...FUNCTION_BLOCKS,
  ...ADVANCED_BLOCKS,
]

const REGISTERED_DEFINITION_SIGNATURE = Symbol('sz-registered-block-definition')

type RegisteredBlockDefinition = {
  [REGISTERED_DEFINITION_SIGNATURE]?: string
}

function definitionSignature(definition: BlockDefinition): string {
  return JSON.stringify(definition)
}

/**
 * O catálogo Blockly é global e alguns integradores podem registrar a definição
 * JSON oficial diretamente. Nesse caso ela existe, mas ainda não contém os
 * checks físicos derivados do contrato. A assinatura distingue "já correto" de
 * "existe em formato cru" sem redefinir desnecessariamente os blocos válidos.
 */
function registerMaterializedDefinitions(definitions: readonly BlockDefinition[]): void {
  const materialized = definitions.map(materializeBlockDefinition)
  const stale = materialized.filter((definition) => {
    const registered = Blockly.Blocks[definition.type] as RegisteredBlockDefinition | undefined
    return registered?.[REGISTERED_DEFINITION_SIGNATURE] !== definitionSignature(definition)
  })
  if (stale.length === 0) return

  // A API do Blockly avisa no console ao sobrescrever. Remover somente as
  // definições comprovadamente desatualizadas evita um warning falso; blocos já
  // instanciados continuam com sua classe e os próximos usam o contrato novo.
  for (const definition of stale) delete Blockly.Blocks[definition.type]
  Blockly.defineBlocksWithJsonArray(stale as object[])
  for (const definition of stale) {
    const registered = Blockly.Blocks[definition.type] as RegisteredBlockDefinition
    registered[REGISTERED_DEFINITION_SIGNATURE] = definitionSignature(definition)
  }
}

/**
 * Registra todos os blocos core no Blockly. Idempotente — chamar mais de uma vez é seguro.
 */
export function registerCoreBlocks(): void {
  registerBlockContracts(CORE_BLOCKS)
  registerMaterializedDefinitions(CORE_BLOCKS)
}

/**
 * Registra blocos arbitrários (usado por extensões oficiais).
 * Idempotente por tipo: se já existir um bloco com mesmo `type`, ignora.
 */
export function registerExtensionBlocks(blocks: BlockDefinition[]): void {
  registerBlockContracts(blocks)
  registerMaterializedDefinitions(blocks)
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
