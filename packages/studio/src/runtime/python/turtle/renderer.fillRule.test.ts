import { afterAll, expect, test } from 'bun:test'
import { createTurtleRenderer } from './renderer'

// Tk fills polygons by the even-odd rule (a star drawn with begin_fill() has a hollow middle
// on the computer), so the browser canvas fills them the same way.
const originalContext = HTMLCanvasElement.prototype.getContext
const originalPath = globalThis.Path2D
const fills: unknown[][] = []
globalThis.Path2D ??= class {
  moveTo() {}
  lineTo() {}
  closePath() {}
} as unknown as typeof Path2D
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value() {
    return {
      setTransform() {},
      clearRect() {},
      fillRect() {},
      translate() {},
      fill(...args: unknown[]) {
        fills.push(args)
      },
      stroke() {},
      drawImage() {},
    }
  },
})
afterAll(() => {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: originalContext,
  })
  globalThis.Path2D = originalPath
})

test('a filled polygon (a star from begin_fill) uses the even-odd rule, like Tk', async () => {
  const host = document.createElement('div')
  const renderer = createTurtleRenderer(host, { activityPresentation: true })
  const star = [0, 1, 2, 3, 4].map((step) => {
    const angle = (step * 144 * Math.PI) / 180
    return [Math.round(Math.cos(angle) * 50), Math.round(Math.sin(angle) * 50)]
  })
  await renderer.exchange(
    JSON.stringify({
      version: 1,
      operations: [
        { op: 'open' },
        { op: 'create', id: 1, kind: 'polygon' },
        { op: 'patch', id: 1, points: star, fill: '#ffcc00', outline: '#000000', width: 1 },
      ],
      query: { type: 'present' },
    }),
    [],
  )
  const polygonFills = fills.filter((args) => args.length > 0)
  expect(polygonFills.length).toBeGreaterThan(0)
  for (const args of polygonFills) expect(args[1]).toBe('evenodd')
})
