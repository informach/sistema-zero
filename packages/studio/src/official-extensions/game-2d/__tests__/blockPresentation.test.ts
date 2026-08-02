import { describe, expect, it } from 'bun:test'
import { gameTwoDBlocks as canonicalBlocks } from '../blockCatalog'
import { gameTwoDBlocks as presentedBlocks } from '../blocks'

describe('gameTwoDBlocks — composição visual imutável', () => {
  it('aplica as cores da toolbox sem mutar o catálogo canônico', () => {
    expect(presentedBlocks).not.toBe(canonicalBlocks)
    expect(presentedBlocks).toHaveLength(canonicalBlocks.length)

    const canonicalByType = new Map(canonicalBlocks.map((block) => [block.type, block]))
    const recoloured = presentedBlocks.filter(
      (block) => canonicalByType.get(block.type)?.colour !== block.colour,
    )

    expect(recoloured.length).toBeGreaterThan(0)
    for (const block of recoloured) {
      expect(block).not.toBe(canonicalByType.get(block.type))
    }
  })
})
