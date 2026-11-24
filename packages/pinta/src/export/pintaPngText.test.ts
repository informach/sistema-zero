import { expect, test } from 'bun:test'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { deflateSync, gzipSync, zlibSync } from 'fflate'
import { readPintaPngText } from './pintaPngText'
import { insertPngChunkAfterIhdr, iTxtChunkData, pngChunk, pngWithPintaJson } from './pngText'

function cover() {
  const canvas = createCanvas(32, 16),
    ctx = canvas.getContext('2d')
  ctx.fillStyle = '#e04020'
  ctx.fillRect(0, 0, 32, 16)
  ctx.fillStyle = '#1234ef'
  ctx.fillRect(4, 3, 8, 6)
  return new Uint8Array(canvas.toBuffer('image/png'))
}
const encoded = (bytes: Uint8Array, compressed = true) => {
  const body = iTxtChunkData('pinta', bytes)
  if (!compressed) body[6] = 0
  return insertPngChunkAfterIhdr(cover(), pngChunk('iTXt', body))
}
const pngText = (text: string) => encoded(zlibSync(new TextEncoder().encode(text)))

test('the bounded reader extracts the actual writer metadata and retains the real PNG pixels', async () => {
  const text = JSON.stringify({ format: 'pinta', version: 5, name: 'Bosque 🌳' }),
    png = await pngWithPintaJson(cover(), text),
    read = readPintaPngText(png)
  expect(read.text).toBe(text)
  expect([read.width, read.height]).toEqual([32, 16])
  expect(Buffer.from(read.png).equals(png)).toBe(true)
  expect(read.png.buffer).not.toBe(png.buffer)
  const image = await loadImage(read.png),
    canvas = createCanvas(32, 16),
    ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0)
  expect([...ctx.getImageData(0, 0, 1, 1).data]).toEqual([224, 64, 32, 255])
  expect([...ctx.getImageData(4, 3, 1, 1).data]).toEqual([18, 52, 239, 255])
  png.fill(0)
  expect(read.png[0]).toBe(137)
  expect(read.text).toBe(text)
})

test('UTF-8 byte budgets are exact for compressed and uncompressed Pinta metadata', () => {
  const text = '🌳 á',
    bytes = new TextEncoder().encode(text)
  for (const png of [pngText(text), encoded(bytes, false)]) {
    expect(readPintaPngText(png, bytes.length).text).toBe(text)
    expect(() => readPintaPngText(png, bytes.length - 1)).toThrow('ultrapassam')
    expect(() => readPintaPngText(png, text.length)).toThrow('ultrapassam')
  }
  expect(readPintaPngText(pngText(''), 0).text).toBe('')
  expect(readPintaPngText(encoded(new Uint8Array(), false), 0).text).toBe('')
})

test('a tiny compressed payload cannot expand beyond the supplied remaining world budget', () => {
  const text = 'a'.repeat(2 * 1024 * 1024),
    compressed = zlibSync(new TextEncoder().encode(text))
  expect(compressed.length).toBeLessThan(4096)
  expect(() => readPintaPngText(encoded(compressed), 128)).toThrow('ultrapassam')
  expect(readPintaPngText(encoded(compressed), text.length).text).toBe(text)
})

test('fatal UTF-8 decoding spans output chunks and refuses malformed or incomplete sequences', () => {
  const text = 'a'.repeat(16383) + '🌳'.repeat(6000)
  expect(readPintaPngText(pngText(text)).text).toBe(text)
  for (const bytes of [new Uint8Array([0xc3, 0x28]), new Uint8Array([0xf0, 0x9f, 0x8c])])
    for (const png of [encoded(bytes, false), encoded(zlibSync(bytes))])
      expect(() => readPintaPngText(png)).toThrow('estragados')
})

test('CRC-valid iTXt still refuses bad checksums, trailing bytes, extra streams and other wrappers', () => {
  const bytes = new TextEncoder().encode('{"name":"Vila"}'),
    compressed = zlibSync(bytes),
    corrupt = compressed.slice()
  corrupt[corrupt.length - 1]! ^= 1
  const trailing = new Uint8Array(compressed.length + 1)
  trailing.set(compressed)
  const forged = new Uint8Array(compressed.length + 4)
  forged.set(compressed)
  forged.set(compressed.subarray(-4), compressed.length)
  const concatenated = new Uint8Array(compressed.length * 2)
  concatenated.set(compressed)
  concatenated.set(compressed, compressed.length)
  for (const payload of [
    corrupt,
    trailing,
    forged,
    concatenated,
    compressed.subarray(0, -1),
    gzipSync(bytes),
    deflateSync(bytes),
  ])
    expect(() => readPintaPngText(encoded(payload))).toThrow('estragados')
})

test('all PNG CRCs and static-image guards are checked before decompressing Pinta metadata', () => {
  const source = pngText('x'.repeat(1000)),
    broken = source.slice()
  broken[broken.length - 1]! ^= 1
  expect(() => readPintaPngText(broken, 0)).toThrow('Integridade')
  for (const type of ['acTL', 'EVIL'])
    expect(() =>
      readPintaPngText(insertPngChunkAfterIhdr(source, pngChunk(type, new Uint8Array(8))), 0),
    ).toThrow('PNG estático')
  expect(() => readPintaPngText(source.subarray(0, -1))).toThrow()
  expect(() => readPintaPngText(new Uint8Array(16 * 1024 * 1024 + 1))).toThrow()
})

test('duplicate Pinta chunks are refused before decompressing even the first payload', () => {
  const source = pngText('x'.repeat(1000))
  const duplicate = insertPngChunkAfterIhdr(
    source,
    pngChunk('iTXt', iTxtChunkData('pinta', zlibSync(new TextEncoder().encode('another')))),
  )
  expect(() => readPintaPngText(duplicate, 0)).toThrow('estragados')
})

test('missing metadata and unsupported native iTXt control fields refuse without a fallback', () => {
  expect(() => readPintaPngText(cover())).toThrow('estragados')
  for (const [index, value] of [
    [6, 2],
    [7, 1],
    [8, 101],
    [9, 101],
  ] as const) {
    const body = iTxtChunkData('pinta', zlibSync(new TextEncoder().encode('{}')))
    body[index] = value
    expect(() =>
      readPintaPngText(insertPngChunkAfterIhdr(cover(), pngChunk('iTXt', body))),
    ).toThrow('estragados')
  }
  const foreign = insertPngChunkAfterIhdr(
    pngText('{}'),
    pngChunk('iTXt', iTxtChunkData('other', new Uint8Array([1, 2, 3]))),
  )
  expect(readPintaPngText(foreign).text).toBe('{}')
})

test('the caller may only reduce the target budget and input byte offsets remain supported', () => {
  const source = pngText('{}'),
    padded = new Uint8Array(source.length + 13)
  padded.set(source, 7)
  expect(readPintaPngText(padded.subarray(7, 7 + source.length), 2).text).toBe('{}')
  for (const limit of [-1, NaN, Infinity, 1.5, 16 * 1024 * 1024 + 1])
    expect(() => readPintaPngText(source, limit)).toThrow('ultrapassam')
})

test('Node Buffer inputs are captured as owned bytes, without slice aliases or pooled offsets', () => {
  const source = Buffer.from(pngText('{}'))
  const read = readPintaPngText(source)
  expect(read.text).toBe('{}')
  expect(read.png.buffer).not.toBe(source.buffer)
  expect(read.png.byteOffset).toBe(0)
  source.fill(0)
  expect(read.png[0]).toBe(137)
})
