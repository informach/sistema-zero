import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url)),
  root = resolve(here, '../../..')
const admin = createRequire(new URL('../package.json', import.meta.url))
const studio = createRequire(new URL('../../studio/package.json', import.meta.url))
const ui = createRequire(new URL('../../ui/package.json', import.meta.url))
const { chromium } = studio('playwright-core')
const postcss = createRequire(admin.resolve('@tailwindcss/postcss'))('postcss')
const from = resolve(here, '../src/app/globals.css')
const css = (
  await postcss([admin('@tailwindcss/postcss')({ base: resolve(here, '..') })]).process(
    readFileSync(from, 'utf8'),
    { from },
  )
).css
const temp = mkdtempSync(join(tmpdir(), 'sz-campaign-browser-'))
assert.equal(dirname(temp), tmpdir())
const artifacts = resolve(root, '.cache/commissions-970/campaign-browser')
mkdirSync(artifacts, { recursive: true })
const campaigns = new Map(),
  requests = []
let server, browser
let failCouponLink = true
const offerId = '22222222-2222-4222-8222-222222222222'
try {
  execFileSync(
    'bun',
    [
      'build',
      'tests/fixtures/campaign-browser.tsx',
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
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://local'),
      audience = url.searchParams.get('audience') ?? 'kids'
    const send = (body, status = 200) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(body))
    }
    if (url.pathname.startsWith('/api/')) {
      let raw = ''
      for await (const chunk of req) raw += chunk
      const body = raw ? JSON.parse(raw) : null
      requests.push({ path: url.pathname, method: req.method, audience, body })
      if (url.pathname === '/api/catalog/coupon-link') {
        if (failCouponLink) {
          failCouponLink = false
          return send({ error: { message: 'Falha temporária de conferência' } }, 503)
        }
        return send({
          url: `https://example.test/cupom/${url.searchParams.get('code')}?oferta=${url.searchParams.get('offer')}&publico=${audience}`,
        })
      }
      if (url.pathname === '/api/members/courses')
        return send({ items: [{ slug: 'cade-todo-mundo-adulto', status: 'published' }] })
      if (url.pathname === '/api/catalog/offers')
        return send({
          items: [
            {
              id: offerId,
              name: `Desafio ${audience}`,
              slug: `desafio-${audience}`,
              priceCents: 6700,
              currency: 'BRL',
              isAvailable: true,
              content: { allowsCoupon: true },
              accessMode: 'fixed',
              accessDurationValue: 30,
              accessDurationUnit: 'days',
            },
          ],
          total: 1,
        })
      const campaign = campaigns.get(audience)
      if (url.pathname.endsWith('/coupon')) {
        campaign.coupon = { couponId: '33333333-3333-4333-8333-333333333333', offerId }
        campaign.couponView = {
          ...campaign.coupon,
          code: body.code,
          offerSlug: `desafio-${audience}`,
          offerName: `Desafio ${audience}`,
          percentOff: body.percentOff,
          amountOffCents: null,
          currency: 'BRL',
          accessMode: 'fixed',
          accessDurationValue: 30,
          accessDurationUnit: 'days',
          available: true,
          state: 'scheduled',
          startsAt: campaign.startsAt,
          endsAt: '2026-11-13T03:00:00.000Z',
          shareUrl: `https://example.test/cupom/${body.code}?oferta=desafio-${audience}&publico=${audience}&event_code=evento-${audience}`,
        }
        return send({ campaign })
      }
      if (req.method === 'POST' || req.method === 'PATCH') {
        const saved = {
          ...body,
          id: '11111111-1111-4111-8111-111111111111',
          state: 'scheduled',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          shareUrl: `https://example.test/bolsa/${body.code}`,
          stats: { redemptions: 0, pending: 0, failed: 0, conversions: 0 },
        }
        campaigns.set(audience, saved)
        return send({ campaign: saved })
      }
      if (url.pathname === '/api/admin/referrals/campaigns')
        return send({ items: campaign ? [campaign] : [], total: campaign ? 1 : 0 })
      return send({ campaign, history: [], redemptions: [] })
    }
    const type =
      url.pathname === '/fixture.js'
        ? 'text/javascript'
        : url.pathname === '/style.css'
          ? 'text/css'
          : 'text/html'
    res.writeHead(200, { 'content-type': type })
    res.end(
      type === 'text/javascript'
        ? js
        : type === 'text/css'
          ? css
          : '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
    )
  })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  browser = await chromium.launch({
    headless: true,
    ...(process.env.SZ_CHECK_CHROMIUM
      ? { executablePath: process.env.SZ_CHECK_CHROMIUM }
      : process.platform === 'win32'
        ? { channel: 'chrome' }
        : {}),
  })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
    errors = []
  page.setDefaultTimeout(15_000)
  page.on('pageerror', (e) => {
    errors.push(e.message)
    console.error(e.message)
  })
  for (const audience of ['kids', 'adult']) {
    console.log(`Conferindo formulário ${audience}`)
    await page.goto(`http://127.0.0.1:${server.address().port}/?audience=${audience}`)
    await page.getByRole('button', { name: 'Nova campanha', exact: true }).click()
    await page.getByLabel('Nome interno', { exact: true }).fill(`Encontro ${audience}`)
    await page.getByLabel('Título público', { exact: true }).fill('Palestra na clínica Laopa')
    await page.getByLabel('Código do link', { exact: false }).fill(`evento-${audience}`)
    await page.getByLabel('Data da campanha', { exact: true }).fill('2026-11-06')
    await page.getByText('06/11/2026 a 08/11/2026, até 23h59.').waitFor()
    await page.getByText('06/11/2026 a 12/11/2026, até 23h59.').waitFor()
    await page.getByLabel('Data da campanha', { exact: true }).fill('2026-12-30')
    await page.getByText('30/12/2026 a 05/01/2027, até 23h59.').waitFor()
    await page.getByLabel('Data da campanha', { exact: true }).fill('2026-11-06')
    await page.getByRole('checkbox', { name: 'Cadastrar um cupom' }).check()
    await page
      .getByLabel('Código do cupom', { exact: true })
      .fill(`EVENTO-${audience.toUpperCase()}`)
    await page.getByLabel('Buscar oferta', { exact: true }).fill('Desafio')
    await page.getByRole('dialog').getByRole('button', { name: 'Buscar', exact: true }).click()
    await page.getByRole('radio', { name: `Desafio ${audience}`, exact: false }).check()
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 })
      await page.getByLabel('Data da campanha', { exact: true }).scrollIntoViewIfNeeded()
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        true,
      )
      await page
        .getByRole('dialog')
        .screenshot({ path: join(artifacts, `editor-${audience}-${width}.png`) })
    }
    await page.getByRole('button', { name: 'Salvar campanha', exact: true }).click()
    await page.getByRole('button', { name: 'Cartão do cupom', exact: true }).waitFor()
    assert.equal(campaigns.get(audience).startsAt, '2026-11-06T03:00:00.000Z')
    assert.equal(campaigns.get(audience).endsAt, '2026-11-09T03:00:00.000Z')
    assert.equal(
      requests.find((r) => r.path.endsWith('/coupon') && r.audience === audience).body.percentOff,
      50,
    )
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Cartão do cupom', exact: true }).click()
    const download = page.getByRole('link', { name: 'Baixar PNG', exact: true })
    await download.waitFor()
    await page.addScriptTag({ path: ui.resolve('jsqr') })
    const decoded = await page.evaluate(
      async (url) => {
        const image = new Image()
        image.src = url
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, 0, 0)
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height)
        return window.jsQR(data.data, data.width, data.height)?.data
      },
      await download.getAttribute('href'),
    )
    assert.equal(decoded, campaigns.get(audience).couponView.shareUrl)
    await page
      .getByRole('dialog', { name: 'Cartão de divulgação', exact: true })
      .screenshot({ path: join(artifacts, `cartao-${audience}.png`) })
    const next = page.waitForEvent('download')
    await download.click()
    await (await next).saveAs(join(artifacts, `cupom-${audience}.png`))
    await page.goto(`http://127.0.0.1:${server.address().port}/?audience=${audience}&coupon=1`)
    await page.getByLabel('Oferta do cartão').selectOption(offerId)
    if (audience === 'kids') {
      await page.getByRole('alert').waitFor()
      assert.equal(
        await page.getByRole('button', { name: 'Cartão do cupom', exact: true }).count(),
        0,
      )
      await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click()
    }
    const expected = `https://example.test/cupom/SOLO.50?oferta=desafio-${audience}&publico=${audience}`
    await page.getByRole('button', { name: 'Cartão do cupom', exact: true }).waitFor()
    assert.equal(await page.getByLabel('Link do cupom', { exact: true }).inputValue(), expected)
    await page.getByRole('button', { name: 'Cartão do cupom', exact: true }).click()
    await page.getByRole('link', { name: 'Baixar PNG', exact: true }).waitFor()
    await page
      .getByRole('dialog', { name: 'Cartão de divulgação', exact: true })
      .screenshot({ path: join(artifacts, `avulso-${audience}.png`) })
  }
  assert.deepEqual(errors, [])
  console.log('OK: calendário, cadastro opcional, públicos, 3 larguras e PNG dos cupons.')
} finally {
  await browser?.close()
  server?.close()
  assert.equal(dirname(temp), tmpdir())
  rmSync(temp, { recursive: true, force: true })
}
