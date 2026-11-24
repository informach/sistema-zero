import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  type TileTerrain,
} from '../../src/core/project'
import { galleryToPintaJson } from '../../src/export/projectJson'
import { addLayer } from '../../src/tiles/tilemapOps'

/** Duas folhas independentes, transições entre dois materiais e variações reais. */
export function terrainFixture() {
  const sheets = ['Campos', 'Lagos'].map((name, sheet) => {
    const asset = createTilesetAsset({ name, tileSize: 16 })
    const terrain: TileTerrain = {
      id: `encaixes-${sheet}`,
      name: sheet ? 'Areia e água' : 'Terra e grama',
      mode: 'corner',
      colors: sheet ? ['#c9b57a', '#3d7899'] : ['#a18752', '#77ae52'],
      tiles: {},
    }
    const patterns = Array.from({ length: 81 }, (_, value) => {
      const pattern = Array<number>(8).fill(0)
      for (const [corner, slot] of [7, 1, 5, 3].entries())
        pattern[slot] = Math.floor(value / 3 ** corner) % 3
      return pattern
    })
    patterns.push([...patterns[40]!], [...patterns[80]!])
    const colors = ['', '#eee0b0', ...terrain.colors, '#315b35']
    const tiles = patterns.map((pattern, index) => {
      terrain.tiles[String(index)] = pattern
      const bitmap = createBitmap(16, 16)
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const slot = y < 8 ? (x < 8 ? 7 : 1) : x < 8 ? 5 : 3
          bitmap.data[y * 16 + x] =
            index >= 81 && (x * 7 + y * 13) % 23 === 0 ? 4 : (pattern[slot] ?? 0) + 1
        }
      return bitmap
    })
    return {
      ...asset,
      tiles,
      solid: tiles.map(() => false),
      platform: tiles.map(() => false),
      paletteId: 'custom' as const,
      customPalette: { name, colors },
      terrains: [terrain],
    }
  })
  const [land, water] = sheets
  if (!land || !water) throw new Error('Duas folhas são obrigatórias')
  const base = createTilemapAsset({
    name: 'terrenos-em-duas-folhas',
    tilesetId: land.id,
    cols: 12,
    rows: 8,
  })
  const map = addLayer(base, 'Lago', water.id)
  return { sheets, map, assets: [...sheets, map] }
}

if (import.meta.main) {
  const directory = resolve(process.argv[2] ?? '.tmp/pinta-terrain-e2e')
  await mkdir(directory, { recursive: true })
  await writeFile(
    resolve(directory, 'terrenos.pinta.json'),
    galleryToPintaJson(terrainFixture().assets),
  )
}
