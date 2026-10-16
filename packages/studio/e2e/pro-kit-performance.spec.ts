import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { STUDIO_PRO_TEMPLATES } from '@sistemazero/core/studio'
import { materializeTestTemplate } from '../../studio-runtime/tests/template-files'
import { createTestProArtifact } from './helpers/proArtifact'

interface PerfState {
  active: boolean
  last: number
  intervals: number[]
  work: number[]
}
interface Inspect {
  phase: string
  render?: { drawCalls: number; triangles: number; geometries: number; textures: number }
}
interface TestWindow {
  kitPerf: PerfState
  __studioGame: { inspect(): Inspect }
}

for (const template of STUDIO_PRO_TEMPLATES.filter((value) => value.kitVersion)) {
  test(`${template.id}: 60 second frame sample per quality and twenty restart cycles`, async ({
    page,
  }, info) => {
    test.skip(process.env.STUDIO_KIT_PERF !== '1', 'Explicit lab run; not part of short UI smoke.')
    test.setTimeout(160_000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
      const target = window as unknown as TestWindow
      target.kitPerf = { active: false, last: 0, intervals: [], work: [] }
      const raf = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (callback) =>
        raf((now) => {
          const sample = target.kitPerf,
            playing = target.__studioGame?.inspect().phase === 'playing'
          if (sample.active && playing && sample.last && now !== sample.last)
            sample.intervals.push(now - sample.last)
          sample.last = playing ? now : 0
          const start = performance.now()
          callback(now)
          if (target.__studioGame?.inspect().phase !== 'playing') sample.last = 0
          if (sample.active && playing) sample.work.push(performance.now() - start)
        })
    })
    const { allFiles: files } = await materializeTestTemplate(template.id)
    const artifact = await createTestProArtifact(page, files, template.id)
    try {
      await page.setViewportSize({ width: 1200, height: 800 })
      await page.locator('#game').evaluate((node) => {
        Object.assign((node as HTMLElement).style, {
          width: '1024px',
          height: '640px',
          border: '0',
        })
      })
      const frame = page.frameLocator('#game')
      await expect(frame.locator('#start')).toBeEnabled()
      const samples = []
      for (const reduced of [false, true]) {
        if (reduced) await frame.getByRole('button', { name: 'Efeitos: completos' }).click()
        await frame.locator('#start').click()
        const sample = await frame.locator('body').evaluate(async (_, reduced) => {
          const target = window as unknown as TestWindow
          const stats = target.kitPerf
          const reset = () => document.querySelector<HTMLButtonElement>('#restart')!.click()
          let direction = false
          const inputs = setInterval(() => {
            if (target.__studioGame.inspect().phase !== 'playing') reset()
            const previous = direction ? 'ArrowRight' : 'ArrowLeft'
            direction = !direction
            window.dispatchEvent(new KeyboardEvent('keyup', { code: previous }))
            window.dispatchEvent(
              new KeyboardEvent('keydown', { code: direction ? 'ArrowRight' : 'ArrowLeft' }),
            )
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
          }, 1_000)
          await new Promise((resolve) => setTimeout(resolve, 2_000))
          stats.last = 0
          stats.intervals = []
          stats.work = []
          stats.active = true
          await new Promise((resolve) => setTimeout(resolve, 60_000))
          stats.active = false
          clearInterval(inputs)
          for (const code of ['ArrowLeft', 'ArrowRight', 'Space'])
            window.dispatchEvent(new KeyboardEvent('keyup', { code }))
          const inspect = target.__studioGame.inspect()
          const resourcesBefore = inspect.render
          for (let cycle = 0; cycle < 20; cycle++) {
            reset()
            await new Promise((resolve) => setTimeout(resolve, 50))
          }
          const resourcesAfter = target.__studioGame.inspect().render
          document.querySelector<HTMLButtonElement>('#pause')!.click()
          const quantiles = (values: number[]) => {
            const sorted = [...values].sort((a, b) => a - b)
            return {
              count: sorted.length,
              p50: sorted[Math.floor(sorted.length * 0.5)],
              p95: sorted[Math.floor(sorted.length * 0.95)],
              max: sorted.at(-1),
            }
          }
          const canvas = document.querySelector('canvas')!,
            gl = canvas.getContext('webgl2')
          const debug = gl?.getExtension('WEBGL_debug_renderer_info')
          return {
            reduced,
            intervals: quantiles(stats.intervals),
            cpuFrameWork: quantiles(stats.work),
            resourcesBefore,
            resourcesAfter,
            environment: {
              userAgent: navigator.userAgent,
              logicalProcessors: navigator.hardwareConcurrency,
              viewport: [innerWidth, innerHeight],
              dpr: devicePixelRatio,
              renderer: debug
                ? gl!.getParameter(debug.UNMASKED_RENDERER_WEBGL)
                : 'Canvas2D or unavailable',
            },
          }
        }, reduced)
        samples.push(sample)
        expect(sample.environment.viewport).toEqual([1024, 640])
        expect(sample.intervals.count).toBeGreaterThan(500)
        // Lab regressions, not a claim about physical mobile GPUs. SwiftShader
        // is recorded below; CPU work and frame pacing have separate budgets.
        expect(sample.cpuFrameWork.p95).toBeLessThan(8)
        expect(sample.intervals.p95).toBeLessThan(50)
        if (sample.resourcesBefore && sample.resourcesAfter) {
          expect(sample.resourcesAfter.geometries).toBe(sample.resourcesBefore.geometries)
          expect(sample.resourcesAfter.textures).toBe(sample.resourcesBefore.textures)
        }
      }
      expect(errors).toEqual([])
      const path = fileURLToPath(new URL('../.cache/studio-kit-performance/', import.meta.url))
      await mkdir(path, { recursive: true })
      const evidence = {
        template: template.id,
        measuredAt: new Date().toISOString(),
        scope:
          'compiled isolated iframe; host editor not loaded; real time; includes bounded synthetic input and restarts',
        samples,
      }
      await writeFile(`${path}/${template.id}.json`, JSON.stringify(evidence, null, 2))
      await info.attach('performance', {
        body: JSON.stringify(evidence, null, 2),
        contentType: 'application/json',
      })
    } finally {
      await artifact.dispose()
    }
  })
}
