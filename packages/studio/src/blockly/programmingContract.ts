import type { BlockLevel } from '#core'
import { inferBlockContract } from './blockContracts'
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

/** Blocos cujo sentido pedagógico depende de um evento em execução. */
export function isEventProgrammingDefinition(definition: BlockDefinition): boolean {
  const placement = inferBlockContract(definition).placement
  if (!placement) return false
  if (placement.role === 'event') return true
  return (
    placement.root.length === 0 &&
    placement.nested.length === 1 &&
    placement.nested[0] === 'event-body'
  )
}

/** Valores que formam, junto dos comandos JS, a unidade pedagógica de listas. */
export const PROGRAMMING_LIST_VALUE_TYPES: ReadonlySet<string> = new Set([
  'sz_val_array',
  'sz_val_array_length',
  'sz_val_array_map',
  'sz_val_array_index',
  'sz_val_array_last',
  'sz_val_array_find',
  'sz_val_array_filter',
  'sz_val_concat_arrays',
  'sz_val_shuffle',
])

/** Valores booleanos usados para montar condições; aparecem junto de Lógica & Se. */
export const PROGRAMMING_CONDITION_VALUE_TYPES: ReadonlySet<string> = new Set([
  'sz_val_bool',
  'sz_val_compare',
  'sz_val_logic',
  'sz_val_not',
])

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
  {
    key: 'page-events',
    category: 'Página e Eventos',
    definitions: [...DOM_BLOCKS, ...VALUE_BLOCKS.filter(isEventProgrammingDefinition)],
  },
  {
    key: 'language',
    category: 'Programação',
    definitions: JS_BLOCKS.filter((definition) => definition.type !== 'sz_js_object_assign'),
  },
  {
    key: 'values',
    category: 'Valores',
    definitions: VALUE_BLOCKS.filter((definition) => !isEventProgrammingDefinition(definition)),
  },
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

/**
 * Orçamento cognitivo do primeiro degrau. O iniciante recebe só as peças para
 * reagir, guardar valores, decidir, repetir e observar o resultado. APIs de
 * navegador, milissegundos, armazenamento e formas duplicadas entram depois.
 */
export const PROGRAMMING_BEGINNER_BUDGET = 25

export const PROGRAMMING_BEGINNER_TYPES = [
  'sz_js_on_click',
  'sz_js_on_click_anywhere',
  'sz_js_on_key',
  'sz_js_on_pointer_down',
  'sz_js_set_property_text',
  'sz_js_set_property_var',
  'sz_val_event_pos',
  'sz_val_event_key',
  'sz_js_console_log_value',
  'sz_js_var_create',
  'sz_js_var_assign',
  'sz_js_var_increment',
  'sz_js_if_else',
  'sz_js_repeat',
  'sz_js_set_timeout_seconds',
  'sz_js_set_interval_seconds',
  'sz_val_number',
  'sz_val_text',
  'sz_val_color',
  'sz_val_variable',
  'sz_val_bool',
  'sz_val_compare',
  'sz_val_logic',
  'sz_val_not',
  'sz_val_random',
] as const

export const PROGRAMMING_ADVANCED_TYPES = [
  'sz_js_event_method',
  'sz_js_element_onclick',
  'sz_js_query_selector_all',
  'sz_js_set_style_text',
  'sz_js_set_dataset',
  'sz_js_create_element_ns',
  'sz_js_throw',
  'sz_js_switch',
  'sz_js_case',
  'sz_js_try_catch',
  'sz_js_await',
  'sz_js_set_timeout_call',
  'sz_val_new_promise',
  'sz_val_promise_all',
  'sz_js_fetch_json',
  'sz_val_device_pixel_ratio',
  'sz_val_system_dark',
  'sz_val_perf_now',
  'sz_val_vector2d',
  'sz_val_vector3d',
  'sz_val_array_map',
  'sz_val_array_find',
  'sz_val_array_filter',
  'sz_val_concat_arrays',
  'sz_val_shuffle',
  'sz_val_dataset',
  'sz_val_class_contains',
  'sz_math_trig',
  'sz_math_atan2',
  'sz_val_distance',
  'sz_math_hypot',
  'sz_math_angle_convert',
  'sz_val_object',
  'sz_val_object_op',
  'sz_val_index_get',
  'sz_val_member_get',
  'sz_val_member_get_optional',
  'sz_js_member_set',
  'sz_js_index_set',
  'sz_val_method_on',
  'sz_js_method_on',
  'sz_js_object_assign',
  'sz_js_class',
  'sz_js_constructor',
  'sz_js_class_method',
  // A espera (await/Promise) é avançada: os dois blocos que a permitem moram aqui.
  'sz_js_function_async',
  'sz_js_class_method_async',
  'sz_js_new_var',
  'sz_js_super_ctor',
  'sz_js_super_method',
  'sz_val_new',
  'sz_js_set_this_prop',
  'sz_val_this_prop',
] as const

const PROGRAMMING_BEGINNER_SET: ReadonlySet<string> = new Set(PROGRAMMING_BEGINNER_TYPES)
const PROGRAMMING_ADVANCED_SET: ReadonlySet<string> = new Set(PROGRAMMING_ADVANCED_TYPES)

/** Todo bloco restante entra no degrau intermediário; bloco novo nunca cai no iniciante por acidente. */
export const PROGRAMMING_INTERMEDIATE_TYPES: readonly string[] =
  PROGRAMMING_VISIBLE_DEFINITIONS.map((definition) => definition.type).filter(
    (type) => !PROGRAMMING_BEGINNER_SET.has(type) && !PROGRAMMING_ADVANCED_SET.has(type),
  )

export function resolveProgrammingBlockLevel(type: string): BlockLevel | undefined {
  if (!PROGRAMMING_VISIBLE_TYPES.has(type)) return undefined
  if (PROGRAMMING_BEGINNER_SET.has(type)) return 'iniciante-2d'
  if (PROGRAMMING_ADVANCED_SET.has(type)) return 'avancado-2d'
  return 'intermediario-2d'
}
