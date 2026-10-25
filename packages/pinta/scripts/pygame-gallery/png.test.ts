/**
 * The gallery's PNG encoder, decoded by an independent decoder (the native canvas): palette with
 * transparency, opaque palette without tRNS, RGBA above 256 colours, the chunk order pinta.py
 * relies on, and pixels that decode exactly as they went in.
 */
import { describe, expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { pngWithPintaData } from '../../src/export/pngText'
import { encodePng, type RgbaImage } from './png'

function chunks(png: Uint8Array) {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength)
  const found: { type: string; data: Uint8Array }[] = []
  for (let at = 8; at < png.length; ) {
    const length = view.getUint32(at)
    found.push({
      type: String.fromCharCode(...png.subarray(at + 4, at + 8)),
      data: png.subarray(at + 8, at + 8 + length),
    })
    at += 12 + length
  }
  return found
}

async function decode(png: Uint8Array) {
  const image = await loadImage(Buffer.from(png))
  const canvas = createCanvas(image.width, image.height)
  canvas.getContext('2d').drawImage(image, 0, 0)
  return {
    width: image.width,
    height: image.height,
    pixels: [...canvas.getContext('2d').getImageData(0, 0, image.width, image.height).data],
  }
}

/** An image from a function (x, y) → [r, g, b, a]. */
function image(
  width: number,
  height: number,
  pixel: (x: number, y: number) => number[],
): RgbaImage {
  const pixels = new Uint8Array(width * height * 4)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) pixels.set(pixel(x, y), (y * width + x) * 4)
  return { width, height, pixels }
}

const header = (png: Uint8Array) => {
  const ihdr = chunks(png)[0]!
  return { type: ihdr.type, bitDepth: ihdr.data[8], colorType: ihdr.data[9] }
}

describe('the gallery PNG encoder', () => {
  test('a drawing with transparency is a palette with tRNS, the transparent colour first', async () => {
    const sprite = image(6, 4, (x, y) =>
      x < 2 ? [0, 0, 0, 0] : y < 2 ? [255, 0, 0, 255] : [0, 0, 255, 255],
    )
    const png = encodePng(sprite)
    expect(header(png)).toEqual({ type: 'IHDR', bitDepth: 8, colorType: 3 })
    const list = chunks(png)
    expect(list.map((chunk) => chunk.type)).toEqual(['IHDR', 'PLTE', 'tRNS', 'IDAT', 'IEND'])
    expect(list[1]!.data.length).toBe(3 * 3)
    // Only the transparent entry is listed: every other colour is opaque.
    expect([...list[2]!.data]).toEqual([0])
    expect((await decode(png)).pixels).toEqual([...sprite.pixels])
  })

  test('an opaque drawing is a palette without tRNS', async () => {
    const background = image(5, 5, (x, y) =>
      (x + y) % 2 ? [10, 200, 30, 255] : [250, 250, 240, 255],
    )
    const png = encodePng(background)
    expect(header(png).colorType).toBe(3)
    expect(chunks(png).map((chunk) => chunk.type)).toEqual(['IHDR', 'PLTE', 'IDAT', 'IEND'])
    expect((await decode(png)).pixels).toEqual([...background.pixels])
  })

  test('more than 256 colours fall back to RGBA, with the same pixels', async () => {
    const busy = image(20, 20, (x, y) => [
      x * 12,
      y * 12,
      (x * y) % 256,
      x === 0 && y === 0 ? 0 : 255,
    ])
    const png = encodePng(busy)
    expect(header(png).colorType).toBe(6)
    expect(chunks(png).map((chunk) => chunk.type)).toEqual(['IHDR', 'IDAT', 'IEND'])
    // The first pixel is transparent: the decoder gives 0,0,0,0 for it whatever its RGB.
    const expected = [...busy.pixels]
    expected.splice(0, 4, 0, 0, 0, 0)
    expect((await decode(png)).pixels).toEqual(expected)
  })

  test('exactly 256 colours still fit a palette', async () => {
    const full = image(16, 16, (x, y) => [x * 16, y * 16, 7, 255])
    const png = encodePng(full)
    expect(header(png).colorType).toBe(3)
    expect(chunks(png)[1]!.data.length).toBe(256 * 3)
    expect((await decode(png)).pixels).toEqual([...full.pixels])
  })

  test('alpha 0 with any RGB is the one transparent colour', async () => {
    const holes = image(3, 1, (x) =>
      x === 0 ? [9, 9, 9, 0] : x === 1 ? [200, 1, 1, 0] : [1, 2, 3, 255],
    )
    const png = encodePng(holes)
    expect(chunks(png)[1]!.data.length).toBe(2 * 3)
    expect((await decode(png)).pixels).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 255])
  })

  test('a pixel-art image scaled ×2 decodes exactly (the Up filter path)', async () => {
    const art = image(32, 32, (x, y) => {
      const sx = Math.floor(x / 2)
      const sy = Math.floor(y / 2)
      return (sx * sy) % 5 === 0 ? [0, 0, 0, 0] : [(sx * 37) % 256, (sy * 53) % 256, 128, 255]
    })
    expect((await decode(encodePng(art))).pixels).toEqual([...art.pixels])
  })

  test('the Pinta data block goes right after IHDR, before PLTE', async () => {
    const png = await pngWithPintaData(encodePng(image(2, 2, () => [1, 2, 3, 255])), {
      format: 'pinta',
      kind: 'teste',
    })
    expect(chunks(png).map((chunk) => chunk.type)).toEqual(['IHDR', 'iTXt', 'PLTE', 'IDAT', 'IEND'])
    // Right after the signature (8) and IHDR (25): where pinta.py reads it.
    expect(String.fromCharCode(...png.subarray(37, 41))).toBe('iTXt')
    const block = chunks(png)[1]!.data
    // keyword `pinta`, compressed (1), zlib (0), no language, no translated keyword.
    expect([...block.subarray(0, 10)]).toEqual([...Buffer.from('pinta'), 0, 1, 0, 0, 0])
    expect(JSON.parse(inflateSync(block.subarray(10)).toString('utf8'))).toEqual({
      format: 'pinta',
      kind: 'teste',
    })
  })

  test('the same image always gives the same bytes', () => {
    const picture = image(9, 7, (x, y) => [x * 20, y * 30, 5, (x + y) % 3 ? 255 : 0])
    expect(Buffer.from(encodePng(picture)).equals(Buffer.from(encodePng(picture)))).toBe(true)
  })
})
