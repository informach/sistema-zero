import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { LearningProfile } from '#core'
import { BLOCK_CATALOG } from '../blockCatalog'
import { classCategoryBlockTypes, functionCategoryBlockTypes } from '../paramsFlyout'
import {
  PROGRAMMING_ADVANCED_TYPES,
  PROGRAMMING_BEGINNER_BUDGET,
  PROGRAMMING_BEGINNER_TYPES,
  PROGRAMMING_CATALOG_GROUPS,
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
  PROGRAMMING_INTERMEDIATE_TYPES,
  PROGRAMMING_VISIBLE_DEFINITIONS,
  PROGRAMMING_VISIBLE_TYPES,
  resolveProgrammingBlockLevel,
} from '../programmingContract'
import { ensureBlocklyInitialized } from '../setup'
import { buildCoreToolbox } from '../toolbox'

function toolboxBlockTypes(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(toolboxBlockTypes)
  if (typeof value !== 'object' || value === null) return []
  const node = value as { kind?: unknown; type?: unknown; contents?: unknown }
  return [
    ...(node.kind === 'block' && typeof node.type === 'string' ? [node.type] : []),
    ...toolboxBlockTypes(node.contents),
  ]
}

describe('contrato exaustivo da categoria Programação', () => {
  it('mantém uma fonte única, sem tipos visíveis repetidos entre famílias', () => {
    const types = PROGRAMMING_VISIBLE_DEFINITIONS.map((definition) => definition.type)
    expect(new Set(types).size).toBe(types.length)
    expect(PROGRAMMING_VISIBLE_TYPES.size).toBe(types.length)
    expect(PROGRAMMING_CATALOG_GROUPS.map((group) => group.key)).toEqual([
      'page-events',
      'language',
      'values',
      'math',
      'functions',
      'objects',
      'classes',
    ])
  })

  it('mantém um orçamento explícito de 25 peças no primeiro degrau', () => {
    expect(PROGRAMMING_BEGINNER_TYPES).toHaveLength(PROGRAMMING_BEGINNER_BUDGET)
    expect(new Set(PROGRAMMING_BEGINNER_TYPES).size).toBe(PROGRAMMING_BEGINNER_BUDGET)
    expect(PROGRAMMING_BEGINNER_TYPES).toEqual([
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
    ])
  })

  it('atribui exatamente um nível a todos os blocos visíveis', () => {
    const tiers = [
      ...PROGRAMMING_BEGINNER_TYPES,
      ...PROGRAMMING_INTERMEDIATE_TYPES,
      ...PROGRAMMING_ADVANCED_TYPES,
    ]
    expect(tiers).toHaveLength(PROGRAMMING_VISIBLE_TYPES.size)
    expect(new Set(tiers)).toEqual(new Set(PROGRAMMING_VISIBLE_TYPES))
    for (const type of PROGRAMMING_VISIBLE_TYPES) {
      expect(resolveProgrammingBlockLevel(type), type).toBeDefined()
    }
    expect(resolveProgrammingBlockLevel('sz_js_on_context_menu')).toBe('intermediario-2d')
    expect(resolveProgrammingBlockLevel('sz_js_set_timeout')).toBe('intermediario-2d')
    expect(resolveProgrammingBlockLevel('sz_js_storage_set')).toBe('intermediario-2d')
    expect(resolveProgrammingBlockLevel('sz_val_storage_get')).toBe('intermediario-2d')
  })

  it('oferece cada allowBlock unitário exatamente uma vez', () => {
    for (const definition of PROGRAMMING_VISIBLE_DEFINITIONS) {
      const profile: LearningProfile = {
        level: 'avancado-3d',
        allowBlocks: [definition.type],
      }
      const staticTypes = toolboxBlockTypes(buildCoreToolbox([], profile))
      const dynamicTypes = [
        ...functionCategoryBlockTypes(profile),
        ...classCategoryBlockTypes(profile),
      ]
      const offered = [...staticTypes, ...dynamicTypes].filter((type) =>
        PROGRAMMING_VISIBLE_TYPES.has(type),
      )

      // O parâmetro é contextual: só vira item depois que existe uma função com
      // parâmetros. O catálogo ainda o associa unicamente a Funções.
      if (definition.type === 'sz_val_arg') {
        expect(offered, definition.type).toEqual([])
        expect(BLOCK_CATALOG.filter((entry) => entry.type === definition.type)).toEqual([
          expect.objectContaining({ category: 'Funções' }),
        ])
      } else {
        expect(offered, definition.type).toEqual([definition.type])
      }
    }
  })

  it('mantém Object.assign na família Objetos, igual à paleta', () => {
    expect(BLOCK_CATALOG.filter((entry) => entry.type === 'sz_js_object_assign')).toEqual([
      expect.objectContaining({ category: 'Objetos' }),
    ])
  })

  it('instancia, serializa e reabre todo bloco visível e legado sem perda', () => {
    ensureBlocklyInitialized()
    const definitions = [
      ...PROGRAMMING_VISIBLE_DEFINITIONS,
      ...PROGRAMMING_COMPATIBILITY_DEFINITIONS,
    ]

    for (const definition of definitions) {
      const source = new Blockly.Workspace()
      const restored = new Blockly.Workspace()
      try {
        source.newBlock(definition.type)
        const state = Blockly.serialization.workspaces.save(source)
        expect(
          () => Blockly.serialization.workspaces.load(state, restored),
          definition.type,
        ).not.toThrow()
        expect(restored.getBlocksByType(definition.type, false).length, definition.type).toBe(1)
      } finally {
        source.dispose()
        restored.dispose()
      }
    }
  })
})
