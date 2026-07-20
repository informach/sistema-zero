import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import type { LearningProfile } from '#core'
import { BLOCK_CATALOG } from '../blockCatalog'
import { classCategoryBlockTypes, functionCategoryBlockTypes } from '../paramsFlyout'
import {
  PROGRAMMING_CATALOG_GROUPS,
  PROGRAMMING_COMPATIBILITY_DEFINITIONS,
  PROGRAMMING_VISIBLE_DEFINITIONS,
  PROGRAMMING_VISIBLE_TYPES,
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
