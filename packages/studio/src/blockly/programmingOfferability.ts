import { FUNCTION_BLOCKS } from './blocks/functions'
import { OOP_BLOCKS } from './blocks/oop'
import type { BlockDefinition } from './blocks/types'

/**
 * Fonte única das categorias dinâmicas de Programação. Retorno e parâmetros
 * pertencem a Funções; Classes contém apenas os blocos próprios de OO. Blocos
 * `hidden` continuam registrados para compatibilidade, mas nunca são oferta.
 */
const FUNCTION_SHARED_TYPES = new Set(['sz_js_return', 'sz_js_return_void', 'sz_val_arg'])

export const FUNCTION_CATEGORY_DEFINITIONS: readonly BlockDefinition[] = [
  ...FUNCTION_BLOCKS.filter((definition) => !definition.hidden),
  ...OOP_BLOCKS.filter(
    (definition) => !definition.hidden && FUNCTION_SHARED_TYPES.has(definition.type),
  ),
]

export const FUNCTION_STATIC_DEFINITIONS: readonly BlockDefinition[] =
  FUNCTION_CATEGORY_DEFINITIONS.filter((definition) => definition.type !== 'sz_val_arg')

export const CLASS_CATEGORY_DEFINITIONS: readonly BlockDefinition[] = OOP_BLOCKS.filter(
  (definition) => !definition.hidden && !FUNCTION_SHARED_TYPES.has(definition.type),
)
