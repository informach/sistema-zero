import type { CDPSession, Frame, Page } from '@playwright/test'
import { z } from 'zod'

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
  await page.addInitScript(() => {
    const target = globalThis as typeof globalThis & {
      __szPaints?: number[]
      __szFrames?: number[]
      __szLongTasks?: number[]
      __szInputs?: number[]
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
          if (target.__szPaints!.length < 200_000)
            target.__szPaints!.push(performance.now() - start)
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
    }
    window.addEventListener('keydown', input, { capture: true })
    window.addEventListener('pointerdown', input, { capture: true })
  })
}

export async function resetPresentation(frame: Frame) {
  await frame.evaluate(() => {
    const target = globalThis as typeof globalThis & Record<string, unknown[]>
    for (const key of ['__szPaints', '__szFrames', '__szLongTasks', '__szInputs'])
      target[key]!.length = 0
  })
}

/** Frame intervals, paint cost, long tasks and input → second presented frame (upper bound
 * that includes one whole program tick, because the first frame may predate the handled input). */
export async function readPresentation(frame: Frame) {
  const samples = await frame.evaluate(() => {
    const target = globalThis as typeof globalThis & Record<string, number[]>
    return {
      paints: [...target.__szPaints!],
      frames: [...target.__szFrames!],
      longTasks: [...target.__szLongTasks!],
      inputs: [...target.__szInputs!],
    }
  })
  const intervals = samples.frames.slice(1).map((time, i) => time - samples.frames[i]!)
  const latency = samples.inputs.flatMap((input) => {
    const second = samples.frames.filter((time) => time >= input)[1]
    return second === undefined ? [] : [second - input]
  })
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
    inputToSecondPresentedFrame: quantiles(latency),
  }
}
