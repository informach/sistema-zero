import { expect, test } from 'bun:test'
import { PGZERO_LIMITS, readPgzeroFrameHeader } from './protocol'

const frame = (change: Record<string, unknown> = {}) =>
  JSON.stringify({
    w: 320,
    h: 240,
    title: 'Jogo',
    keep: false,
    images: [],
    fonts: [],
    strings: [],
    styles: [],
    audio: [],
    ...change,
  })

test('images travel with the size the module read, pixel or vector', () => {
  const header = readPgzeroFrameHeader(
    frame({
      images: [
        [1, '/projeto/images/nave.svg', 64, 40],
        [2, '/projeto/images/x.png', 8, 8],
      ],
    }),
  )
  expect(header.images).toEqual([
    [1, '/projeto/images/nave.svg', 64, 40],
    [2, '/projeto/images/x.png', 8, 8],
  ])
  for (const entry of [
    [1, '/projeto/images/nave.svg'],
    [1, '/projeto/images/nave.svg', 0, 40],
    [1, '/projeto/images/nave.svg', 64, PGZERO_LIMITS.imageDimension + 1],
    [1, '/projeto/images/nave.svg', 6.5, 40],
  ])
    expect(() => readPgzeroFrameHeader(frame({ images: [entry] }))).toThrow()
})

test('a pixel request is not a frame: it keeps the screen and names one vector image', () => {
  const header = readPgzeroFrameHeader(frame({ keep: true, decode: [3, 0, 12] }))
  expect(header.decode).toEqual([3, 0, 12])
  expect(readPgzeroFrameHeader(frame()).decode).toBeUndefined()
  for (const decode of [[3, 0, 12, 1], [0, 0, 1], [3, -1, 1], [3, 0, 0], 'x'])
    expect(() => readPgzeroFrameHeader(frame({ keep: true, decode }))).toThrow()
  // A frame that paints cannot also ask for pixels.
  expect(() => readPgzeroFrameHeader(frame({ keep: false, decode: [3, 0, 12] }))).toThrow()
})

test('the pixel chunk fits the text reply of the worker channel', () => {
  // base64 grows 4/3; the supervisor refuses replies above 128 000 characters.
  expect(Math.ceil(PGZERO_LIMITS.decodeBytes / 3) * 4 + 32).toBeLessThan(128_000)
})
