import { expect, it } from 'bun:test'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { createTilemapAsset, createTilesetAsset, type PintaAsset } from './project'
import { sceneMapClosure } from './sceneMapClosure'

it('keeps the world behind named doors, cycles and the resources of both maps', () => {
  const { map, cabana, assets } = vilaEFloresta()
  const result = sceneMapClosure(map, assets)
  expect(result.maps.map((m) => m.id)).toEqual([map.id, cabana.id])
  expect(new Set(result.assets.map((a) => a.id))).toEqual(new Set(assets.map((a) => a.id)))
})

it('rejects a configured missing destination and ambiguous names instead of omitting the link', () => {
  const { map, cabana, assets } = vilaEFloresta()
  expect(() =>
    sceneMapClosure(
      map,
      assets.filter((a) => a.id !== cabana.id),
    ),
  ).toThrow('porta')
  const named = { ...cabana, id: 'named-cabana' }
  const pool = assets.map((a) => (a.id === cabana.id ? named : a))
  expect(() => sceneMapClosure(map, [...pool, { ...cabana, id: 'duplicate' }])).toThrow(
    'mesmo nome',
  )
  const layer = map.layers.find((l) => l.kind === 'objects')!
  if (layer.kind !== 'objects') throw new Error('Objects required')
  const door = layer.objects.find((o) => o.role === 'door')!
  door.properties.destino = { type: 'asset', value: named.id }
  expect(sceneMapClosure(map, [...pool, { ...cabana, id: 'duplicate' }]).maps).toHaveLength(2)
})

it('follows typed references through tile properties and refuses a world beyond its budget', () => {
  const tileset = createTilesetAsset({ name: 'ground', tileSize: 16 })
  const maps = Array.from({ length: 17 }, (_, index) => ({
    ...createTilemapAsset({ name: `map-${index}`, tilesetId: tileset.id, cols: 2, rows: 2 }),
    id: `map-${index}`,
  }))
  for (let i = 0; i < maps.length - 1; i++)
    maps[i]!.layers[0]!.properties = { next: { type: 'asset', value: maps[i + 1]!.id } }
  const assets: PintaAsset[] = [tileset, ...maps]
  expect(() => sceneMapClosure(maps[0]!, assets)).toThrow('16 mapas')
  delete maps[15]!.layers[0]!.properties
  expect(sceneMapClosure(maps[0]!, assets).maps).toHaveLength(16)
  tileset.tileProperties = { 0: { prize: { type: 'asset', value: 'missing' } } }
  expect(() => sceneMapClosure(maps[0]!, assets)).toThrow('desenho')
})
