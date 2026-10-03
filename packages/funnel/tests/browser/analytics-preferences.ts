import assert from 'node:assert/strict'
import { type BrowserContext, chromium } from 'playwright'

const origin = process.env.ANALYTICS_CAPTURE_URL || 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const browser = await chromium.launch()
const contexts: BrowserContext[] = []
const isCollection = (url: string) =>
  url.includes('/api/analytics/') && !url.endsWith('/api/analytics/consent')
const newContext = async (viewport = { width: 667, height: 375 }) => {
  const context = await browser.newContext({ viewport })
  contexts.push(context)
  return context
}
try {
  const context = await newContext()
  const page = await context.newPage()
  const other = await context.newPage()
  // Session openings count too: a collector restarted by mistake would show up here
  // even if the server refused it before any batch of events.
  let collection = 0
  context.on('request', (request) => {
    if (isCollection(request.url())) collection++
  })
  const first = page.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.ok())
  await page.goto(`${origin}/?utm_source=qa_preferences`)
  await first
  const second = other.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.ok())
  await other.goto(`${origin}/`)
  await second
  await context.route('**/api/analytics/consent', (route) => route.abort('failed'))
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click()
  await page.getByRole('button', { name: 'Desativar métricas' }).click()
  const error = page.locator('#sz-metrics-error')
  await error.waitFor({ state: 'visible' })
  assert.match((await error.textContent()) ?? '', /exclusão dos dados será tentada novamente/)
  assert.equal(
    (await context.cookies()).find((c) => c.name === 'sz_metrics')?.value,
    'rejected',
    'A failed request must not undo the explicit local preference',
  )
  await page.waitForTimeout(500)
  const disabledAt = collection
  await other.getByRole('button', { name: 'Privacidade', exact: true }).click()
  assert.match(
    (await other.locator('#sz-metrics-state').textContent()) ?? '',
    /desativadas.*pendente/,
    'The other tab knows collection is off and deletion is pending',
  )
  await other.getByRole('button', { name: 'Fechar' }).click()
  await other.evaluate(() =>
    document.querySelector('a')?.dispatchEvent(new MouseEvent('click', { bubbles: true })),
  )
  await page.reload()
  await page.waitForTimeout(5500)
  assert.equal(
    collection,
    disabledAt,
    'Both tabs and reload stay disabled while deletion is pending',
  )
  await context.unroute('**/api/analytics/consent')
  const retried = page.waitForResponse((r) => r.url().endsWith('/api/analytics/consent') && r.ok())
  await page.reload()
  await retried
  const afterRetry = await context.cookies()
  assert.ok(
    !afterRetry.some((c) => c.name === 'sz_visitor' || c.name === 'sz_metrics_cleanup'),
    'Pending deletion is retried after reload',
  )
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click()
  const bounds = await page.locator('#sz-metrics-notice').boundingBox()
  assert.ok(
    bounds && bounds.y >= 0 && bounds.y + bounds.height <= 375,
    'Preferences fit a short mobile screen',
  )
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent),
    'Ativar métricas',
    'Opening the panel moves focus into it',
  )
  const resumed = page.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.ok())
  await page.getByRole('button', { name: 'Ativar métricas' }).click()
  await resumed
  await page.locator('#sz-metrics-notice').waitFor({ state: 'hidden' })
  assert.equal(
    await page.evaluate(() => document.activeElement?.id),
    'sz-metrics-manage',
    'Closing after a choice returns focus to the Privacidade button',
  )

  // Safari before 16 has no AbortSignal.timeout: collection, deletion and reactivation still work.
  // Init scripts go as text: tsx wraps inner functions in __name(), which does not exist
  // in the page, and the script would fail silently.
  const legacy = await newContext({ width: 390, height: 844 })
  await legacy.addInitScript({ content: 'delete AbortSignal.timeout' })
  const old = await legacy.newPage()
  const oldFirst = old.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.ok())
  await old.goto(`${origin}/`)
  assert.equal(await old.evaluate('typeof AbortSignal.timeout'), 'undefined')
  await oldFirst
  const deleted = old.waitForResponse((r) => r.url().endsWith('/api/analytics/consent'))
  await old.getByRole('button', { name: 'Privacidade', exact: true }).click()
  await old.getByRole('button', { name: 'Desativar métricas' }).click()
  assert.equal((await deleted).status(), 200)
  await old.locator('#sz-metrics-notice').waitFor({ state: 'hidden' })
  const oldCookies = await legacy.cookies()
  assert.ok(!oldCookies.some((c) => c.name === 'sz_visitor' || c.name === 'sz_metrics_cleanup'))
  const oldResumed = old.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.ok())
  await old.getByRole('button', { name: 'Privacidade', exact: true }).click()
  await old.getByRole('button', { name: 'Ativar métricas' }).click()
  await oldResumed

  // Cookies blocked: no visitor can stick, so nothing is collected (no session loop).
  const blocked = await newContext({ width: 390, height: 844 })
  await blocked.addInitScript({
    content: "Object.defineProperty(Navigator.prototype, 'cookieEnabled', { get: () => false })",
  })
  let blockedCollection = 0
  blocked.on('request', (request) => {
    if (isCollection(request.url())) blockedCollection++
  })
  const noCookies = await blocked.newPage()
  await noCookies.goto(`${origin}/`)
  assert.equal(await noCookies.evaluate('navigator.cookieEnabled'), false)
  await noCookies.waitForTimeout(6000)
  assert.equal(blockedCollection, 0, 'Without cookies the collector never starts')
  await noCookies.getByRole('button', { name: 'Privacidade', exact: true }).click()
  assert.match(
    (await noCookies.locator('#sz-metrics-state').textContent()) ?? '',
    /bloqueia cookies/,
  )
  assert.equal(await noCookies.locator('[data-choice]:visible').count(), 0)

  console.log(
    JSON.stringify({
      result: 'passed',
      scenarios: [
        'offline preference',
        'two tabs',
        'reload',
        'deletion retry',
        'mobile landscape',
        'focus',
        'reactivation',
        'Safari without AbortSignal.timeout',
        'cookies blocked',
      ],
    }),
  )
} finally {
  for (const context of contexts) {
    await context.request
      .post(`${origin}/api/analytics/consent`, {
        headers: { origin },
        data: { choice: 'rejected' },
      })
      .catch(() => {})
  }
  await browser.close()
}
