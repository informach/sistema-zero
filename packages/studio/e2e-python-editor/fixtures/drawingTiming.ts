import type { Page } from '@playwright/test'

export interface DrawingTimestamp {
  at: number
  pixel: [number, number, number, number]
}
export interface RunClickClock {
  studioRunClickedAt?: number
}
declare global {
  var studioDrawingTimestamp: DrawingTimestamp | undefined
}

/** Read-only QA instrumentation installed before each execution frame's scripts. */
export async function installDrawingTiming(page: Page) {
  await page.addInitScript(() => {
    if (!location.pathname.endsWith('/frame.html')) {
      if (window === window.top)
        document.addEventListener(
          'click',
          (event) => {
            if (!event.isTrusted || !(event.target instanceof Element)) return
            const label = event.target.closest('button')?.textContent?.trim()
            if (label !== 'Executar' && label !== 'Reiniciar') return
            const clock = globalThis as typeof globalThis & RunClickClock
            clock.studioRunClickedAt = performance.timeOrigin + event.timeStamp
            performance.mark('studio-python-execute-click')
          },
          { capture: true },
        )
      return
    }
    const deadline = performance.now() + 30000
    function sample() {
      if (performance.now() > deadline) return
      const canvas = document.querySelector('canvas')
      const context = canvas?.getContext('2d')
      if (canvas && context) {
        const data = context.getImageData(
          Math.floor(canvas.width / 2) + 25,
          Math.floor(canvas.height / 2),
          1,
          1,
        ).data
        const pixel: [number, number, number, number] = [data[0]!, data[1]!, data[2]!, data[3]!]
        const red = pixel[0] > 200 && pixel[1] < 80 && pixel[2] < 80
        const black = pixel[0] < 80 && pixel[1] < 80 && pixel[2] < 80
        if (pixel[3] === 255 && (red || black)) {
          globalThis.studioDrawingTimestamp = {
            at: performance.timeOrigin + performance.now(),
            pixel,
          }
          performance.mark('studio-python-first-useful-pixels')
          return
        }
      }
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  })
}
