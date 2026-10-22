import { expect, test } from 'bun:test'
import { runInNewContext } from 'node:vm'
import { installCausalGeneration, installPresentationProbe } from './gamePerformance'
import { type CausalInput, type CausalPresentation, causalLatencies } from './performanceAcceptance'

/** Real serialized sampler with controlled browser ports, not a browser/graphic acceptance. */
function sampler() {
  let now = 0
  let pixels = new Uint8ClampedArray([0, 0, 0, 255])
  const callbacks: ((time: number) => void)[] = []
  const listeners = new Map<string, (event: unknown) => void>()
  const causal: {
    generation: string
    inputs: CausalInput[]
    shown: CausalPresentation[]
    pending: boolean
    failure?: string
  } = { generation: 'frame-one', inputs: [], shown: [], pending: false }
  const state: { __szCausal: typeof causal; __szFrames?: number[] } = { __szCausal: causal }
  class Context {
    clearRect() {}
    getImageData() {
      return { data: pixels }
    }
  }
  const context = new Context()
  class Canvas {
    getContext() {
      return context
    }
  }
  const canvas = new Canvas()
  runInNewContext(`(${installPresentationProbe.toString()})()`, {
    globalThis: state,
    window: {
      requestAnimationFrame: (callback: (time: number) => void) => {
        callbacks.push(callback)
        return callbacks.length
      },
      addEventListener: (name: string, callback: (event: unknown) => void) =>
        listeners.set(name, callback),
    },
    document: { querySelector: () => canvas },
    CanvasRenderingContext2D: Context,
    HTMLCanvasElement: Canvas,
    performance: { now: () => now },
    queueMicrotask: (callback: () => void) => callback(),
  })
  return {
    state,
    input(key = 'ArrowLeft', trusted = true, repeat = false) {
      listeners.get('keydown')!({
        target: canvas,
        type: 'keydown',
        key,
        isTrusted: trusted,
        repeat,
        timeStamp: now,
      })
    },
    frame(at: number) {
      now = at
      context.clearRect() // Independent continuous animation.
      for (const callback of callbacks.splice(0)) callback(now)
    },
    show(id: number, key: number) {
      pixels = new Uint8ClampedArray([id & 255, id >> 8, key, 255])
    },
  }
}

test('real sampler: continuous animation never turns ignored input into a presentation', () => {
  const probe = sampler()
  probe.input()
  for (let i = 1; i <= 40; i++) probe.frame(i * 16.667)
  expect(probe.state.__szFrames!.length).toBe(40)
  expect(probe.state.__szCausal.shown).toEqual([])
  expect(() =>
    causalLatencies(probe.state.__szCausal.inputs, probe.state.__szCausal.shown),
  ).toThrow('Missing')
})
test('real sampler: 500ms-delayed effect stays above 100ms despite unrelated 60Hz frames', () => {
  const probe = sampler()
  probe.input()
  for (let i = 1; i <= 30; i++) probe.frame(i * 16.667)
  probe.show(1, 1)
  probe.frame(516)
  expect(probe.state.__szCausal.shown).toEqual([])
  probe.frame(533)
  expect(causalLatencies(probe.state.__szCausal.inputs, probe.state.__szCausal.shown)).toEqual([
    533,
  ])
})
for (const [id, key] of [
  [2, 1],
  [1, 3],
] as const)
  test(`real sampler refuses future sequence or key mismatch: ${id}/${key}`, () => {
    const probe = sampler()
    probe.input()
    probe.show(id, key)
    probe.frame(16)
    expect(probe.state.__szCausal.failure).toBe('Causal sequence/key mismatch')
    expect(probe.state.__szCausal.shown).toEqual([])
  })
test('real sampler: untrusted/repeated inputs and stale generation cannot complete a witness', () => {
  const probe = sampler()
  probe.input('ArrowLeft', false)
  probe.input('ArrowLeft', true, true)
  expect(probe.state.__szCausal.inputs).toEqual([])
  probe.input()
  probe.show(1, 1)
  probe.frame(16)
  probe.state.__szCausal = { generation: 'new-frame', inputs: [], shown: [], pending: false }
  probe.frame(32)
  expect(probe.state.__szCausal.shown).toEqual([])
})

test('real generation installer requires fresh zero pixels and refuses reuse of old frame IDs', () => {
  const state: Record<string, unknown> = {}
  let pixel = new Uint8ClampedArray([0, 0, 0, 255])
  const install = () =>
    runInNewContext(`(${installCausalGeneration.toString()})()`, {
      globalThis: state,
      document: {
        querySelector: () => ({ getContext: () => ({ getImageData: () => ({ data: pixel }) }) }),
      },
      crypto: { randomUUID: () => 'fresh-frame' },
    })
  install()
  expect(state.__szCausal).toMatchObject({ generation: 'fresh-frame', inputs: [], shown: [] })
  expect(install).toThrow('already initialized')
  delete state.__szCausal
  pixel = new Uint8ClampedArray([1, 0, 1, 255])
  expect(install).toThrow('no fresh zero token')
  expect(state.__szCausal).toBeUndefined()
})
