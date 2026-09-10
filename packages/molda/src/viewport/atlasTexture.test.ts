import { describe, expect, test } from 'bun:test'
import { AtlasTexture } from './atlasTexture'

describe('AtlasTexture', () => {
  test('marca cada faixa suja em componentes RGBA, sem subir o resto da linha', () => {
    const atlas = new AtlasTexture(new Uint8Array(64 * 64 * 4), 64)
    atlas.texture.onUpdate?.(atlas.texture)

    atlas.markRows({ x0: 7, x1: 12, y0: 10, y1: 11 })

    expect(atlas.texture.updateRanges).toEqual([
      { start: (10 * 64 + 7) * 4, count: 6 * 4 },
      { start: (11 * 64 + 7) * 4, count: 6 * 4 },
    ])
  })

  test('a full upload remains pending when a new stroke arrives before rendering', () => {
    const atlas = new AtlasTexture(new Uint8Array(16 * 16 * 4), 16)
    atlas.texture.onUpdate?.(atlas.texture)
    atlas.markAll()
    atlas.markRows({ x0: 1, x1: 2, y0: 3, y1: 3 })
    expect(atlas.texture.updateRanges).toEqual([])
    atlas.dispose()
  })

  test('pending uploads merge by row and never grow with the number of strokes', () => {
    const atlas = new AtlasTexture(new Uint8Array(16 * 16 * 4), 16)
    atlas.texture.onUpdate?.(atlas.texture)
    for (let stroke = 0; stroke < 200; stroke++) {
      atlas.markRows({ x0: 1 + (stroke % 2), x1: 3 + (stroke % 2), y0: 3, y1: 4 })
      expect(atlas.texture.updateRanges.length).toBeLessThanOrEqual(2)
    }
    expect(atlas.texture.updateRanges).toEqual([
      { start: (3 * 16 + 1) * 4, count: 4 * 4 },
      { start: (4 * 16 + 1) * 4, count: 4 * 4 },
    ])
    atlas.dispose()
  })

  test('markAll descarta as faixas porque o próximo upload é completo', () => {
    const atlas = new AtlasTexture(new Uint8Array(16 * 16 * 4), 16)
    atlas.markRows({ x0: 1, x1: 2, y0: 3, y1: 3 })

    atlas.markAll()

    expect(atlas.texture.updateRanges).toEqual([])
  })

  test('initial upload is full; GPU acknowledgement resets row ownership; disposal ignores late writes', () => {
    const atlas = new AtlasTexture(new Uint8Array(16 * 16 * 4), 16)
    atlas.markRows({ x0: 1, x1: 2, y0: 3, y1: 3 })
    expect(atlas.texture.updateRanges).toEqual([])
    atlas.texture.onUpdate?.(atlas.texture)
    atlas.markRows({ x0: 1, x1: 2, y0: 3, y1: 3 })
    atlas.texture.onUpdate?.(atlas.texture)
    atlas.markRows({ x0: 7, x1: 8, y0: 3, y1: 3 })
    expect(atlas.texture.updateRanges).toEqual([{ start: (3 * 16 + 7) * 4, count: 8 }])
    let disposals = 0
    atlas.texture.addEventListener('dispose', () => disposals++)
    atlas.dispose()
    atlas.dispose()
    const version = atlas.texture.version
    atlas.markAll()
    atlas.markRows({ x0: 2, x1: 3, y0: 4, y1: 4 })
    expect(atlas.texture.version).toBe(version)
    expect(disposals).toBe(1)
  })
})
