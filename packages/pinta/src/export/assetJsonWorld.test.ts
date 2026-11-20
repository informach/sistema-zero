import { expect, it } from 'bun:test'
import { vilaEFloresta } from '../../scripts/homologacao/fixture'
import { createTilemapAsset, createTilesetAsset } from '../core/project'
import { createMapObject } from '../tiles/mapObjects'
import { assetBundleToJson, isTilemapBundle } from './assetJson'
import { galleryToPintaJson, importPintaJson } from './projectJson'

it('o arquivo editável conserva os seis recursos da Vila e as portas de ida e volta', () => {
  const { map, cabana, assets } = vilaEFloresta()
  map.physics = 'precise'
  cabana.physics = 'precise'
  const text = assetBundleToJson(map, assets)
  expect(text).not.toBeNull()
  const restored = importPintaJson(text!)
  const expected = importPintaJson(galleryToPintaJson(assets))
  expect(restored.warnings).toEqual([])
  expect(restored.assets.map((a) => a.id)).toHaveLength(6)
  expect(new Map(restored.assets.map((a) => [a.id, a]))).toEqual(
    new Map(expected.assets.map((a) => [a.id, a])),
  )
})

it('o restauro atômico reconhece o mundo conectado e distingue uma galeria independente', () => {
  const { assets } = vilaEFloresta()
  expect(isTilemapBundle(assets)).toBe(true)
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const first = createTilemapAsset({ name: 'primeiro', tilesetId: tileset.id, cols: 2, rows: 2 })
  const second = createTilemapAsset({ name: 'segundo', tilesetId: tileset.id, cols: 2, rows: 2 })
  expect(isTilemapBundle([first, second, tileset])).toBe(false)
})

it('não produz um arquivo editável que omite o destino configurado de uma porta', () => {
  const { map, cabana, assets } = vilaEFloresta()
  expect(
    assetBundleToJson(
      map,
      assets.filter((asset) => asset.id !== cabana.id),
    ) === null,
  ).toBe(true)
  const byName = assets.map((asset) =>
    asset.id === cabana.id ? { ...cabana, id: 'cabana-a' } : asset,
  )
  expect(assetBundleToJson(map, [...byName, { ...cabana, id: 'cabana-b' }]) === null).toBe(true)
})

it('leva destinos de portas ocultas dentro de conjuntos sem exigir uma porta pronta na raiz', () => {
  const { map, cabana, assets } = vilaEFloresta()
  const objects = map.layers.find((layer) => layer.kind === 'objects')
  const set = assets.find((asset) => asset.kind === 'map-set')
  if (objects?.kind !== 'objects' || set?.kind !== 'map-set') throw new Error('Fixture inválida')
  objects.objects.find((object) => object.role === 'door')!.properties.destino = ''
  set.map.layers.push({
    id: 'hidden-doors',
    kind: 'objects',
    name: 'Portas do conjunto',
    visible: false,
    objects: [
      createMapObject({
        name: 'Porta no conjunto',
        role: 'door',
        properties: { destino: cabana.name },
      }),
    ],
  })
  const text = assetBundleToJson(map, assets)
  expect(text === null).toBe(false)
  const restored = importPintaJson(text!)
  expect(restored.assets.map((asset) => asset.id).sort()).toEqual(
    assets.map((asset) => asset.id).sort(),
  )
  expect(restored.warnings).toEqual([])
})

it('uma porta ainda sem destino não impede guardar o desenho editável', () => {
  const { map, cabana, assets } = vilaEFloresta()
  const objects = map.layers.find((layer) => layer.kind === 'objects')
  if (objects?.kind !== 'objects') throw new Error('Fixture inválida')
  objects.objects.find((object) => object.role === 'door')!.properties.destino = ''
  const text = assetBundleToJson(
    map,
    assets.filter((asset) => asset.id !== cabana.id),
  )
  expect(text === null).toBe(false)
  expect(importPintaJson(text!).warnings).toEqual([])
})

it('o arquivo nativo mantém seu orçamento próprio acima dos 16 mapas do jogo', () => {
  const tileset = createTilesetAsset({ name: 'pecas', tileSize: 16 })
  const maps = Array.from({ length: 17 }, (_, i) =>
    createTilemapAsset({
      name: `lugar-${i}`,
      tilesetId: tileset.id,
      cols: 2,
      rows: 2,
    }),
  )
  for (let i = 0; i < maps.length - 1; i++)
    maps[i]!.layers[0]!.properties = { proximo: { type: 'asset', value: maps[i + 1]!.id } }
  const text = assetBundleToJson(maps[0]!, [tileset, ...maps])
  expect(text).not.toBeNull()
  expect(importPintaJson(text!).assets).toHaveLength(18)
  expect(isTilemapBundle([tileset, ...maps])).toBe(true)
})
