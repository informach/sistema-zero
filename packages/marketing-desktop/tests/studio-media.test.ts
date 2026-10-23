import { expect, test } from 'bun:test'
import sharp from 'sharp'
import { prepareStudioMedia } from '../src/main/media/studio-media'

test('normalização de mídia preserva pixels e programa, deixando o original intacto', async () => {
  const pixels = Buffer.alloc(32 * 32 * 3)
  for (let index = 0; index < pixels.length; index++) pixels[index] = index % 255
  const png = await sharp(pixels, { raw: { width: 32, height: 32, channels: 3 } })
    .png({ compressionLevel: 0 })
    .toBuffer()
  const dataUrl = `data:image/png;base64,${png.toString('base64')}`
  const original = {
    version: 2,
    behavior: {
      events: [
        { type: 'foe-turn', body: [{ type: 'boss', image: dataUrl, life: 160, threshold: 80 }] },
      ],
    },
  }
  const before = JSON.stringify(original),
    result = await prepareStudioMedia(original, 3000)
  expect(result.changes.length).toBe(1)
  const parsed = JSON.parse(JSON.stringify(result.document))
  const encoded = parsed.behavior.events[0].body[0].image
  expect(encoded.startsWith('data:image/webp;base64,')).toBe(true)
  expect(
    await sharp(Buffer.from(encoded.split(',')[1], 'base64'))
      .removeAlpha()
      .raw()
      .toBuffer(),
  ).toEqual(pixels)
  parsed.behavior.events[0].body[0].image = dataUrl
  expect(parsed).toEqual(original)
  expect(JSON.stringify(original)).toBe(before)
  expect(result.changes[0]?.fromSha256).not.toBe(result.changes[0]?.toSha256)
})
