import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.ANALYTICS_CAPTURE_URL || 'http://localhost:4321'
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(base).hostname),
  'Performance checks run locally',
)
const browser = await chromium.launch()
const measurements: Array<{
  path: string
  consent: string
  lcp: number
  cls: number
  longTasks: number
  blockingMs: number
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
          await cdp.send('Network.enable')
          await cdp.send('Network.emulateNetworkConditions', {
            offline: false,
            latency: 150,
            downloadThroughput: 1_600_000 / 8,
            uploadThroughput: 750_000 / 8,
            connectionType: 'cellular4g',
          })
          let analyticsRequests = 0
          page.on('request', (request) => {
            if (request.url().includes('/api/analytics/')) analyticsRequests++
          })
          await page.addInitScript(() => {
            const metrics = { lcp: 0, cls: 0, longTasks: 0, blockingMs: 0 }
            let windowStart = 0
            let lastShift = 0
            let windowValue = 0
            Object.assign(window, { qaMetrics: metrics })
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) metrics.lcp = entry.startTime
            }).observe({ type: 'largest-contentful-paint', buffered: true })
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries()) {
                const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }
                if (!shift.hadRecentInput) {
                  if (shift.startTime - lastShift > 1000 || shift.startTime - windowStart > 5000) {
                    windowStart = shift.startTime
                    windowValue = 0
                  }
                  lastShift = shift.startTime
                  windowValue += shift.value
                  metrics.cls = Math.max(metrics.cls, windowValue)
                }
              }
            }).observe({ type: 'layout-shift', buffered: true })
            new PerformanceObserver((list) => {
              metrics.longTasks += list.getEntries().length
              for (const entry of list.getEntries())
                metrics.blockingMs += Math.max(0, entry.duration - 50)
            }).observe({ type: 'longtask', buffered: true })
          })
          await page.goto(`${base}${path}`)
          await page.waitForTimeout(2000)
          const metrics = await page.evaluate<{
            lcp: number
            cls: number
            longTasks: number
            blockingMs: number
          }>('window.qaMetrics')
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
        blockingMsMedian: Math.round(median(rows.map((row) => row.blockingMs))),
      }
    }),
  )
  await mkdir('output/analytics', { recursive: true })
  await writeFile(
    'output/analytics/performance-mobile.json',
    `${JSON.stringify(
      {
        conditions:
          'Local built server; Chromium; 390x844; CPU 4x; 1.6Mbps down / 750Kbps up / 150ms latency; 3 runs per condition; empty browser cache',
        summary,
        measurements,
      },
      null,
      2,
    )}\n`,
  )
  console.log(JSON.stringify(summary))
  for (const row of summary) {
    assert.ok(
      row.lcpMedianMs > 0 && row.lcpMedianMs <= 2500,
      `LCP budget: ${row.path} ${row.consent}`,
    )
    assert.ok(row.clsMedian <= 0.1, `CLS budget: ${row.path} ${row.consent}`)
    assert.ok(row.blockingMsMedian <= 200, `Main-thread budget: ${row.path} ${row.consent}`)
  }
} finally {
  await browser.close()
}
