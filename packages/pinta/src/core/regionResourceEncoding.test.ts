import { expect, test } from 'bun:test'
import { sparseMemoryMap } from '../../scripts/homologacao/memoryRegions'
import { galleryToPintaJson } from '../export/projectJson'
import { captureMapResourceVersion } from '../tiles/resourceVersions'
import { createPixelSpriteAsset, type PintaAsset } from './project'
import { encodeRegionMapDocument } from './regionDocument'

test('native region serialization delegates resource encoding without changing the wire default', () => {
  const sprite = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
  const captured = captureMapResourceVersion(sparseMemoryMap(), sprite)
  if (!captured.ok) throw Error(captured.reason)
  let calls = 0
  const serialize = (asset: PintaAsset): unknown => {
    calls++
    return JSON.parse(galleryToPintaJson([asset])).assets[0]
  }
  const backup = encodeRegionMapDocument(captured.map, serialize)
  expect(calls).toBe(1)
  const resource = backup?.resources?.[0]?.asset
  expect(resource).toEqual(JSON.parse(galleryToPintaJson([captured.version.asset])).assets[0])
  expect(encodeRegionMapDocument(captured.map)).not.toEqual(backup)
})
