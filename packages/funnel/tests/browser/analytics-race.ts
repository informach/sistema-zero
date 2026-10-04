/** First quiz visit: the lead is created while analytical bootstrap is still in flight. */
import assert from 'node:assert/strict'
import { type Cookie, chromium } from 'playwright'
import postgres from 'postgres'

const base = process.env.ANALYTICS_CAPTURE_URL || 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
let leadId: string | undefined
let leadCookie: Cookie | undefined
let releaseBootstrap!: () => void
const leadCreated = new Promise<void>((resolve) => {
  releaseBootstrap = resolve
})
let restoreLeadCookie!: () => void
const leadCookieBack = new Promise<void>((resolve) => {
  restoreLeadCookie = resolve
})
const links = async () =>
  (
    await sql`select count(*)::int count from funil.analytics_lead_links where lead_id=${leadId!}`
  )[0]?.count
try {
  const page = await context.newPage()
  await page.route('**/api/analytics/session', async (route) => {
    await leadCreated
    // Overlapping first visit: the bootstrap leaves without the lead cookie. Chromium attaches
    // cookies when the request is sent, so the cookie must really be absent (a header override
    // is ignored). If it still reached the server, the assertion below fails instead of passing.
    leadCookie = (await context.cookies()).find((c) => c.name === 'funil_lead')
    await context.clearCookies({ name: 'funil_lead' })
    await route.continue()
  })
  // The first batch can only leave once both cookies exist, as in the real race.
  await page.route('**/api/analytics/events', async (route) => {
    await leadCookieBack
    await route.continue()
  })
  const created = page.waitForResponse((r) => r.url().endsWith('/api/leads') && r.ok())
  const opened = page.waitForResponse((r) => r.url().endsWith('/api/analytics/session'))
  const measured = page.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.ok())
  await page.goto(`${base}/kids/comunidade-dos-criadores/quiz?utm_source=qa_bootstrap_race`)
  await page.locator('.cq-intro button.kof-btn').click()
  leadId = (await (await created).json()).id
  assert.ok(leadId)
  assert.equal(await links(), 0, 'Lead creation did not have an analytical cookie')
  releaseBootstrap()
  assert.equal((await opened).status(), 200)
  assert.ok(leadCookie, 'The quiz created the lead cookie before the bootstrap left')
  assert.equal(await links(), 0, 'The bootstrap did not see the lead: only the batch can link it')
  await context.addCookies([leadCookie!])
  restoreLeadCookie()
  await measured
  const [after] = await sql`
    select a.session_id, s.attribution->>'utmSource' source
    from funil.analytics_lead_links a join funil.analytics_sessions s on s.id=a.session_id
    where a.lead_id=${leadId}`
  assert.ok(after?.session_id, 'The first valid batch repairs the link in PostgreSQL')
  assert.equal(after?.source, 'qa_bootstrap_race')
  console.log(
    'Passed: first quiz visit with delayed bootstrap preserves lead and acquisition source in PostgreSQL',
  )
} finally {
  releaseBootstrap()
  restoreLeadCookie()
  await context.request
    .post(`${base}/api/analytics/consent`, {
      headers: { origin: base },
      data: { choice: 'rejected' },
    })
    .catch(() => {})
  await browser.close()
  if (leadId) await sql`delete from funil.leads where id=${leadId} and email is null`
  await sql.end()
}
