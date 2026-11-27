import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../../..')
const admin = createRequire(new URL('../package.json', import.meta.url))
const { chromium } = createRequire(new URL('../../studio/package.json', import.meta.url))(
  'playwright-core',
)
const postcss = createRequire(admin.resolve('@tailwindcss/postcss'))('postcss')
const from = resolve(here, '../src/app/globals.css')
const css = (
  await postcss([admin('@tailwindcss/postcss')({ base: resolve(here, '..') })]).process(
    readFileSync(from, 'utf8'),
    { from },
  )
).css
const temp = mkdtempSync(join(tmpdir(), 'sz-course-benefits-'))
assert.equal(dirname(temp), tmpdir())
const artifacts = resolve(root, '.cache/course-benefits-browser')
mkdirSync(artifacts, { recursive: true })
const benefit = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Cadê Todo Mundo',
  status: 'active',
  results: { gifts: 27 },
}
let server, browser
try {
  execFileSync(
    'bun',
    [
      'build',
      'tests/fixtures/course-benefits-browser.tsx',
      '--target',
      'browser',
      '--define',
      'process.env={"NODE_ENV":"production"}',
      '--outfile',
      join(temp, 'fixture.js'),
    ],
    { cwd: resolve(here, '..'), stdio: 'pipe' },
  )
  const js = readFileSync(join(temp, 'fixture.js'))
  server = createServer((req, res) => {
    if (req.url === '/fixture.js') {
      res.setHeader('content-type', 'text/javascript; charset=utf-8')
      res.end(js)
    } else if (req.url === '/style.css') {
      res.setHeader('content-type', 'text/css')
      res.end(css)
    } else {
      res.setHeader('content-type', 'text/html; charset=utf-8')
      res.end(
        '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>',
      )
    }
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  browser = await chromium.launch({ channel: 'chrome', headless: true })
  const context = await browser.newContext({ acceptDownloads: true, reducedMotion: 'reduce' })
  const page = await context.newPage()
  page.setDefaultTimeout(10000)
  page.on('pageerror', (error) => console.error('BROWSER_ERROR', error.message))
  let mode = 'data'
  const requests = []
  await page.route('**/api/admin/referrals/**', async (route) => {
    const u = new URL(route.request().url())
    requests.push(u)
    if (mode === 'loading') {
      await new Promise((r) => setTimeout(r, 2000))
      return route.fulfill({ json: { items: [] } }).catch(() => {})
    }
    if (mode === 'error')
      return route.fulfill({ status: 503, json: { error: { message: 'Indisponível' } } })
    if (!u.pathname.endsWith('/results'))
      return route.fulfill({
        json: {
          items:
            mode === 'empty'
              ? []
              : [mode === 'zero' ? { ...benefit, results: { gifts: 0 } } : benefit],
        },
      })
    const offset = Number(u.searchParams.get('offset') ?? 0)
    const total = mode === 'zero' ? 0 : 27
    const people = Array.from({ length: Math.max(0, Math.min(25, total - offset)) }, (_, i) => ({
      email: `pessoa-${offset + i}@example.invalid`,
      accountUserId: null,
      entry: {
        id: String(offset + i),
        acquiredAt: '2026-11-27T12:00:00Z',
        originKind: 'course',
        courseBenefit: {
          benefitName: benefit.name,
          accessOrigin: { originKind: 'campaign', campaignTitle: 'Encontro de pais' },
        },
      },
    }))
    return route.fulfill({
      json: {
        benefit,
        results: { gifts: total },
        period: { from: u.searchParams.get('from'), to: u.searchParams.get('to') },
        detail: { people, peopleTotal: total },
      },
    })
  })
  const go = () =>
    page.goto(`http://127.0.0.1:${server.address().port}`, { waitUntil: 'domcontentloaded' })
  const evidence = []
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    mode = 'data'
    await go()
    const heading = page.getByRole('heading', { name: benefit.name, exact: true })
    await heading.waitFor()
    const inset = await heading.evaluate((el) => {
      const card = el.closest('.rounded-xl')
      const a = el.getBoundingClientRect(),
        b = card.getBoundingClientRect()
      return { left: a.left - b.left, top: a.top - b.top }
    })
    assert(
      inset.left >= 16 && inset.top >= 16,
      `Cartão sem espaçamento em ${width}: ${JSON.stringify(inset)}`,
    )
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Página com rolagem horizontal em ${width}`,
    )
    try {
      await page.getByRole('button', { name: 'Ver resgates no período' }).click()
    } catch (error) {
      console.error('DOM', await page.locator('body').innerText())
      console.error(
        'BUTTONS',
        await page.locator('button').evaluateAll((els) =>
          els.map((el) => ({
            text: el.textContent,
            hidden: el.hidden,
            display: getComputedStyle(el).display,
            visibility: getComputedStyle(el).visibility,
          })),
        ),
      )
      await page.screenshot({ path: join(artifacts, 'failure.png'), fullPage: true })
      throw error
    }
    await page.getByRole('cell', { name: 'pessoa-0@example.invalid', exact: true }).waitFor()
    assert.equal(
      await page.getByRole('cell', { name: 'Campanha: Encontro de pais', exact: true }).count(),
      25,
    )
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Tabela estourou a página em ${width}`,
    )
    await page.screenshot({ path: join(artifacts, `resgates-${width}.png`), fullPage: true })
    evidence.push({ width, inset })
  }
  await page.getByLabel('De', { exact: true }).fill('2026-11-01')
  await page.getByLabel('Até', { exact: true }).fill('2026-11-27')
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/results?') && r.url().includes('from=')),
    page.getByRole('button', { name: 'Ver resgates no período' }).click(),
  ])
  await page.getByRole('button', { name: 'Próxima' }).click()
  await page.getByRole('cell', { name: 'pessoa-25@example.invalid', exact: true }).waitFor()
  const last = requests.at(-1)
  assert.equal(last.searchParams.get('offset'), '25')
  assert.equal(last.searchParams.get('from'), '2026-11-01T03:00:00.000Z')
  assert.equal(last.searchParams.get('to'), '2026-11-28T03:00:00.000Z')
  assert(await page.getByRole('button', { name: 'Próxima' }).isDisabled())
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar esta página' }).click()
  const file = await download
  const text = readFileSync(await file.path(), 'utf8')
  assert(text.includes('pessoa-25@example.invalid') && !text.includes('pessoa-0@example.invalid'))
  assert(text.includes('Campanha: Encontro de pais'))
  for (mode of ['zero', 'empty', 'error', 'loading']) {
    await go()
    if (mode === 'zero') {
      await page.getByRole('button', { name: 'Ver resgates no período' }).click()
      await page.getByText('Nenhum resgate neste período.', { exact: true }).waitFor()
      assert(await page.getByRole('button', { name: 'Baixar esta página' }).isDisabled())
    }
    if (mode === 'empty')
      await page.getByRole('heading', { name: 'Nenhum benefício cadastrado' }).waitFor()
    if (mode === 'error') {
      await page.getByRole('alert').waitFor()
      assert.equal(await page.getByRole('status').count(), 0)
    }
    if (mode === 'loading') await page.getByRole('status').waitFor()
    await page.screenshot({ path: join(artifacts, `${mode}.png`), fullPage: true })
  }
  console.log(
    JSON.stringify({
      state: 'PASS',
      evidence,
      pagination: true,
      dateRangePreserved: true,
      csvCurrentPage: true,
      states: ['zero', 'empty', 'error', 'loading'],
      productionDataCreated: false,
    }),
  )
  await context.close()
} finally {
  await browser?.close()
  await new Promise((r) => (server ? server.close(r) : r()))
  assert.equal(dirname(resolve(temp)), resolve(tmpdir()))
  rmSync(temp, { recursive: true, force: true })
}
