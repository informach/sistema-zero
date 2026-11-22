import { expect, test } from 'bun:test'
import { nativeImageOf } from '../../scripts/homologacao/generate'
import { regionVila } from '../testing/regionVila'
import { exportPintaProjectedScene } from './projectedScene'

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
