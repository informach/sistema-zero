/** Extrai até 32 cores visíveis de pixels RGBA, mantendo cores exatas quando cabem. */
import { MAX_CUSTOM_PALETTE_SIZE } from '../core/palette'

interface Bin {
  r: number
  g: number
  b: number
  count: number
}

interface Box {
  bins: Bin[]
  weight: number
}

const MAX_COLORS = MAX_CUSTOM_PALETTE_SIZE - 1
const MAX_EXACT_COLORS = 4096
const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`

function range(box: Box): { channel: 'r' | 'g' | 'b'; span: number } {
  let best: 'r' | 'g' | 'b' = 'r'
  let span = -1
  for (const channel of ['r', 'g', 'b'] as const) {
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (const bin of box.bins) {
      min = Math.min(min, bin[channel])
      max = Math.max(max, bin[channel])
    }
    const width = max - min
    if (width > span) {
      best = channel
      span = width
    }
  }
  return { channel: best, span }
}

export function paletteFromRgba(data: Uint8ClampedArray): string[] {
  const counts = new Uint32Array(1 << 15)
  const sumsR = new Float64Array(counts.length)
  const sumsG = new Float64Array(counts.length)
  const sumsB = new Float64Array(counts.length)
  let exact: Map<number, number> | null = new Map()
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3]! < 128) continue
    const r = data[i]!
    const g = data[i + 1]!
    const b = data[i + 2]!
    if (exact) {
      const key = (r << 16) | (g << 8) | b
      exact.set(key, (exact.get(key) ?? 0) + 1)
      if (exact.size > MAX_EXACT_COLORS) exact = null
    }
    const bin = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)
    counts[bin]! += 1
    sumsR[bin]! += r
    sumsG[bin]! += g
    sumsB[bin]! += b
  }
  let ordered: string[]
  if (exact) {
    if (exact.size <= MAX_COLORS) {
      ordered = [...exact.entries()]
        .sort((a, b) => b[1] - a[1] || a[0] - b[0])
        .map(([key]) => hex((key >> 16) & 255, (key >> 8) & 255, key & 255))
    } else {
      ordered = quantize(
        [...exact.entries()].map(([key, count]) => ({
          r: (key >> 16) & 255,
          g: (key >> 8) & 255,
          b: key & 255,
          count,
        })),
      )
    }
  } else {
    const bins: Bin[] = []
    for (let i = 0; i < counts.length; i += 1) {
      const count = counts[i]!
      if (count)
        bins.push({ r: sumsR[i]! / count, g: sumsG[i]! / count, b: sumsB[i]! / count, count })
    }
    ordered = quantize(bins)
  }
  const colors = Array.from({ length: MAX_CUSTOM_PALETTE_SIZE }, () => '')
  for (const [index, color] of ordered.slice(0, MAX_COLORS).entries()) colors[index + 1] = color
  return colors
}

function quantize(bins: Bin[]): string[] {
  const boxes: Box[] = [{ bins, weight: bins.reduce((sum, bin) => sum + bin.count, 0) }]
  while (boxes.length < MAX_COLORS) {
    let selected = -1
    let score = -1
    for (const [i, box] of boxes.entries()) {
      if (box.bins.length < 2) continue
      const value = range(box).span * Math.sqrt(box.weight)
      if (value > score) {
        score = value
        selected = i
      }
    }
    if (selected < 0) break
    const box = boxes[selected]!
    const channel = range(box).channel
    box.bins.sort((a, b) => a[channel] - b[channel])
    let split = 0
    let weight = 0
    while (split < box.bins.length - 1 && weight < box.weight / 2) {
      weight += box.bins[split]!.count
      split += 1
    }
    boxes.splice(
      selected,
      1,
      { bins: box.bins.slice(0, split), weight },
      { bins: box.bins.slice(split), weight: box.weight - weight },
    )
  }
  return [
    ...new Set(
      boxes
        .sort((a, b) => b.weight - a.weight)
        .map((box) => {
          const sum = box.bins.reduce(
            (total, bin) => {
              total[0] = total[0]! + bin.r * bin.count
              total[1] = total[1]! + bin.g * bin.count
              total[2] = total[2]! + bin.b * bin.count
              return total
            },
            [0, 0, 0],
          )
          return hex(sum[0]! / box.weight, sum[1]! / box.weight, sum[2]! / box.weight)
        }),
    ),
  ]
}
