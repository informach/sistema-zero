import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { prepareGalleryPreview } from './galleryPreview'
import { base64ToBytes } from './skinCodec'

test('derived previews are detached from all source buffers and hierarchy', () => {
  const model = makeModel()
  const sky = makeSky()
  const modelPreview = prepareGalleryPreview(model)
  const skyPreview = prepareGalleryPreview(sky)
  const before = structuredClone([modelPreview, skyPreview])
  model.parts[0]!.from[0] = 999
  sky.params.clouds.amount = 0
  expect([modelPreview, skyPreview]).toEqual(before)
  expect(modelPreview).not.toHaveProperty('paletteId')
  expect(modelPreview).not.toHaveProperty('bitmap')
})

test('texture preview PNG is bounded to 32 pixels and preserves transparency and sampled colors', async () => {
  const texture = makeTexture({
    size: 64,
    bitmap: { width: 64, height: 64, data: new Uint8Array(4096).fill(1) },
  })
  texture.bitmap.data[0] = 0
  texture.bitmap.data[2] = 2
  const before = structuredClone(texture)
  const preview = prepareGalleryPreview(texture)
  if (preview.kind !== 'texture') throw new Error('texture')
  const bytes = base64ToBytes(preview.dataUrl.split(',')[1] ?? '')
  if (!bytes) throw new Error('png')
  const { data, info } = await sharp(bytes)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect([info.width, info.height]).toEqual([32, 32])
  expect(data[3]).toBe(0)
  expect(data[7]).toBe(255)
  expect([...data.slice(4, 7)]).not.toEqual([...data.slice(8, 11)])
  expect(texture).toEqual(before)
})
