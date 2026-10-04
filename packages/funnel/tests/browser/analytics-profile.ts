import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const base = process.env.ANALYTICS_CAPTURE_URL || 'http://127.0.0.1:4322'
const path = process.env.QA_PROFILE_PATH || '/como-funciona/'
const automatic = process.env.QA_PROFILE_COLLECTION === 'automatic'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
assert.ok(['/', '/como-funciona/'].includes(path))
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
try {
  if (!automatic) await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: base }])
  const page = await context.newPage()
  if (process.env.QA_PROFILE_CSS)
    await page.route(`${base}${path}`, async (route) => {
      const response = await route.fetch()
      await route.fulfill({
        response,
        body: (await response.text()).replace(
          '</head>',
          `<style>${process.env.QA_PROFILE_CSS}</style></head>`,
        ),
      })
    })
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200000,
    uploadThroughput: 93750,
  })
  await cdp.send('Tracing.start', {
    categories: 'devtools.timeline,blink.user_timing,disabled-by-default-devtools.timeline',
    transferMode: 'ReturnAsStream',
  })
  await page.goto(`${base}${path}`)
  await page.waitForTimeout(2000)
  const done = new Promise<{ stream?: string }>((resolve) =>
    cdp.once('Tracing.tracingComplete', resolve),
  )
  await cdp.send('Tracing.end')
  const { stream } = await done
  assert.ok(stream, 'Chrome must return the performance trace stream')
  let trace = ''
  for (;;) {
    const part = await cdp.send('IO.read', { handle: stream })
    trace += part.base64Encoded ? Buffer.from(part.data, 'base64').toString() : part.data
    if (part.eof) break
  }
  await cdp.send('IO.close', { handle: stream })
  const events = JSON.parse(trace).traceEvents as Array<{
    name: string
    dur?: number
    tid: number
    args?: Record<string, unknown>
  }>
  const main = events
    .filter((e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain')
    .map((e) => e.tid)
  const slow = events
    .filter((e) => main.includes(e.tid) && (e.dur || 0) >= 30000)
    .sort((a, b) => b.dur! - a.dur!)
    .slice(0, 30)
  await mkdir('.tmp', { recursive: true })
  await writeFile(
    `.tmp/analytics-profile${path === '/' ? '-bio' : ''}${automatic ? '-automatic' : ''}${process.env.QA_PROFILE_CSS ? '-experiment' : ''}.json`,
    JSON.stringify(slow, null, 2),
  )
  console.log(JSON.stringify(slow))
} finally {
  await context.request
    .post(`${base}/api/analytics/consent`, {
      headers: { origin: base },
      data: { choice: 'rejected' },
    })
    .catch(() => {})
  await browser.close()
}
