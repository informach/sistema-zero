import { expect, spyOn, test } from 'bun:test'
import { PINTA_REGION_CHUNK_BYTES } from '@sistemazero/core/creations'
import { createPixelSpriteAsset, isTileLayer, type PintaAsset } from '../core/project'
import { encodeRegionGalleryBackup } from '../export/regionBackup'
import { regionVila } from '../testing/regionVila'
import { setCell } from '../tiles/tilemapOps'
import { authorityKey } from './localAssetAuthority'
import { isLocalRegionAsset } from './localRegionAssetAuthority'
import { localRegionGalleryBackupBytes } from './localRegionBudget'
import { localRegionStorageCodec, prepareLocalRegionDocument } from './localRegionChunkStorage'

test('directory sizing matches the native encoder across a cell change and chunk creation and removal', () => {
  const { map, assets } = regionVila()
  const layer = map.layers.find(isTileLayer)
  if (!layer) throw Error('Camada ausente')
  const legacy = assets.filter((asset): asset is PintaAsset => !isLocalRegionAsset(asset))
  legacy.push(createPixelSpriteAsset({ name: 'janela-界-🎨', frameSize: 16 }))
  const regional = assets.filter(isLocalRegionAsset).filter(({ id }) => id !== map.id)
  const original = { ...map, name: 'vila-界-🎨' }
  const changed = setCell(original, layer.id, -64, -64, 4)
  const created = setCell(changed, layer.id, 5000, 5000, 1)
  const removed = setCell(created, layer.id, 5000, 5000, -1)
  const measured: number[] = []
  for (const asset of [original, changed, created, removed]) {
    const complete = [...regional, asset]
    const actual = encodeRegionGalleryBackup([...complete, ...legacy])
    if (!actual) throw Error('Arquivo de referência ausente')
    const directories = complete.map((asset) => {
      const key = authorityKey(asset.id)
      const encoded = localRegionStorageCodec.encode(
        key,
        { version: 1, capability: 8, revision: 'base', asset },
        new Map(),
      )
      const prepared = prepareLocalRegionDocument(key, encoded.document)
      if (!prepared) throw Error('Diretório ausente')
      return prepared
    })
    const encoder = spyOn(globalThis, 'btoa')
    try {
      const bytes = localRegionGalleryBackupBytes(directories, legacy)
      expect(bytes).toBe(actual.bytes)
      expect(
        encoder.mock.calls.some(([binary]) => binary.length === PINTA_REGION_CHUNK_BYTES),
      ).toBe(false)
      measured.push(bytes)
    } finally {
      encoder.mockRestore()
    }
  }
  expect(measured[1]).toBe(measured[0]!)
  expect(measured[2]).toBeGreaterThan(measured[1]!)
  expect(measured[3]).toBe(measured[1]!)
})
