import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import type { ExtensionExample } from '../extensions/types'
import { gameTwoDExamples } from '../official-extensions/game-2d/exampleCatalog'
import { gameKitExamples } from '../official-extensions/game-2d-advanced/exampleCatalog'
import { gameThreeDExamples } from '../official-extensions/game-3d/exampleCatalog'
import { gameKit3DExamples } from '../official-extensions/game-3d-advanced/exampleCatalog'
import { isManualGameVisualBlock } from '../official-extensions/gameVisualPolicy'
import { world3DExamples } from '../official-extensions/world-3d/examples'
import { CORE_EXAMPLES } from './core'

/** The extension owns the visuals; Programação still expresses the game's rules. */
const CATALOGS: ReadonlyArray<readonly [string, readonly ExtensionExample[]]> = [
  ['game-2d', gameTwoDExamples],
  ['game-2d-advanced', gameKitExamples],
  ['game-3d', gameThreeDExamples],
  ['game-3d-advanced', gameKit3DExamples],
  ['world-3d', world3DExamples],
]

function manualVisualBlocks(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(manualVisualBlocks)
  if (!value || typeof value !== 'object') return []
  const found: string[] = []
  for (const [key, child] of Object.entries(value)) {
    if (key === 'type' && typeof child === 'string' && isManualGameVisualBlock(child)) {
      found.push(child)
    }
    found.push(...manualVisualBlocks(child))
  }
  return [...new Set(found)].sort()
}

function manualCanvasOperations(value: unknown, contexts = new Set(['ctx'])): string[] {
  if (Array.isArray(value)) return value.flatMap((child) => manualCanvasOperations(child, contexts))
  if (!value || typeof value !== 'object') return []
  const record: Record<string, unknown> = Object.fromEntries(Object.entries(value))
  if (typeof record.ctxName === 'string') contexts.add(record.ctxName)
  const object = record.object
  const isContext =
    object &&
    typeof object === 'object' &&
    'type' in object &&
    object.type === 'var' &&
    'name' in object &&
    typeof object.name === 'string' &&
    contexts.has(object.name)
  if (isContext && ['memberCall', 'memberSet', 'memberGet'].includes(String(record.type)))
    return [`${String(record.type)}: ${String(record.method ?? record.name)}`]
  return Object.values(record).flatMap((child) => manualCanvasOperations(child, contexts))
}

describe('jogos JavaScript com extensão usam os recursos visuais da extensão', () => {
  for (const [id, examples] of CATALOGS) {
    it(`${id}: catálogo tem jogos e demonstrações`, () => {
      expect(examples.length).toBeGreaterThan(10)
    })
    for (const example of examples) {
      it(`${id}: ${example.name}`, () => {
        expect(example.ir.html).toEqual([])
        expect(example.ir.css).toEqual([])
        expect(example.ir.htmlShell).toBeUndefined()
        expect(manualVisualBlocks(buildWorkspaceStateFromIR(example.ir))).toEqual([])
        expect(manualCanvasOperations(example.ir)).toEqual([])
      })
    }
  }

  it('as receitas sem extensão não dependem de um motor facilitador', () => {
    expect(CORE_EXAMPLES.length).toBeGreaterThan(20)
    for (const example of CORE_EXAMPLES) {
      expect(example.ir.extensions ?? [], example.name).toEqual([])
    }
  })

  it('a conferência alcança blocos visuais dentro de eventos e condições', () => {
    expect(
      manualVisualBlocks({
        blocks: [
          {
            type: 'sz_gk_on_draw',
            inputs: {
              BODY: {
                block: {
                  type: 'sz_if',
                  inputs: { THEN: { block: { type: 'sz_canvas_fill_text' } } },
                },
              },
            },
          },
        ],
      }),
    ).toEqual(['sz_canvas_fill_text'])
    expect(manualVisualBlocks({ type: 'sz_gk_draw_character' })).toEqual([])
    expect(
      manualCanvasOperations({
        type: 'gk:onDraw',
        ctxName: 'pincel',
        body: [
          {
            type: 'memberCall',
            object: { type: 'var', name: 'pincel' },
            method: 'arc',
            args: [],
          },
        ],
      }),
    ).toEqual(['memberCall: arc'])
  })
})
