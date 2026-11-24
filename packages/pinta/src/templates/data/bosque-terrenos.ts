import { newId } from '../../core/id'
import { getPalette } from '../../core/palette'
import {
  createBitmap,
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  type TilesetAsset,
  type TileTerrain,
  withPintaSchemaStamp,
} from '../../core/project'
import { rectCells } from '../../tiles/cellGeometry'
import { paintTerrain } from '../../tiles/terrain'
import { addLayer } from '../../tiles/tilemapOps'
import type { PintaTemplate } from '../catalog'

/** Arte autoral na paleta Arcade: todos os encaixes de dois materiais e vazio. */
function pieces(name: string, title: string, colors: [number, number]): TilesetAsset {
  const base = createTilesetAsset({ name, tileSize: 16 })
  const palette = getPalette('arcade').colors
  const terrain: TileTerrain = {
    id: newId(),
    name: title,
    mode: 'corner',
    colors: colors.map((index) => palette[index]!),
    tiles: {},
  }
  const patterns = Array.from({ length: 81 }, (_, index) => {
    const pattern = Array<number>(8).fill(0)
    for (const [corner, slot] of [7, 1, 5, 3].entries())
      pattern[slot] = Math.floor(index / 3 ** corner) % 3
    return pattern
  })
  patterns.push([...patterns[40]!], [...patterns[40]!], [...patterns[80]!], [...patterns[80]!])
  const tiles = patterns.map((pattern, index) => {
    terrain.tiles[String(index)] = pattern
    const bitmap = createBitmap(16, 16)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const u = x / 15,
          v = y / 15
        const weights = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v]
        const materials = [0, 0, 0]
        for (const [corner, slot] of [7, 1, 5, 3].entries())
          materials[pattern[slot]!]! += weights[corner]!
        const material = materials[1]! >= materials[2]! ? 1 : 2
        if (materials[material]! < 0.45 || materials[0]! > materials[material]!) continue
        const color = colors[material - 1]!
        const speck =
          index >= 81 &&
          x > 1 &&
          x < 14 &&
          y > 1 &&
          y < 14 &&
          (x * 17 + y * 37 + index * 13) % 29 === 0
        const accent =
          color === 8 ? 9 : color === 7 ? 6 : color === 13 ? 14 : color === 11 ? 12 : 13
        bitmap.data[y * 16 + x] = speck ? accent : color
      }
    return bitmap
  })
  return withPintaSchemaStamp({
    ...base,
    tiles,
    solid: tiles.map(() => false),
    platform: tiles.map(() => false),
    terrains: [terrain],
  })
}

export const bosqueTerrenosTemplate: PintaTemplate = {
  id: 'bosque-terrenos',
  style: 'pixel',
  role: 'tilemap',
  suggestedName: 'meu-bosque',
  build() {
    const land = pieces('chao-do-bosque', 'Grama e terra', [7, 14])
    const water = pieces('agua-do-bosque', 'Água e areia', [8, 13])
    const rocks = pieces('pedras-do-bosque', 'Pedra e terra', [11, 14])
    let map = createTilemapAsset({ name: 'meu-bosque', tilesetId: land.id, cols: 18, rows: 12 })
    map = {
      ...map,
      layers: map.layers.map((layer) =>
        isTileLayer(layer)
          ? { ...layer, name: 'Chão', cells: new Int16Array(map.cols * map.rows).fill(80) }
          : layer,
      ),
    }
    map = addLayer(map, 'Água', water.id)
    map = addLayer(map, 'Pedras', rocks.id)
    for (const [layer, sheet, region] of [
      [map.layers[0]!, land, { col: 2, row: 2, cols: 8, rows: 7 }],
      [map.layers[1]!, water, { col: 12, row: 3, cols: 3, rows: 3 }],
      [map.layers[2]!, rocks, { col: 11, row: 9, cols: 2, rows: 1 }],
    ] as const) {
      const result = paintTerrain(map, layer.id, sheet.terrains![0]!, 1, rectCells(region), 17)
      if (result.unmatched) throw new Error('As peças do bosque precisam cobrir todos os encaixes')
      map = result.map
    }
    return { assets: [land, water, rocks, withPintaSchemaStamp(map)], primaryIndex: 3 }
  },
}
