import { expect, it } from 'bun:test'
import { withinLessonMapLimits } from './lessonLimits'
import { createTilemapAsset, createTilesetAsset } from './project'

it('a versão guardada das peças não contorna o orçamento de 64 peças da aula', () => {
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  tileset.tiles = Array.from({ length: 65 }, () => tileset.tiles[0]!)
  const map = {
    ...createTilemapAsset({ name: 'aula', tilesetId: tileset.id, cols: 2, rows: 2 }),
    resources: [{ sourceId: 'original', capturedAt: 100, asset: tileset }],
  }
  expect(withinLessonMapLimits(map)).toBe(false)
  tileset.tiles = tileset.tiles.slice(0, 64)
  expect(withinLessonMapLimits(map)).toBe(true)
})
