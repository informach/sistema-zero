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
  const header = readPgzeroFrameHeader(frame({ keep: true, decode: 3 }))
  expect(header.decode).toBe(3)
  expect(readPgzeroFrameHeader(frame()).decode).toBeUndefined()
  for (const decode of [[3, 0, 12], 0, -1, 1.5, PGZERO_LIMITS.images + 1, 'x'])
    expect(() => readPgzeroFrameHeader(frame({ keep: true, decode }))).toThrow()
  // A frame that paints cannot also ask for pixels.
  expect(() => readPgzeroFrameHeader(frame({ keep: false, decode: 3 }))).toThrow()
})

test('a frame may ask the host to report the sounds that end', () => {
  expect(readPgzeroFrameHeader(frame()).watch).toBe(false)
  expect(readPgzeroFrameHeader(frame({ watch: true })).watch).toBe(true)
  expect(() => readPgzeroFrameHeader(frame({ watch: 1 }))).toThrow()
})

test('text styles that would block the page are refused', () => {
  const styled = (style: Record<string, unknown>) =>
    readPgzeroFrameHeader(frame({ styles: [[1, style]] })).styles[0]![1]
  expect(styled({ fontsize: 512, owidth: 1.5 })).toEqual({ fontsize: 512, owidth: 1.5 })
  expect(styled({ fontsize: 24, shadow: [1, 1], lineheight: 2 })).toBeTruthy()
  for (const style of [
    { fontsize: PGZERO_LIMITS.fontSize + 1 },
    { fontsize: -1 },
    // ptext: outline radius = owidth × fontsize / 24 pixels.
    { fontsize: 100, owidth: 50 },
    { owidth: 33 },
    { fontsize: 200, shadow: [10, 0] },
    { lineheight: PGZERO_LIMITS.lineHeight + 1 },
    { width: PGZERO_LIMITS.textWidth + 1 },
  ])
    expect(() => readPgzeroFrameHeader(frame({ styles: [[1, style]] }))).toThrow()
})
