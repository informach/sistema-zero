import { describe, expect, it } from 'bun:test'
import { buildWorkspaceStateFromIR } from '../blockly/workspaceState'
import { gameTwoDBlocks } from '../official-extensions/game-2d/blocks'
import { gameTwoDExamples } from '../official-extensions/game-2d/exampleCatalog'
import { gameKitBlocks } from '../official-extensions/game-2d-advanced/blocks'
import { gameKitExamples } from '../official-extensions/game-2d-advanced/exampleCatalog'

function collectTypes(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const child of value) collectTypes(child, into)
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === 'type' && typeof child === 'string') into.add(child)
      collectTypes(child, into)
    }
  }
}

describe('cada ferramenta 2D tem exemplo ou receita executável no catálogo', () => {
  for (const [name, blocks, examples] of [
    ['Jogo 2D', gameTwoDBlocks, gameTwoDExamples],
    ['Jogo 2D Avançado', gameKitBlocks, gameKitExamples],
  ] as const) {
    it(name, () => {
      expect(examples.length).toBeGreaterThan(35)
      const used = new Set<string>()
      for (const example of examples) collectTypes(buildWorkspaceStateFromIR(example.ir), used)
      const visible = blocks.filter((block) => !block.hidden)
      expect(visible.length).toBeGreaterThan(300)
      expect(visible.filter((block) => !used.has(block.type)).map((block) => block.type)).toEqual(
        [],
      )
    })
  }
})
