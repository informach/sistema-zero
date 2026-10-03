import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = 'http://localhost:4321'
const browser = await chromium.launch()
const measurements: Array<{
  path: string
  consent: string
  lcp: number
  cls: number
  longTasks: number
  analyticsRequests: number
}> = []
try {
  for (const path of ['/', '/como-funciona/'])
    for (const consent of ['rejected', 'accepted'])
      for (let run = 0; run < 3; run++) {
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
        try {
          await context.addCookies([{ name: 'sz_metrics', value: consent, url: base }])
          const page = await context.newPage()
          const cdp = await context.newCDPSession(page)
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
          let analyticsRequests = 0
          page.on('request', (request) => {
            if (request.url().includes('/api/analytics/')) analyticsRequests++
          })
          await page.addInitScript(() => {
            const metrics = { lcp: 0, cls: 0, longTasks: 0 }
            Object.assign(window, { qaMetrics: metrics })
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) metrics.lcp = entry.startTime
            }).observe({ type: 'largest-contentful-paint', buffered: true })
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
                if (!shift.hadRecentInput) metrics.cls += shift.value
              }
            }).observe({ type: 'layout-shift', buffered: true })
            new PerformanceObserver((list) => {
              metrics.longTasks += list.getEntries().length
            }).observe({ type: 'longtask', buffered: true })
          })
          await page.goto(`${base}${path}`)
          await page.waitForTimeout(2000)
          const metrics = await page.evaluate<{ lcp: number; cls: number; longTasks: number }>(
            'window.qaMetrics',
          )
          measurements.push({ path, consent, ...metrics, analyticsRequests })
          if (consent === 'rejected') assert.equal(analyticsRequests, 0)
          await context.request.post(`${base}/api/analytics/consent`, {
            headers: { origin: base },
            data: { choice: 'rejected' },
          })
        } finally {
          await context.close()
        }
      }
  const median = (values: number[]) =>
    [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!
  const summary = ['/', '/como-funciona/'].flatMap((path) =>
    ['rejected', 'accepted'].map((consent) => {
      const rows = measurements.filter((row) => row.path === path && row.consent === consent)
      return {
        path,
        consent,
        lcpMedianMs: Math.round(median(rows.map((row) => row.lcp))),
        clsMedian: median(rows.map((row) => row.cls)),
        longTasksMedian: median(rows.map((row) => row.longTasks)),
      }
    }),
  )
  await mkdir('output/analytics', { recursive: true })
  await writeFile(
    'output/analytics/performance.json',
    `${JSON.stringify(
      {
        conditions:
          'Local built server; Chromium; 390x844; CPU 4x; no network throttling; 3 runs per condition',
        summary,
        measurements,
      },
      null,
      2,
    )}\n`,
  )
  console.log(JSON.stringify(summary))
} finally {
  await browser.close()
}
