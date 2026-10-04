import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.ANALYTICS_CAPTURE_URL || 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
const browser = await chromium.launch()
try {
  const context = await browser.newContext()
  await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: base }])
  const page = await context.newPage()
  let attempts = 0
  await page.route('**/api/leads', (route) => {
    if (route.request().method() === 'POST' && attempts++ === 0)
      return route.fulfill({
        status: 503,
        json: { error: { code: 'UNAVAILABLE', message: 'Temporary QA failure' } },
      })
    return route.continue()
  })
  await page.goto(`${base}/pro/no-comando-da-ia/quiz`)
  const retry = page.getByRole('button', { name: 'Tentar novamente', exact: true })
  await retry.waitFor({ timeout: 10000 })
  assert.equal(await page.locator('[data-analytics-question]').count(), 0)
  await retry.click()
  await page.locator('[data-analytics-question][data-analytics-attempt]').waitFor()
  assert.equal(attempts, 2)
  console.log('Quiz bootstrap recovers after network failure before displaying questions')
} finally {
  await browser.close()
}
