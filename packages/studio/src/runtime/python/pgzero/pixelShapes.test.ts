import { describe, expect, test } from 'bun:test'
import reference from './__tests__/drawReference.json'
import {
  drawArc,
  drawCircle,
  drawEllipse,
  drawLine,
  drawPolygon,
  drawRect,
  type PixelTarget,
} from './pixelShapes'

interface Case {
  fn: string
  args: unknown[]
  kwargs: Record<string, never>
  pixels: string
}
const {
  width: W,
  height: H,
  cases,
} = reference as unknown as {
  width: number
  height: number
  cases: Case[]
}

/** The screen the shape leaves, one bit per pixel, written like the reference. */
function render(item: Case) {
  const screen = new Uint8Array(W * H)
  const target: PixelTarget = {
    width: W,
    height: H,
    fill(x, y, w, h) {
      expect(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= W && y + h <= H).toBe(true)
      expect([x, y, w, h].every(Number.isInteger)).toBe(true)
      for (let row = y; row < y + h; row++) screen.fill(1, row * W + x, row * W + x + w)
    },
  }
  const a = item.args as never[]
  const n = (index: number, fallback: number) => (a[index] as number | undefined) ?? fallback
  const xy = (value: unknown) => value as [number, number]
  switch (item.fn) {
    case 'rect': {
      const [x, y, w, h] = a[0] as unknown as number[]
      drawRect(target, x!, y!, w!, h!, n(1, 0), n(2, 0), {
        topLeft: n(3, -1),
        topRight: n(4, -1),
        bottomLeft: n(5, -1),
        bottomRight: n(6, -1),
      })
      break
    }
    case 'circle':
      drawCircle(target, xy(a[0])[0], xy(a[0])[1], n(1, 0), n(2, 0), {
        topRight: n(3, 0),
        topLeft: n(4, 0),
        bottomLeft: n(5, 0),
        bottomRight: n(6, 0),
      })
      break
    case 'ellipse': {
      const [x, y, w, h] = a[0] as unknown as number[]
      drawEllipse(target, x!, y!, w!, h!, n(1, 0))
      break
    }
    case 'arc': {
      const [x, y, w, h] = a[0] as unknown as number[]
      drawArc(target, x!, y!, w!, h!, n(1, 0), n(2, 0), n(3, 1))
      break
    }
    case 'line':
      drawLine(target, xy(a[0])[0], xy(a[0])[1], xy(a[1])[0], xy(a[1])[1], n(2, 1))
      break
    case 'lines': {
      // pygame.draw.lines: one line per pair of points, as the Studio's Python sends them.
      const points = a[1] as unknown as [number, number][]
      const width = n(2, 1)
      for (let i = 1; i < points.length; i++)
        drawLine(target, ...points[i - 1]!, ...points[i]!, width)
      if (a[0] && points.length > 2) drawLine(target, ...points.at(-1)!, ...points[0]!, width)
      break
    }
    case 'polygon': {
      const points = a[0] as unknown as [number, number][]
      drawPolygon(
        target,
        points.map(([x]) => x),
        points.map(([, y]) => y),
        n(1, 0),
      )
      break
    }
    default:
      throw new Error(`Caso desconhecido: ${item.fn}`)
  }
  let bits = ''
  for (let start = 0; start < screen.length; start += 4)
    bits += (
      (screen[start]! << 3) |
      (screen[start + 1]! << 2) |
      (screen[start + 2]! << 1) |
      screen[start + 3]!
    ).toString(16)
  return bits
}

/** The pixels that differ, drawn as text: # both, + only the Studio, - only pygame-ce. */
function difference(expected: string, actual: string) {
  const bit = (hex: string, index: number) =>
    (Number.parseInt(hex[index >> 2]!, 16) >> (3 - (index & 3))) & 1
  const rows: string[] = []
  for (let y = 0; y < H; y++) {
    let row = ''
    for (let x = 0; x < W; x++) {
      const e = bit(expected, y * W + x)
      const s = bit(actual, y * W + x)
      row += e && s ? '#' : s ? '+' : e ? '-' : '.'
    }
    rows.push(row)
  }
  return rows.join('\n')
}

describe('pygame.draw pixel by pixel, against pygame-ce 2.5.8', () => {
  test('the reference was measured on pygame-ce 2.5.8 and covers every function', () => {
    expect((reference as { pygame: string }).pygame).toBe('2.5.8')
    const kinds = new Set(cases.map(({ fn }) => fn))
    expect([...kinds].sort()).toEqual([
      'arc',
      'circle',
      'ellipse',
      'line',
      'lines',
      'polygon',
      'rect',
    ])
    // Not a vacuum: most cases draw something, and some draw nothing at all.
    const empty = cases.filter(({ pixels }) => /^0+$/.test(pixels)).length
    expect(empty).toBeGreaterThan(10)
    expect(empty).toBeLessThan(cases.length / 3)
  })

  for (const kind of ['rect', 'circle', 'ellipse', 'arc', 'line', 'lines', 'polygon'])
    test(`${kind}: the same pixels in every case`, () => {
      const failures: string[] = []
      cases.forEach((item, index) => {
        if (item.fn !== kind) return
        const actual = render(item)
        if (actual !== item.pixels && failures.length < 3)
          failures.push(
            `caso ${index}: ${item.fn}(${JSON.stringify(item.args)})\n${difference(item.pixels, actual)}`,
          )
        else if (actual !== item.pixels) failures.push(`caso ${index}`)
      })
      expect(failures.slice(0, 3).join('\n\n')).toBe('')
      expect(failures.length).toBe(0)
    })
})
