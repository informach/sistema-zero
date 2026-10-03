/** Visual smoke test of the actual React panel, using a real local snapshot and synthetic counts. */
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { sql } from 'drizzle-orm'
import { chromium } from 'playwright'
import { closeDb, getDb } from '../../src/db/client'

const base = 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
try {
  const [snap] = await getDb().execute(
    sql`select * from funil.analytics_snapshots where page='/' and viewport=1280 order by created_at desc limit 1`,
  )
  assert.ok(snap, 'Run analytics:snapshots first')
  const report = {
    campaigns: [{ source: 'instagram', campaign: 'bio', sessions: 10, paid: 1 }],
    coverage: { paid: 2, unlinked: 1 },
    summary: {
      sessions: 10,
      visitors: 8,
      contacts: 4,
      checkout: 3,
      paid: 1,
      revenue: 3700,
      missingRevenue: 0,
      lastEvent: new Date().toISOString(),
    },
    pages: [
      {
        page: '/',
        revision: snap.revision,
        viewport: 1280,
        views: 10,
        clicks: 5,
        snapshot: snap.id,
      },
    ],
    interactions: [
      {
        page: '/',
        revision: snap.revision,
        element: 'bio-comunidade',
        section: 'bio',
        label: 'Conhecer a Comunidade e os planos',
        exposed: 10,
        clicked: 5,
        opened: 0,
        zoomed: 0,
      },
    ],
    quizzes: [],
    journeys: [{ route: 'Sem quiz observado', sessions: 10, paid: 1 }],
  }
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/admin/analytics?*', (route) =>
    route.fulfill({
      json: new URL(route.request().url()).searchParams.has('viewport')
        ? { snapshot: snap, points: [{ element: 'bio-comunidade', x: 5000, y: 5000, count: 5 }] }
        : report,
    }),
  )
  await page.goto(`${base}/kids/comunidade-dos-criadores/quiz`)
  await page.locator('.cq-intro button.kof-btn').waitFor()
  await page.getByRole('button', { name: 'Continuar sem métricas' }).click()
  await page.waitForFunction('typeof window.$RefreshReg$ === "function"')
  await page.evaluate(async () => {
    const panelPath = '/src/islands/admin/AnalyticsPanel.tsx'
    const source = await (await fetch(panelPath)).text()
    const reactPath = source.match(/from "([^"]*\/react\.js[^"]*)"/)![1]!
    const domPath = reactPath.replace('/react.js', '/react-dom_client.js')
    const [React, ReactDOM, panel] = await Promise.all([
      import(reactPath),
      import(domPath),
      import(panelPath),
    ])
    document.documentElement.className = 'dark'
    document.body.innerHTML =
      '<main id="qa-panel" style="padding:32px;max-width:1400px;margin:auto"></main>'
    ReactDOM.default
      .createRoot(document.querySelector('#qa-panel'))
      .render(React.default.createElement(panel.default, { funnel: '' }))
  })
  await page.getByRole('button', { name: 'Ver print e mapa' }).click()
  await page.getByRole('img', { name: 'Print da página com mapa de cliques' }).waitFor()
  assert.equal(await page.locator('svg circle').count(), 1)
  await mkdir('output/analytics', { recursive: true })
  await page.screenshot({ path: 'output/analytics/painel-mapa.png', fullPage: true })
  await page.getByLabel('Recortar uma seção ou elemento').selectOption('bio-comunidade')
  await page.screenshot({ path: 'output/analytics/painel-recorte.png', fullPage: true })
  assert.deepEqual(errors, [])
  console.log('Panel, real snapshot, click overlay and section crop passed (synthetic counts).')
} finally {
  await context.close()
  await browser.close()
  await closeDb()
}
