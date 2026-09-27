import { zlibSync } from 'fflate'
import { crc32 } from '../export/png'

export function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(data.length + 12),
    view = new DataView(bytes.buffer)
  view.setUint32(0, data.length)
  bytes.set(new TextEncoder().encode(type), 4)
  bytes.set(data, 8)
  view.setUint32(bytes.length - 4, crc32(bytes.subarray(4, bytes.length - 4)))
  return bytes
}

export function pngParts(parts: readonly Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(8 + parts.reduce((sum, part) => sum + part.length, 0))
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  let at = 8
  for (const part of parts) {
    bytes.set(part, at)
    at += part.length
  }
  return bytes
}

const TRANSMISSION = [
  [1, 6, 4, 6, 2, 6, 4, 6],
  [7, 7, 7, 7, 7, 7, 7, 7],
  [5, 6, 5, 6, 5, 6, 5, 6],
  [7, 7, 7, 7, 7, 7, 7, 7],
  [3, 6, 4, 6, 3, 6, 4, 6],
  [7, 7, 7, 7, 7, 7, 7, 7],
  [5, 6, 5, 6, 5, 6, 5, 6],
  [7, 7, 7, 7, 7, 7, 7, 7],
]

/** Test encoder enumerates the Adam7 transmission matrix, not decoder pass coordinates. */
export function makePngFixture(options: {
  width: number
  height: number
  colorType: 0 | 2 | 3 | 4 | 6
  depth: 1 | 2 | 4 | 8 | 16
  interlaced?: boolean
  filter?: number
  samples?: number[]
  palette?: Uint8Array
  transparency?: Uint8Array
}) {
  const { width, height, colorType, depth, interlaced = false, filter = 0 } = options
  const channels = ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 } as const)[colorType]
  const max = 2 ** depth - 1
  const samples =
    options.samples ??
    Array.from(
      { length: width * height * channels },
      (_, i) => (i * 37 + Math.floor(i / 7) * 13) % (max + 1),
    )
  const palette =
    colorType === 3
      ? (options.palette ?? Uint8Array.from({ length: (max + 1) * 3 }, (_, i) => (i * 73) % 256))
      : options.palette
  const transparency = options.transparency
  const pixelBytes = Math.ceil((channels * depth) / 8)
  const filtered: number[] = []
  for (let pass = interlaced ? 1 : 0; pass <= (interlaced ? 7 : 0); pass++) {
    let previous: number[] = []
    for (let y = 0; y < height; y++) {
      const rowSamples: number[] = []
      for (let x = 0; x < width; x++) {
        if (interlaced && TRANSMISSION[y % 8]![x % 8] !== pass) continue
        const offset = (y * width + x) * channels
        rowSamples.push(...samples.slice(offset, offset + channels))
      }
      if (!rowSamples.length) continue
      const row = Array<number>(Math.ceil((rowSamples.length * depth) / 8)).fill(0)
      for (let i = 0; i < rowSamples.length; i++) {
        const value = rowSamples[i]!
        if (depth === 16) {
          row[i * 2] = value >> 8
          row[i * 2 + 1] = value & 255
        } else if (depth === 8) row[i] = value
        else row[Math.floor((i * depth) / 8)]! |= value << (8 - depth - ((i * depth) % 8))
      }
      filtered.push(filter)
      for (let i = 0; i < row.length; i++) {
        const left = row[i - pixelBytes] ?? 0,
          above = previous[i] ?? 0,
          corner = previous[i - pixelBytes] ?? 0
        let predictor = 0
        if (filter === 1) predictor = left
        if (filter === 2) predictor = above
        if (filter === 3) predictor = Math.floor((left + above) / 2)
        if (filter === 4) {
          const estimate = left + above - corner
          predictor = [left, above, corner].sort(
            (a, b) => Math.abs(a - estimate) - Math.abs(b - estimate),
          )[0]!
        }
        filtered.push((row[i]! - predictor + 256) % 256)
      }
      previous = row
    }
  }
  const header = new Uint8Array(13),
    headerView = new DataView(header.buffer)
  headerView.setUint32(0, width)
  headerView.setUint32(4, height)
  header.set([depth, colorType, 0, 0, interlaced ? 1 : 0], 8)
  const before = [pngChunk('IHDR', header)]
  if (palette) before.push(pngChunk('PLTE', palette))
  if (transparency) before.push(pngChunk('tRNS', transparency))
  const raw = Uint8Array.from(filtered),
    compressed = zlibSync(raw)
  const rgba: number[] = []
  const transparent =
    transparency && colorType !== 3
      ? Array.from(
          { length: transparency.length / 2 },
          (_, i) =>
            new DataView(
              transparency.buffer,
              transparency.byteOffset,
              transparency.byteLength,
            ).getUint16(i * 2) & max,
        )
      : null
  for (let i = 0; i < samples.length; i += channels) {
    if (colorType === 3) {
      const index = samples[i]!
      rgba.push(...palette!.subarray(index * 3, index * 3 + 3), transparency?.[index] ?? 255)
    } else {
      const color =
        colorType === 0 || colorType === 4
          ? Array<number>(3).fill(samples[i]! * (depth < 8 ? 255 / max : 1))
          : samples.slice(i, i + 3)
      const opaque = depth === 16 ? 65535 : 255
      const alpha =
        colorType === 4 || colorType === 6
          ? samples[i + channels - 1]!
          : transparent?.every((value, c) => value === samples[i + c])
            ? 0
            : opaque
      rgba.push(...color, alpha)
    }
  }
  return {
    bytes: pngParts([...before, pngChunk('IDAT', compressed), pngChunk('IEND', new Uint8Array(0))]),
    rgba,
    header,
    before,
    raw,
    compressed,
  }
}
