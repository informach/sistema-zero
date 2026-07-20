import { DOM_BLOCKS } from './blocks/dom'
import { JS_BLOCKS } from './blocks/js'
import { MATH_BLOCKS } from './blocks/math'
import { OBJECT_BLOCKS } from './blocks/objects'
import { OOP_BLOCKS } from './blocks/oop'
import type { BlockDefinition } from './blocks/types'
import { VALUE_BLOCKS } from './blocks/values'
import {
  CLASS_CATEGORY_DEFINITIONS,
  FUNCTION_CATEGORY_DEFINITIONS,
} from './programmingOfferability'

/**
 * Registry pequeno e sem Blockly para a categoria guarda-chuva Programação.
 *
 * É a fronteira incremental entre as definições por família e os consumidores
 * transversais (catálogo da aula, auditoria de copy e contratos de persistência).
 * A ordem é a mesma vista pelo professor no catálogo de `allowBlocks`.
 */
export const PROGRAMMING_CATALOG_GROUPS: readonly {
  key: string
  category: string
  definitions: readonly BlockDefinition[]
}[] = [
  { key: 'page-events', category: 'Página e Eventos', definitions: DOM_BLOCKS },
  {
    key: 'language',
    category: 'Programação',
    definitions: JS_BLOCKS.filter((definition) => definition.type !== 'sz_js_object_assign'),
  },
  { key: 'values', category: 'Valores', definitions: VALUE_BLOCKS },
  { key: 'math', category: 'Matemática', definitions: MATH_BLOCKS },
  { key: 'functions', category: 'Funções', definitions: FUNCTION_CATEGORY_DEFINITIONS },
  {
    key: 'objects',
    category: 'Objetos',
    definitions: [
      ...OBJECT_BLOCKS,
      ...JS_BLOCKS.filter((definition) => definition.type === 'sz_js_object_assign'),
    ],
  },
  { key: 'classes', category: 'Classes', definitions: CLASS_CATEGORY_DEFINITIONS },
] as const

/** Todos os blocos efetivamente ofertados pela categoria, sem duplicatas. */
export const PROGRAMMING_VISIBLE_DEFINITIONS: readonly BlockDefinition[] =
  PROGRAMMING_CATALOG_GROUPS.flatMap((group) => group.definitions).filter(
    (definition) => !definition.hidden,
  )

/** Legados continuam registrados para abrir projetos antigos, mas nunca ofertados. */
export const PROGRAMMING_COMPATIBILITY_DEFINITIONS: readonly BlockDefinition[] = [
  ...new Map(
    [...PROGRAMMING_CATALOG_GROUPS.flatMap((group) => group.definitions), ...OOP_BLOCKS]
      .filter((definition) => definition.hidden)
      .map((definition) => [definition.type, definition] as const),
  ).values(),
]

export const PROGRAMMING_VISIBLE_TYPES: ReadonlySet<string> = new Set(
  PROGRAMMING_VISIBLE_DEFINITIONS.map((definition) => definition.type),
)
