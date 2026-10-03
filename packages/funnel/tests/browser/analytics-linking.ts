/** Actual pre-checkout contact submission and its link to the earlier automatic page visit. */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import postgres from 'postgres'

const base = process.env.ANALYTICS_CAPTURE_URL || 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname))
assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
const sql = postgres(process.env.DATABASE_URL!, { max: 1 })
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: 'reduce',
})
const source = `qa-link-${crypto.randomUUID()}`
const email = `${source}@example.test`
let leadId: string | undefined
try {
  const page = await context.newPage()
  const batches: unknown[] = []
  page.on('request', (req) => {
    if (req.url().endsWith('/api/analytics/events')) batches.push(req.postDataJSON())
  })
  const first = page.waitForResponse((r) => r.url().endsWith('/api/analytics/events') && r.ok())
  await page.goto(`${base}/?utm_source=${source}`)
  const sessionId = (await first).request().postDataJSON().sessionId as string
  assert.equal(await page.locator('#sz-metrics-notice').isVisible(), false)
  assert.ok(!(await context.cookies()).some((c) => c.name === 'sz_metrics'))
  const created = page.waitForResponse((r) => r.url().endsWith('/api/leads') && r.ok())
  await page.getByRole('link', { name: 'Conhecer a Comunidade e os planos' }).click()
  await page.waitForURL('**/kids/comunidade-dos-criadores/oferta**')
  await page
    .locator('astro-island[component-url*="PreCheckoutModal"]:not([ssr])')
    .waitFor({ state: 'attached' })
  await page.locator('[data-checkout-cta]').first().click()
  leadId = ((await (await created).json()) as { id: string }).id
  assert.ok(leadId)
  await page.getByLabel('Nome do responsável', { exact: true }).fill('Responsável QA Métricas')
  await page.getByLabel('E-mail do responsável', { exact: true }).fill(email)
  await page.getByLabel('Telefone do responsável', { exact: true }).fill('31999999999')
  const saved = page.waitForResponse((r) => r.url().endsWith('/api/contact') && r.ok())
  await page.getByRole('button', { name: 'Continuar para o pagamento', exact: true }).click()
  await saved
  await page.waitForURL('**/kids/comunidade-dos-criadores/checkout?**')
  const [link] = await sql`
    select l.email, a.session_id, s.attribution->>'utmSource' source,
      (select count(*)::int from funil.analytics_events e where e.session_id=a.session_id and e.page='/' and e.name='page_view') root_views,
      (select count(*)::int from funil.funnel_events f where f.lead_id=l.id and f.event_name='contact_saved') contact_events
    from funil.leads l
    join funil.analytics_lead_links a on a.lead_id=l.id
    join funil.analytics_sessions s on s.id=a.session_id
    where l.id=${leadId}`
  assert.equal(link?.email, email)
  assert.equal(link?.session_id, sessionId)
  assert.equal(link?.source, source)
  assert.ok(link?.root_views >= 1)
  assert.equal(link?.contact_events, 1)
  assert.ok(
    !JSON.stringify(batches).includes(email),
    'Contact remains in the lead, not browser event payloads',
  )
  console.log(
    'Passed: automatic visit → real pre-checkout → identified lead linked to earlier session in PostgreSQL; no consent cookie or field values in events',
  )
} finally {
  await context.request
    .post(`${base}/api/analytics/consent`, {
      headers: { origin: base },
      data: { choice: 'rejected' },
    })
    .catch(() => {})
  await context.close()
  await browser.close()
  if (leadId) await sql`delete from funil.leads where id=${leadId} and email=${email}`
  await sql.end()
}
