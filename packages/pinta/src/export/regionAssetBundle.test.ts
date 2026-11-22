import { expect, test } from 'bun:test'
import { isTileLayer } from '../core/project'
import { sceneMapClosure } from '../core/sceneMapClosure'
import { regionVila } from '../testing/regionVila'
import { cellAt } from '../tiles/tilemapOps'
import { regionAssetBundleToJson } from './regionAssetBundle'
import { decodeRegionGalleryBackup } from './regionBackup'

test('native-8 portable transport conserves the real connected acceptance world and its regional sets', () => {
  const { map, cabana, assets } = regionVila(),
    text = regionAssetBundleToJson(map, assets)
  if (!text) throw Error('Pacote ausente')
  const restored = decodeRegionGalleryBackup(text)
  expect(restored.warnings).toEqual([])
  expect(restored.assets.map((asset) => asset.id).sort()).toEqual(
    assets.map((asset) => asset.id).sort(),
  )
  const root = restored.assets.find((asset) => asset.id === map.id)
  if (root?.kind !== 'tilemap' || !('origin' in root)) throw Error('Raiz ausente')
  expect(root.layers).toHaveLength(map.layers.length)
  expect(
    root.layers.filter((layer) => layer.kind === undefined || layer.kind === 'tiles'),
  ).toHaveLength(16)
  expect(root.layers.filter((layer) => layer.kind === 'objects')).toEqual(
    map.layers.filter((layer) => layer.kind === 'objects'),
  )
  const floor = root.layers.find(isTileLayer)
  if (!floor) throw Error('Chão ausente')
  expect(cellAt(root, floor.id, -64, -64)).toBe(3)
  expect(sceneMapClosure(root, restored.assets).maps.map((asset) => asset.id)).toEqual([
    map.id,
    cabana.id,
  ])
  const set = restored.assets.find((asset) => asset.kind === 'map-set')
  expect(set?.kind === 'map-set' && 'origin' in set.map).toBe(true)
  expect(JSON.parse(text).version).toBe(8)
})

test('the same portable graph refuses missing or ambiguous door destinations instead of omitting them', () => {
  const { map, cabana, assets } = regionVila()
  expect(
    regionAssetBundleToJson(
      map,
      assets.filter((asset) => asset.id !== cabana.id),
    ) === null,
  ).toBe(true)
  const named = assets.map((asset) =>
    asset.id === cabana.id ? { ...cabana, id: 'cabana-a' } : asset,
  )
  expect(regionAssetBundleToJson(map, [...named, { ...cabana, id: 'cabana-b' }]) === null).toBe(
    true,
  )
  const hero = assets.find(
    (asset) => asset.kind === 'pixel-sprite' || asset.kind === 'vector-sprite',
  )
  if (!hero) throw Error('Personagem ausente')
  expect(
    regionAssetBundleToJson(
      map,
      assets.filter((asset) => asset.id !== hero.id),
    ) === null,
  ).toBe(true)
})
