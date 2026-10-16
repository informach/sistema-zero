import { expect, test } from 'bun:test'
import { animatedGlb } from '../../../e2e/helpers/animatedGlb'
import { buildProAssetBundle } from '../proAssets'
import { readProModelMetadata } from '../proModelMetadata'

test('derives clips from binary timestamps and labels local geometry bounds without claiming world bounds', () => {
  const bytes = animatedGlb()
  const metadata = readProModelMetadata(bytes)
  expect(metadata).toMatchObject({
    format: 'glb2',
    upAxis: 'Y',
    unit: 'meter',
    nodes: 3,
    skins: 1,
    clips: [{ index: 0, name: 'Acenar', durationSeconds: 1 }],
    geometryBounds: [{ mesh: 0, primitive: 0, min: [5, 3, 0], max: [7, 5, 0] }],
  })
  const slice = new Uint8Array(bytes.length + 12)
  slice.set(bytes, 8)
  expect(readProModelMetadata(slice.subarray(8, 8 + bytes.length))).toEqual(metadata)
  expect(readProModelMetadata(bytes.subarray(0, bytes.length - 4))).toBeUndefined()
  const corrupt = bytes.slice()
  new DataView(corrupt.buffer).setUint32(12, 2_000_000, true)
  expect(readProModelMetadata(corrupt)).toBeUndefined()
})

test('the derived asset manifest carries GLB metadata without duplicating model bytes in source', async () => {
  const bytes = animatedGlb()
  const bundle = await buildProAssetBundle([
    {
      id: 'model',
      name: 'heroi',
      kind: 'model3d',
      source: 'library',
      libOrigin: 'molda',
      originalFileName: 'heroi.glb',
      dataUrl: `data:model/gltf-binary;base64,${Buffer.from(bytes).toString('base64')}`,
    },
  ])
  expect(bundle.manifest.assets[0]?.model?.clips[0]?.durationSeconds).toBe(1)
  expect(bundle.manifest.assets[0]?.origin).toBe('molda')
  expect(bundle.files.get(bundle.manifest.assets[0]!.path)).toEqual(bytes)
})
