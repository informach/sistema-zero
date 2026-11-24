import { expect, it } from 'bun:test'
import { assetBytes } from '../core/assetMemory'
import { isTileLayer, sanitizePintaAsset } from '../core/project'
import { galleryToPintaJson, importPintaJson } from '../export/projectJson'
import { paintTerrain } from '../tiles/terrain'
import { findTemplate } from './catalog'

function build() {
  const template = findTemplate('bosque-terrenos')
  if (!template) throw new Error('Modelo de terrenos pronto esperado')
  return template.build()
}

it('bosque pronto conserva três folhas, terrenos e camadas no backup, dentro do orçamento', () => {
  const { assets, primaryIndex } = build()
  const map = assets[primaryIndex]
  if (map?.kind !== 'tilemap') throw new Error('Mapa esperado')
  expect(assets).toHaveLength(4)
  expect(map.layers).toHaveLength(3)
  expect(assets.reduce((bytes, asset) => bytes + assetBytes(asset), 0)).toBeLessThan(
    2 * 1024 * 1024,
  )
  for (const asset of assets) expect(sanitizePintaAsset(asset)).toEqual(asset)
  const text = galleryToPintaJson(assets)
  expect(JSON.parse(text).version).toBe(4)
  const reopened = importPintaJson(text)
  expect(reopened.warnings).toEqual([])
  expect(reopened.assets).toHaveLength(4)
  expect(reopened.assets.find((a) => a.id === map.id)).toEqual(map)
})

it('cada camada já pinta transições dos dois materiais e cada modelo é uma cópia independente', () => {
  const first = build(),
    second = build()
  expect(first.assets.some((asset) => second.assets.some((other) => other.id === asset.id))).toBe(
    false,
  )
  const map = first.assets[first.primaryIndex]
  if (map?.kind !== 'tilemap') throw new Error('Mapa esperado')
  for (const layer of map.layers.filter(isTileLayer)) {
    const sheet = first.assets.find((asset) => asset.id === (layer.tilesetId ?? map.tilesetId))
    if (sheet?.kind !== 'tileset') throw new Error('Peças da camada esperadas')
    expect(sheet.tiles).toHaveLength(85)
    expect(sheet.terrains).toHaveLength(1)
    const terrain = sheet.terrains![0]!
    expect(terrain.colors).toHaveLength(2)
    const uniquePatterns = new Set(
      Object.values(terrain.tiles).map((p) => [p[1], p[3], p[5], p[7]].join()),
    )
    expect(uniquePatterns.size).toBe(81)
    for (const material of [1, 2]) {
      const centers = Object.entries(terrain.tiles).filter(([, p]) =>
        [p[1], p[3], p[5], p[7]].every((value) => value === material),
      )
      expect(centers).toHaveLength(3)
      expect(new Set(centers.map(([tile]) => sheet.tiles[Number(tile)]!.data.join(','))).size).toBe(
        3,
      )
    }
    const one = paintTerrain(map, layer.id, terrain, 1, [{ col: 0, row: 0 }], 37)
    expect(one.unmatched).toBe(0)
    const two = paintTerrain(one.map, layer.id, terrain, 2, [{ col: 1, row: 1 }], 38)
    expect(two.unmatched).toBe(0)
    expect(two.map).not.toBe(map)
    expect(paintTerrain(two.map, layer.id, terrain, 0, [{ col: 0, row: 0 }]).unmatched).toBe(0)
  }
})
