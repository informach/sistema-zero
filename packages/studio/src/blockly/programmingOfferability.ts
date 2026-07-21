import type { LearningProfile } from '#core'
import { FUNCTION_BLOCKS } from './blocks/functions'
import { OOP_BLOCKS } from './blocks/oop'
import type { BlockDefinition } from './blocks/types'

/**
 * Fonte única das categorias dinâmicas de Programação. Retorno e parâmetros
 * pertencem a Funções; Classes contém apenas os blocos próprios de OO. Blocos
 * `hidden` continuam registrados para compatibilidade, mas nunca são oferta.
 */
const FUNCTION_SHARED_TYPES = new Set(['sz_js_return', 'sz_js_return_void', 'sz_val_arg'])

export const PROGRAMMING_PARAMETER_SCOPE_TYPES: ReadonlySet<string> = new Set([
  'sz_js_class_method',
  'sz_js_constructor',
  'sz_js_function',
])

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

/**
 * Um relator de parâmetro só produz conteúdo quando a aula também oferece um
 * bloco que cria esse escopo. Métodos e construtores vivem em Classes, mas o
 * relator continua intencionalmente centralizado no flyout Funções.
 */
export function restrictedFunctionsCategoryHasContent(allowed: ReadonlySet<string>): boolean {
  if (FUNCTION_STATIC_DEFINITIONS.some((definition) => allowed.has(definition.type))) return true
  return (
    allowed.has('sz_val_arg') &&
    [...PROGRAMMING_PARAMETER_SCOPE_TYPES].some((type) => allowed.has(type))
  )
}

/**
 * Classes com parâmetros precisam do relator contextual que vive em Funções.
 * `allowBlocks` continua soberano quando presente; este vínculo só completa a
 * oferta de uma categoria Classes explicitamente liberada pelo professor.
 */
export function classesCategoryProvidesContextualParameters(profile: LearningProfile): boolean {
  return (
    !(profile.allowBlocks && profile.allowBlocks.length > 0) &&
    profile.allowCategories?.includes('Classes') === true
  )
}
