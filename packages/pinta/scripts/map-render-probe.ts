import { createTilemapAsset, createTilesetAsset, type TilemapAsset } from '../src/core/project'
import { CELL_FLIP_D, CELL_FLIP_H, CELL_FLIP_V, makeCell } from '../src/tiles/cell'
import { paintTilemapLayers, TileChunkCache } from '../src/tiles/chunks'

/** Full-image comparisons use this fixture with both the published and current renderer. */
export async function runMapRenderProbe() {
  const sets = [0, 1].map((index) => {
    const set = createTilesetAsset({ name: `Folha ${index}`, tileSize: 16 })
    set.tiles = Array.from({ length: 8 }, () => set.tiles[0]!)
    set.animations = {
      '1': [
        { tile: 2, duration: 80 },
        { tile: 3, duration: 120 },
      ],
    }
    const sheet = document.createElement('canvas')
    sheet.width = 128
    sheet.height = 16
    const ctx = sheet.getContext('2d')!
    for (let tile = 0; tile < 8; tile++)
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          ctx.fillStyle = `rgba(${(tile * 31 + index * 83) % 256},${x * 16},${y * 16},${((x + y + tile) % 5) / 4})`
          ctx.fillRect(tile * 16 + x, y, 1, 1)
        }
    return { set, sheet }
  })
  const flags = [
    0,
    CELL_FLIP_H,
    CELL_FLIP_V,
    CELL_FLIP_H | CELL_FLIP_V,
    CELL_FLIP_D,
    CELL_FLIP_D | CELL_FLIP_H,
    CELL_FLIP_D | CELL_FLIP_V,
    CELL_FLIP_D | CELL_FLIP_H | CELL_FLIP_V,
  ]
  const base = createTilemapAsset({
    name: 'Prova de pixels',
    tilesetId: sets[0]!.set.id,
    cols: 64,
    rows: 64,
  })
  const cases = []
  let preview = ''
  for (const transformed of [false, true])
    for (const scale of [0.25, 0.5, 1, 2])
      for (const time of [0, 100, 250]) {
        const map: TilemapAsset = {
          ...base,
          layers: [
            { id: 'grupo', kind: 'group', name: 'Floresta', visible: true, opacity: 0.75 },
            ...Array.from({ length: 12 }, (_, layer) => ({
              id: `layer-${layer}`,
              name: `Camada ${layer}`,
              visible: true,
              tilesetId: sets[layer % 2]!.set.id,
              ...(layer % 3 === 0 ? { parentId: 'grupo' } : {}),
              opacity: layer % 2 ? 0.45 : 1,
              offsetX: layer * 4,
              offsetY: -layer * 4,
              cells: Int16Array.from({ length: 4096 }, (_, i) =>
                i % 11 === 0
                  ? -1
                  : makeCell((i + layer) % 8, transformed ? flags[(i + layer) % 8] : 0),
              ),
            })),
          ],
        }
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 192
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = false
        ctx.fillStyle = '#183442'
        ctx.fillRect(0, 0, 256, 192)
        ctx.translate(-16, -12)
        const cache = new TileChunkCache(32 * 1024 * 1024)
        paintTilemapLayers(
          ctx,
          map,
          new Map(sets.map(({ set }) => [set.id, set])),
          (id) => sets.find(({ set }) => set.id === id)?.sheet ?? null,
          cache,
          { x: 16 / scale, y: 12 / scale, width: 256 / scale, height: 192 / scale },
          scale,
          time,
        )
        const pixels = ctx.getImageData(0, 0, 256, 192).data
        const digest = await crypto.subtle.digest('SHA-256', pixels)
        cases.push({
          transformed,
          scale,
          time,
          sha256: Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join(''),
          cacheBytes: cache.usedBytes,
          rebuilds: cache.rebuilds,
          pressureBytes: cache.workingSetBytes,
        })
        if (!transformed && scale === 0.5 && time === 100) preview = canvas.toDataURL('image/png')
        cache.clear()
        canvas.width = canvas.height = 1
      }
  return { cases, preview }
}
