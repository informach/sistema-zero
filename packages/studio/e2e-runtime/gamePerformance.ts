import type { CDPSession, Frame, Page } from '@playwright/test'
import { z } from 'zod'
import { type CausalInput, type CausalPresentation, causalLatencies } from './performanceAcceptance'

interface CausalState {
  generation: string
  inputs: CausalInput[]
  shown: CausalPresentation[]
  pending: boolean
  failure?: string
}

// Shared measurement for the performance contract (docs/plans/2026-10-16-estudio-python-desempenho.md).
// Presented frames are browser frames in which the Turtle canvas was repainted since the previous
// frame, whether the renderer painted in an animation frame or right away (Tk-like update()).

export const TWO_DISPLAY_FRAMES_MS = (2 * 1000) / 60 + 1

export const ProviderState = z.object({
  status: z.string(),
  events: z.array(z.object({ type: z.string(), text: z.string().optional() })),
})

export async function evaluate(cdp: CDPSession, expression: string): Promise<unknown> {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: false,
  })
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
  return result.result.value
}

export const providerState = async (cdp: CDPSession, slot = 'audio') =>
  ProviderState.parse(await evaluate(cdp, `globalThis.providerProbe.read('${slot}')`))

export function quantiles(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const at = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)] ?? 0
  return { count: sorted.length, median: at(0.5), p95: at(0.95), max: sorted.at(-1) ?? 0 }
}

/** Installs presented-frame, paint-cost, long-task and trusted-input probes in every frame. */
export async function instrumentPresentation(page: Page) {
  await page.addInitScript(installPresentationProbe)
}

/** Serialized into the protected frame; kept closed over browser globals only. */
export function installPresentationProbe() {
  const target = globalThis as typeof globalThis & {
    __szPaints?: number[]
    __szFrames?: number[]
    __szLongTasks?: number[]
    __szInputs?: number[]
    __szCausal?: CausalState
  }
  target.__szPaints = []
  target.__szFrames = []
  target.__szLongTasks = []
  target.__szInputs = []
  const raf = window.requestAnimationFrame.bind(window)
  let inAnimationFrame = false
  window.requestAnimationFrame = (callback) =>
    raf((time) => {
      const start = performance.now()
      inAnimationFrame = true
      try {
        callback(time)
      } finally {
        inAnimationFrame = false
        if (target.__szPaints!.length < 200_000) target.__szPaints!.push(performance.now() - start)
      }
    })
  let painted = false
  let immediatePaintStart: number | undefined
  const clear = CanvasRenderingContext2D.prototype.clearRect
  CanvasRenderingContext2D.prototype.clearRect = function (...args) {
    painted = true
    // A paint outside an animation frame (Tk-like update()) runs synchronously in the
    // current task; the first microtask after it closes the paint slice.
    if (!inAnimationFrame && immediatePaintStart === undefined) {
      immediatePaintStart = performance.now()
      queueMicrotask(() => {
        if (target.__szPaints!.length < 200_000)
          target.__szPaints!.push(performance.now() - immediatePaintStart!)
        immediatePaintStart = undefined
      })
    }
    return clear.apply(this, args)
  }
  const observe = () =>
    raf((time) => {
      if (painted && target.__szFrames!.length < 200_000) target.__szFrames!.push(time)
      painted = false
      const causal = target.__szCausal
      const canvas = document.querySelector('canvas')
      if (causal && !causal.pending && !causal.failure && canvas) {
        const pixel = canvas.getContext('2d')?.getImageData(10, 10, 1, 1).data
        const id = pixel ? pixel[0]! + pixel[1]! * 256 : 0
        const codes: Record<string, number> = { Left: 1, Right: 2, Up: 3, click: 4 }
        const expected = causal.inputs[causal.shown.length]
        if (id && expected && id >= expected.id) {
          if (!pixel || id !== expected.id || pixel[2] !== codes[expected.key] || pixel[3] !== 255)
            causal.failure = 'Causal sequence/key mismatch'
          else {
            causal.pending = true
            const observedAt = performance.now()
            // One subsequent display opportunity, with the same code still present.
            // This measures a presented QA pixel witness, not GPU scanout timing.
            raf(() => {
              if (target.__szCausal !== causal) return
              const next = canvas.getContext('2d')?.getImageData(10, 10, 1, 1).data
              if (!next || next.some((value, index) => value !== pixel![index]))
                causal.failure = 'Causal witness changed before presentation'
              else causal.shown.push({ id, key: expected.key, observedAt, at: performance.now() })
              causal.pending = false
            })
          }
        }
      }
      observe()
    })
  observe()
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) target.__szLongTasks!.push(entry.duration)
    }).observe({ type: 'longtask', buffered: false })
  } catch {}
  const input = (event: Event) => {
    if (event.isTrusted && !(event as KeyboardEvent).repeat)
      target.__szInputs!.push(event.timeStamp)
    const causal = target.__szCausal
    if (!causal || !event.isTrusted || !(event.target instanceof HTMLCanvasElement)) return
    if (event.type === 'keydown' && (event as KeyboardEvent).repeat) return
    const names: Record<string, string> = {
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      ArrowUp: 'Up',
    }
    const key = event.type === 'pointerdown' ? 'click' : names[(event as KeyboardEvent).key]
    if (!key) {
      causal.failure = 'Unexpected causal input'
      return
    }
    if (causal.inputs.length >= 30) {
      causal.failure = 'Too many causal inputs'
      return
    }
    causal.inputs.push({ id: causal.inputs.length + 1, key, at: event.timeStamp })
  }
  window.addEventListener('keydown', input, { capture: true })
  window.addEventListener('pointerdown', input, { capture: true })
}

