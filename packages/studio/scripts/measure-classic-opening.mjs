import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { chromium } from 'playwright-core'

// Same machine, browser, viewport and fixture for both builds. Never production URLs.
const arms = (process.env.SZ_CLASSIC_OPEN_URLS ?? 'current=http://127.0.0.1:5301')
  .split(',')
  .map((entry) => {
    const separator = entry.indexOf('=')
    const name = entry.slice(0, separator)
    const url = new URL(entry.slice(separator + 1))
    if (
      !/^[a-z0-9_-]+$/i.test(name) ||
      !['http:', 'https:'].includes(url.protocol) ||
      !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    )
      throw new Error('Opening measurements require named local QA servers')
    return { name, url }
  })
const sizes = (process.env.SZ_CLASSIC_OPEN_SIZES ?? '2000,5000,10000').split(',').map(Number)
const repeats = Number(process.env.SZ_CLASSIC_OPEN_REPEATS ?? 3)
if (
  !Number.isSafeInteger(repeats) ||
  repeats < 1 ||
  repeats > 20 ||
  sizes.some((size) => !Number.isSafeInteger(size) || size < 1 || size > 10000)
)
  throw new Error('Invalid bounded measurement parameters')
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}),
})
const report = {
  environment: {
    platform: process.platform,
    node: process.version,
    browser: browser.version(),
    cpu: os.cpus()[0]?.model,
    logicalCpus: os.cpus().length,
    memoryBytes: os.totalmem(),
    viewport: { width: 1440, height: 900 },
  },
  method:
    'Fresh context per sample; alternating build order; same Farol stress fixture. Timer intervals are scheduling observations, not input latency or FPS. No game profiler.',
  samples: [],
}
try {
  for (const size of sizes) {
    for (let repeat = 0; repeat < repeats; repeat++) {
      const order = repeat % 2 ? [...arms].reverse() : arms
      for (const arm of order) {
        const context = await browser.newContext({ viewport: report.environment.viewport })
        const page = await context.newPage()
        const profiler =
          process.env.SZ_CLASSIC_OPEN_CPU_PROFILE === '1' ? await context.newCDPSession(page) : null
        if (profiler) {
          await profiler.send('Profiler.enable')
          await profiler.send('Profiler.start')
        }
        await page.addInitScript(() => {
          const gaps = [],
            longTasks = []
          let last = performance.now()
          const timer = setInterval(() => {
            const now = performance.now()
            gaps.push(now - last)
            last = now
          }, 20)
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) longTasks.push(entry.duration)
          })
          observer.observe({ type: 'longtask' })
          window.__openingMeasurement = () => {
            gaps.push(performance.now() - last)
            for (const entry of observer.takeRecords()) longTasks.push(entry.duration)
            clearInterval(timer)
            observer.disconnect()
            const summary = (values) => {
              const sorted = values.sort((a, b) => a - b)
              return {
                count: sorted.length,
                p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
                p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0,
                max: sorted.at(-1) ?? 0,
                total: sorted.reduce((sum, value) => sum + value, 0),
              }
            }
            return {
              readyMs: performance.now(),
              timerGapsMs: summary(gaps),
              longTasksMs: summary(longTasks),
            }
          }
        })
        try {
          const url = new URL('/aula', arm.url)
          url.searchParams.set('aula', 'desafio-primeiro-jogo/desafio-dia-3')
          url.searchParams.set('escala', String(size))
          await page.goto(url.href)
          await page
            .locator('.blocklyBlockCanvas .blocklyEditableField')
            .filter({ hasText: /^480$/ })
            .first()
            .waitFor({ state: 'visible', timeout: 120_000 })
          await page.waitForFunction(() => !document.querySelector('[data-aula-bloco] [inert]'))
          const measured = await page.evaluate(() => window.__openingMeasurement())
          // "Aberto" de verdade (19/11/2026): o campo pronto pode aparecer antes de o resto
          // ser desenhado. `settledMs` espera a contagem de blocos desenhados ficar parada por
          // 1 s, a mesma régua do `e2e/classic-scale.spec.ts`; os dois números vão juntos.
          const settled = await page.evaluate(async () => {
            const count = () => document.querySelectorAll('.blocklyDraggable').length
            let last = count()
            let stableSince = performance.now()
            while (performance.now() - stableSince < 1000) {
              await new Promise((resolve) => setTimeout(resolve, 100))
              const now = count()
              if (now !== last) {
                last = now
                stableSince = performance.now()
              }
            }
            return { settledMs: stableSince, drawnBlocks: last }
          })
          const sample = {
            arm: arm.name,
            size,
            repeat,
            cpuProfileEnabled: Boolean(profiler),
            ...measured,
            ...settled,
          }
          report.samples.push(sample)
          console.log(JSON.stringify(sample))
        } catch (error) {
          report.samples.push({ arm: arm.name, size, repeat, error: String(error) })
          process.exitCode = 1
        } finally {
          if (profiler) {
            const { profile } = await profiler.send('Profiler.stop')
            await mkdir('.cache/mission', { recursive: true })
            await writeFile(
              `.cache/mission/opening-${arm.name}-${size}-${repeat}.cpuprofile`,
              JSON.stringify(profile),
            )
            await profiler.detach()
          }
          await context.close()
          await mkdir('.cache/mission', { recursive: true })
          await writeFile(
            '.cache/mission/classic-opening-comparison.json',
            JSON.stringify(report, null, 2),
          )
        }
      }
    }
  }
} finally {
  await browser.close()
}
