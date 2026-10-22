import { afterAll, expect, test } from 'bun:test'
import { createTurtleRenderer } from './renderer'

// Controlled canvas/RAF ports test scheduling/lifecycle,
// not a browser's policy for offscreen animation frames.
const originalRaf = globalThis.requestAnimationFrame
const originalCancel = globalThis.cancelAnimationFrame
const originalContext = HTMLCanvasElement.prototype.getContext
const callbacks = new Map<number, FrameRequestCallback>()
let serial = 0
let paints = 0
globalThis.requestAnimationFrame = (fn) => {
  callbacks.set(++serial, fn)
  return serial
}
globalThis.cancelAnimationFrame = (id) => {
  callbacks.delete(id)
}
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value() {
    return {
      setTransform() {},
      clearRect() {
        paints++
      },
      fillRect() {},
      translate() {},
    }
  },
})
afterAll(() => {
  globalThis.requestAnimationFrame = originalRaf
  globalThis.cancelAnimationFrame = originalCancel
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: originalContext,
  })
})
const request = (type: 'present' | 'activity-turn', operations: unknown[] = []) =>
  JSON.stringify({ version: 1, operations, query: { type } })
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

test('ordinary rendering remains blocked until its RAF is delivered', async () => {
  const host = document.createElement('div'),
    renderer = createTurtleRenderer(host)
  let settled = false
  try {
    const pending = renderer.exchange(request('present', [{ op: 'open' }]), []).then(() => {
      settled = true
    })
    await delay(40)
    expect(settled).toBe(false)
    expect(host.querySelector('canvas')).toBeNull()
    expect(callbacks.size).toBe(1)
    const [id, fn] = [...callbacks][0]!
    callbacks.delete(id)
    fn(0)
    await pending
    expect(settled).toBe(true)
    expect(host.querySelector('canvas')).not.toBeNull()
  } finally {
    renderer.dispose()
  }
})

const deliverFrame = () => {
  const [id, fn] = [...callbacks][0]!
  callbacks.delete(id)
  fn(0)
}

test('after a frame has passed, a new presentation paints at once like Tk update()', async () => {
  const host = document.createElement('div'),
    renderer = createTurtleRenderer(host)
  try {
    const first = renderer.exchange(request('present', [{ op: 'open' }]), [])
    deliverFrame()
    await first
    await delay(20)
    const before = paints
    let settled = false
    const next = renderer
      .exchange(request('present', [{ op: 'background', color: '#ff0000' }]), [])
      .then(() => {
        settled = true
      })
    await next
    expect(settled).toBe(true)
    expect(paints).toBe(before + 1)
    expect(callbacks.size).toBe(0)
  } finally {
    renderer.dispose()
  }
})

test('a presentation within the same frame still waits for the animation frame', async () => {
  const host = document.createElement('div'),
    renderer = createTurtleRenderer(host)
  try {
    const first = renderer.exchange(request('present', [{ op: 'open' }]), [])
    deliverFrame()
    await first
    let settled = false
    const fast = renderer
      .exchange(request('present', [{ op: 'background', color: '#00ff00' }]), [])
      .then(() => {
        settled = true
      })
    await delay(5)
    expect(settled).toBe(false)
    expect(callbacks.size).toBe(1)
    deliverFrame()
    await fast
    expect(settled).toBe(true)
  } finally {
    renderer.dispose()
  }
})

test('activity presents without RAF and readiness requires an explicit turn', async () => {
  const host = document.createElement('div'),
    renderer = createTurtleRenderer(host, { activityPresentation: true })
  const before = paints
  try {
    await renderer.exchange(request('present', [{ op: 'open' }]), [])
    expect(paints).toBe(before + 1)
    expect(callbacks.size).toBe(0)
    expect(renderer.readyForActivityControls).toBe(false)
    const ready = renderer.prepareActivityControls()
    await renderer.exchange(request('activity-turn'), [])
    await ready
    expect(renderer.readyForActivityControls).toBe(true)
    // A clean turn must not paint an unrequested additional frame.
    expect(paints).toBe(before + 1)
    renderer.dispatchActivityControls({ keys: ['Space'], clicks: [] })
    const response = JSON.parse(await renderer.exchange(request('present'), []))
    expect(response.events).toEqual([
      { type: 'keypress', key: 'space' },
      { type: 'keyrelease', key: 'space' },
    ])
    await renderer.exchange(request('present', [{ op: 'background', color: '#ff0000' }]), [])
    expect(paints).toBe(before + 2)
  } finally {
    renderer.dispose()
  }
})

test('disposing cancels the activity timer and rejects presentation/readiness without a late canvas', async () => {
  const host = document.createElement('div'),
    renderer = createTurtleRenderer(host, { activityPresentation: true })
  const before = paints
  const pending = renderer.exchange(request('present', [{ op: 'open' }]), []).then(
    () => 'resolved',
    (error: Error) => error.message,
  )
  const ready = renderer.prepareActivityControls().then(
    () => 'resolved',
    (error: Error) => error.message,
  )
  renderer.dispose()
  expect(await pending).toContain('encerrada')
  expect(await ready).toContain('encerrada')
  await delay(40)
  expect(paints).toBe(before)
  expect(callbacks.size).toBe(0)
  expect(host.querySelector('canvas')).toBeNull()
})