export async function enableCausalPresentation(frame: Frame) {
  await frame.evaluate(installCausalGeneration)
}

/** One generation per fresh protected frame, never a reset of old IDs/pixels. */
export function installCausalGeneration() {
  const target = globalThis as typeof globalThis & { __szCausal?: CausalState }
  if (target.__szCausal)
    throw new Error('Causal generation already initialized; fresh frame required')
  const pixel = document.querySelector('canvas')?.getContext('2d')?.getImageData(10, 10, 1, 1).data
  if (pixel?.[0] !== 0 || pixel[1] !== 0 || pixel[2] !== 0 || pixel[3] !== 255)
    throw new Error('Causal frame has no fresh zero token')
  target.__szCausal = { generation: crypto.randomUUID(), inputs: [], shown: [], pending: false }
}

export async function resetPresentation(frame: Frame) {
  await frame.evaluate(() => {
    const target = globalThis as typeof globalThis & Record<string, unknown[]>
    for (const key of ['__szPaints', '__szFrames', '__szLongTasks', '__szInputs'])
      target[key]!.length = 0
  })
}

/** Cadence is independent of input latency. Only the QA causal pixel witness supplies latency. */
export async function readPresentation(frame: Frame) {
  const samples = await frame.evaluate(() => {
    const target = globalThis as typeof globalThis &
      Record<string, number[]> & { __szCausal?: CausalState }
    return {
      paints: [...target.__szPaints!],
      frames: [...target.__szFrames!],
      longTasks: [...target.__szLongTasks!],
      inputs: [...target.__szInputs!],
      causal: target.__szCausal,
    }
  })
  const intervals = samples.frames.slice(1).map((time, i) => time - samples.frames[i]!)
  let causalFailure = samples.causal?.failure
  let latency: number[] = []
  if (samples.causal && !causalFailure) {
    try {
      latency = causalLatencies(samples.causal.inputs, samples.causal.shown)
    } catch {
      causalFailure = 'Missing or invalid causal presentation'
    }
  }
  const buckets = { oneFrame: 0, twoFrames: 0, more: 0 }
  for (const value of intervals) {
    if (value <= 1000 / 60 + 1) buckets.oneFrame++
    else if (value <= TWO_DISPLAY_FRAMES_MS) buckets.twoFrames++
    else buckets.more++
  }
  return {
    intervals: quantiles(intervals),
    frameBuckets: buckets,
    paintWork: quantiles(samples.paints),
    longPaints: samples.paints.filter((value) => value > 50).length,
    longTasks: samples.longTasks.length,
    inputs: samples.inputs.length,
    causalInputToPresentation: quantiles(latency),
    causalFailure,
    causalEvidence: samples.causal,
  }
}
