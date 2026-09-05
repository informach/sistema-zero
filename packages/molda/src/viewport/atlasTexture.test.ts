import { describe, expect, test } from 'bun:test'
import { AtlasTexture } from './atlasTexture'

describe('AtlasTexture', () => {
  test('marca cada faixa suja em componentes RGBA, sem subir o resto da linha', () => {
    const atlas = new AtlasTexture(new Uint8Array(64 * 64 * 4), 64)

    atlas.markRows({ x0: 7, x1: 12, y0: 10, y1: 11 })

    expect(atlas.texture.updateRanges).toEqual([
      { start: (10 * 64 + 7) * 4, count: 6 * 4 },
      { start: (11 * 64 + 7) * 4, count: 6 * 4 },
    ])
  })

  test('markAll descarta as faixas porque o próximo upload é completo', () => {
    const atlas = new AtlasTexture(new Uint8Array(16 * 16 * 4), 16)
    atlas.markRows({ x0: 1, x1: 2, y0: 3, y1: 3 })

    atlas.markAll()

    expect(atlas.texture.updateRanges).toEqual([])
  })
})
