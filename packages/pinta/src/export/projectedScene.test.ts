import { expect, test } from 'bun:test'
import {
  PINTA_REGION_CELL_COUNT,
  PINTA_REGION_CHUNK_BYTES,
  PINTA_REGION_LIMITS,
} from '@sistemazero/core/creations'
import { PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES } from '@sistemazero/core/studio/pinta-projected-scene'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { isTileLayer, type RegionTilemapAsset } from '../core/project'
import { regionVila } from '../testing/regionVila'
import { exportPintaProjectedScene } from './projectedScene'

/** Adds occupied chunks far from the Vila until the map holds `total` chunks in all layers. */
function growTo<Map extends RegionTilemapAsset>(map: Map, total: number): Map {
  const layers = map.layers.filter(isTileLayer)
  const existing = layers.reduce((sum, layer) => sum + layer.cells.chunks.length, 0)
  const first = layers[0]
  if (!first || total < existing) throw Error('Mapa de teste inesperado')
  const extra = Array.from({ length: total - existing }, (_, i) => ({
    col: i % 64,
    row: 200 + Math.floor(i / 64),
    cells: new Int16Array(PINTA_REGION_CELL_COUNT).fill(-1).fill(0, 0, 1),
  }))
  return {
    ...map,
    layers: map.layers.map((layer) =>
      layer === first
        ? {
            ...first,
            cells: {
              ...first.cells,
              chunks: [...first.cells.chunks, ...extra].sort(
                (a, b) => a.row - b.row || a.col - b.col,
              ),
            },
          }
        : layer,
    ),
  }
}

test('the projected Scene 5 writer captures the real Vila atlas, locations, art and an older regional set', async () => {
  const { map, assets } = regionVila()
  const root = {
    ...map,
    schema: 9 as const,
    projection: { kind: 'isometric' as const, tileWidth: 32, tileHeight: 16 },
    growth: 'expandable' as const,
    physics: 'precise' as const,
  }
  const { json, bytes, scene, wire } = await exportPintaProjectedScene(
    root,
    (id) => assets.find((asset) => asset.id === id) ?? null,
    nativeImageOf,
  )
  expect(bytes).toBe(Buffer.byteLength(json))
  expect(scene.id).toBe(root.id)
  expect(scene.origin).toEqual(root.origin)
  expect(scene.projection).toEqual(root.projection)
  expect(scene.layers).toHaveLength(18)
  expect(scene.tilesets.map((entry) => entry.id)).toEqual(['vila-pecas', 'agua-pecas'])
  expect(scene.tilesets[0]?.image).toStartWith('data:image/png')
  expect(scene.art?.[0]?.sprite?.animations[0]?.id).toBe('morador-parado')
  expect(scene.sets?.[0]?.id).toBe('pedaco-da-vila')
  expect(scene.sets?.[0]?.projection).toEqual({ kind: 'orthogonal', tileWidth: 16, tileHeight: 16 })
  expect(wire.layers.some((layer) => layer.kind === 'tiles' && layer.cells.chunks[0]?.data)).toBe(
    true,
  )
  expect(JSON.parse(json)).toEqual(wire)
})

test('scene 5 admits a root at its own 4 MiB with its sets, and reports the limit past the scene budget', async () => {
  const { map, assets } = regionVila()
  const projected = (grown: RegionTilemapAsset) => ({
    ...grown,
    schema: 9 as const,
    projection: { kind: 'isometric' as const, tileWidth: 32, tileHeight: 16 },
    growth: 'expandable' as const,
    physics: 'precise' as const,
  })
  const find = (inventory: typeof assets) => (id: string) =>
    inventory.find((asset) => asset.id === id) ?? null
  const full = projected(growTo(map, PINTA_REGION_LIMITS.maxChunks))
  const admitted = await exportPintaProjectedScene(full, find(assets), nativeImageOf)
  expect(admitted.scene.id).toBe(map.id)
  expect(admitted.scene.sets?.length).toBeGreaterThan(0)
  const set = assets.find((asset) => asset.kind === 'map-set' && 'origin' in asset.map)
  if (set?.kind !== 'map-set' || !('origin' in set.map)) throw Error('Conjunto regional ausente')
  const setChunks =
    Math.floor(PINTA_PROJECTED_SCENE_MAX_INDEX_BYTES / PINTA_REGION_CHUNK_BYTES) -
    PINTA_REGION_LIMITS.maxChunks +
    1
  const heavy = assets.map((asset) =>
    asset === set ? { ...set, map: growTo(set.map, setChunks) } : asset,
  )
  await expect(exportPintaProjectedScene(full, find(heavy), nativeImageOf)).rejects.toThrow(
    'passou do limite',
  )
})
