import { afterAll, expect, test } from 'bun:test'
import { createTurtleRenderer } from './renderer'

// Controlled canvas port: counts what each canvas draws, to observe which items the renderer
// repaints and when it composes the retained layer. Pixel exactness is proven in a browser
// (e2e-runtime/python-turtle-retained-layer.spec.ts).
const originalContext = HTMLCanvasElement.prototype.getContext
const originalPath = globalThis.Path2D
const contexts = new Map<HTMLCanvasElement, { strokes: number; composed: number }>()
globalThis.Path2D ??= class {
  moveTo() {}
  lineTo() {}
  closePath() {}
} as unknown as typeof Path2D
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value(this: HTMLCanvasElement) {
    const counts = contexts.get(this) ?? { strokes: 0, composed: 0 }
    contexts.set(this, counts)
    return {
      setTransform() {},
      clearRect() {},
      fillRect() {},
      translate() {},
      fill() {},
      stroke() {
        counts.strokes++
      },
      drawImage() {
        counts.composed++
      },
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

const present = (operations: unknown[]) =>
  JSON.stringify({ version: 1, operations, query: { type: 'present' } })
const line = (id: number, offset = 0) => ({
  op: 'patch',
  id,
  points: [
    [id, offset],
    [id + 1, offset + 1],
  ],
  fill: '#000000',
  width: 1,
})

async function scene() {
  const host = document.createElement('div')
  // Activity presentation paints on every present without animation frames.
  const renderer = createTurtleRenderer(host, { activityPresentation: true })
  const lines = Array.from({ length: 100 }, (_, index) => index + 1)
  await renderer.exchange(
    present([
      { op: 'open' },
      ...lines.flatMap((id) => [{ op: 'create', id, kind: 'line' }, line(id)]),
    ]),
    [],
  )
  const main = () => contexts.get(host.querySelector('canvas')!)!
  const layer = () =>
    [...contexts].find(([canvas]) => canvas !== host.querySelector('canvas'))?.[1] ?? {
      strokes: 0,
      composed: 0,
    }
  let tick = 0
  // Each paint moves only the last line, like a turtle extending its current line.
  const paint = async (operations: unknown[] = []) => {
    const before = { main: { ...main() }, layer: { ...layer() } }
    await renderer.exchange(present([...operations, line(100, ++tick)]), [])
    return {
      main: main().strokes - before.main.strokes,
      composed: main().composed - before.main.composed,
      layer: layer().strokes - before.layer.strokes,
    }
  }
  return { renderer, paint }
}

test('unchanged items join the retained layer and later paints redraw only the rest', async () => {
  contexts.clear()
  const { renderer, paint } = await scene()
  try {
    expect(await paint()).toEqual({ main: 100, composed: 0, layer: 0 })
    // Two paints after their last change, the first 99 lines move to the layer once.
    expect(await paint()).toEqual({ main: 1, composed: 1, layer: 99 })
    expect(await paint()).toEqual({ main: 1, composed: 1, layer: 0 })
  } finally {
    renderer.dispose()
  }
})

test('an identical patch or raising the topmost item keeps the layer', async () => {
  contexts.clear()
  const { renderer, paint } = await scene()
  try {
    await paint()
    await paint()
    expect(await paint([line(1), { op: 'raise', id: 100 }])).toEqual({
      main: 1,
      composed: 1,
      layer: 0,
    })
  } finally {
    renderer.dispose()
  }
})

// Dropping rebuilds the layer from the items that are still unchanged, in their new order.
for (const [change, operations, expected] of [
  ['a retained item changes', [line(1, 50)], { main: 100, composed: 0, layer: 0 }],
  ['a retained item is deleted', [{ op: 'delete', id: 1 }], { main: 1, composed: 1, layer: 98 }],
  ['a retained item is raised', [{ op: 'raise', id: 1 }], { main: 2, composed: 1, layer: 98 }],
  ['an item is lowered', [{ op: 'lower', id: 100 }], { main: 100, composed: 0, layer: 0 }],
  [
    'the background changes',
    [{ op: 'background', color: '#ffff00' }],
    { main: 1, composed: 1, layer: 99 },
  ],
  [
    'the screen size changes',
    [{ op: 'size', width: 300, height: 200 }],
    { main: 1, composed: 1, layer: 99 },
  ],
] as const) {
  test(`the layer is dropped and rebuilt when ${change}`, async () => {
    contexts.clear()
    const { renderer, paint } = await scene()
    try {
      await paint()
      await paint()
      expect(await paint([...operations])).toEqual(expected)
    } finally {
      renderer.dispose()
    }
  })
}

test('a transparent background never uses the layer', async () => {
  contexts.clear()
  const { renderer, paint } = await scene()
  try {
    await paint([{ op: 'background', color: '' }])
    await paint()
    expect(await paint()).toEqual({ main: 100, composed: 0, layer: 0 })
  } finally {
    renderer.dispose()
  }
})
