/** Actual built admin + database + ingestion + screenshot worker. Only the local IdP is a fixture. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright'

assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
const token = crypto.randomUUID()
const gateway = createServer((req, res) => {
  res.setHeader('content-type', 'application/json')
  if (req.url === '/auth/me' && req.headers.authorization === `Bearer ${token}`)
    res.end(
      JSON.stringify({
        user: { id: 'qa-local-admin', email: 'qa@example.test', role: 'admin', status: 'active' },
      }),
    )
  else {
    res.statusCode = 401
    res.end('{}')
  }
})
await new Promise<void>((done) => gateway.listen(0, '127.0.0.1', done))
const address = gateway.address()
assert.ok(address && typeof address !== 'string')
const reservation = createServer()
await new Promise<void>((done) => reservation.listen(0, '127.0.0.1', done))
const port = (reservation.address() as { port: number }).port
await new Promise<void>((done) => reservation.close(() => done()))
const base = `http://127.0.0.1:${port}`
const environment = {
  ...process.env,
  NODE_ENV: 'development',
  GATEWAY_URL: `http://127.0.0.1:${address.port}`,
  HOST: '127.0.0.1',
  PORT: String(port),
}
const app = spawn(
  'bun',
  [
    '-e',
    `await import(${JSON.stringify(pathToFileURL(resolve('.tmp/analytics-review-build/server/entry.mjs')).href)})`,
  ],
  { env: environment, stdio: ['ignore', 'pipe', 'pipe'] },
)
let serverErrors = ''
app.stderr.on('data', (data) => {
  serverErrors += data
})
const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  reducedMotion: 'reduce',
})
try {
  let ready = false
  for (let attempt = 0; attempt < 100; attempt++) {
    if (app.exitCode !== null) throw new Error(serverErrors)
    try {
      ready = (await fetch(base)).ok
    } catch {}
    if (ready) break
    await new Promise((done) => setTimeout(done, 100))
  }
  assert.ok(ready, 'Local QA build did not start')
  const source = `qa-panel-${crypto.randomUUID()}`
  const visitor = await context.newPage()
  const errors: string[] = []
  visitor.on('pageerror', (error) => errors.push(error.message))
  const firstBatch = visitor.waitForResponse(
    (r) => r.url().endsWith('/api/analytics/events') && r.ok(),
  )
  await visitor.goto(`${base}/?utm_source=${source}`)
  await firstBatch
  assert.equal(await visitor.locator('#sz-metrics-notice').isVisible(), false)
  assert.ok(!(await context.cookies()).some((c) => c.name === 'sz_metrics'))
  await visitor.getByRole('link', { name: /^Como funciona/ }).click()
  await visitor.waitForURL('**/como-funciona/**')
  const capture = spawn(
    process.execPath,
    ['--import', 'tsx', 'scripts/analytics-snapshots.ts', '--page=/', '--width=1280', '--refresh'],
    {
      env: { ...environment, ANALYTICS_CAPTURE_URL: base },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  let captureLog = ''
  capture.stdout.on('data', (data) => {
    captureLog += data
  })
  capture.stderr.on('data', (data) => {
    captureLog += data
  })
  const timer = setTimeout(() => capture.kill(), 60000)
  const captureCode = await new Promise<number | null>((done) => capture.on('exit', done))
  clearTimeout(timer)
  assert.equal(captureCode, 0, captureLog)
  await context.addCookies([{ name: 'admin_access', value: token, url: base, httpOnly: true }])
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(`${base}/admin`)
  await page.locator('astro-island[component-url*="AdminDashboard"]:not([ssr])').waitFor()
  await page.getByRole('button', { name: 'Métricas', exact: true }).click()
  await page.getByLabel('Ambiente').selectOption('development')
  await page.getByLabel('Origem (UTM)').fill(source)
  const reportReady = page.waitForResponse(
    (r) => r.url().includes('/api/admin/analytics?') && r.url().includes(source) && r.ok(),
  )
  await page.getByLabel('Origem (UTM)').press('Tab')
  const report = await (await reportReady).json()
  assert.equal(report.summary.sessions, 1)
  assert.ok(
    report.pages.some(
      (row: { page: string; clicks: number; snapshot: string | null }) =>
        row.page === '/' && row.clicks >= 1 && row.snapshot,
    ),
  )
  await page.getByRole('button', { name: 'Ver print e mapa' }).click()
  await page.getByRole('img', { name: 'Print da página com mapa de cliques' }).waitFor()
  assert.ok((await page.locator('svg circle').count()) >= 1)
  await mkdir('output/analytics', { recursive: true })
  await page.screenshot({ path: 'output/analytics/painel-mapa.png', fullPage: true })
  await page.getByLabel('Recortar uma seção ou elemento').selectOption('bio-como-funciona')
  await page.screenshot({ path: 'output/analytics/painel-recorte.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'Passed: actual browser click → ingestion → PostgreSQL → capture worker → authenticated admin API → map and crop. Local synthetic visitor; local IdP fixture only.',
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
  app.kill()
  gateway.closeAllConnections()
  gateway.close()
}
