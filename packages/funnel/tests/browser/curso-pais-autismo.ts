/** Depois de `bun run build`: node --import tsx tests/browser/curso-pais-autismo.ts. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const slug = 'como-ajudar-seu-filho-autista-nas-frustracoes'
const offerId = '10000000-0000-4000-8000-000000000001'
const title = 'Como ajudar seu filho autista a lidar com frustrações e evitar crises'
const cwd = fileURLToPath(new URL('../../', import.meta.url))
const output = process.env.QA_OUTPUT ?? resolve(cwd, '../../.cache/review-origens/autismo-browser')
const available = true
const gateway = createServer((req, res) => {
  const path = new URL(req.url!, 'http://fake.local').pathname
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  if (path === `/catalog/products/by-sku/${slug}`) return send(200, { primaryOfferSlug: slug })
  if (path === `/catalog/offers/${slug}`)
    return send(200, {
      id: offerId,
      slug,
      name: title,
      isAvailable: available,
      priceCents: 6700,
      currency: 'BRL',
      guaranteeDays: 7,
      pricingMode: 'one_time',
      billingIntervalMonths: null,
      accessMode: 'fixed',
      accessDurationValue: 12,
      accessDurationUnit: 'months',
      product: { name: title, sku: slug, audience: 'kids' },
      content: { allowsCoupon: true },
    })
  if (path === '/referrals/internal/redirects') return send(200, { items: [] })
  if (path === '/referrals/internal/links/pais-laopa')
    return send(200, {
      code: 'pais-laopa',
      sourceKind: 'campaign',
      couponCode: null,
      mode: 'sale',
      target: 'page',
      audience: 'kids',
      offerSlug: slug,
    })
  if (path === '/referrals/internal/codes/pais-presente')
    return send(200, {
      code: 'pais-presente',
      ownerKind: 'campaign',
      audience: 'kids',
      displayName: 'Encontro Laopa',
      giftAvailable: true,
      state: 'active',
      source: { kind: 'campaign', name: 'Encontro Laopa', context: 'event', description: '' },
      startsAt: '2026-11-01T00:00:00.000Z',
      endsAt: '2030-01-01T00:00:00.000Z',
      gift: {
        offerId,
        offerSlug: slug,
        courseSlug: slug,
        courseTitle: title,
        offerTitle: title,
        learner: 'parents',
        accessDays: 365,
        includesMural: false,
      },
    })
  send(503, {})
})
await new Promise<void>((done) => gateway.listen(0, '127.0.0.1', done))
const address = gateway.address()
assert.ok(address && typeof address !== 'string')
const app = spawn('node', ['dist/server/entry.mjs'], {
  cwd,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: '0',
    DATABASE_URL: 'postgres://qa:qa@127.0.0.1:1/qa',
    GATEWAY_URL: `http://127.0.0.1:${address.port}`,
    FUNNEL_HMAC_SECRET: 'qa-isolated-local',
    FUNNEL_INTERNAL_TOKEN: 'qa-isolated-local',
    SENTRY_DSN: '',
    TRUST_PROXY: 'false',
    COMMUNITY_URL: 'https://comunidade.qa.local',
    KIDS_COMMUNITY_URL: 'https://kids.qa.local',
  },
})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const origin = await new Promise<string>((done, fail) => {
    let log = ''
    const timer = setTimeout(() => fail(new Error(`Servidor não abriu: ${log}`)), 20_000)
    const started = (chunk: Buffer) => {
      log = (log + chunk.toString()).slice(-4000)
      const url = log.match(/Server listening on (http:\/\/127\.0\.0\.1:\d+)/)?.[1]
      if (url) {
        clearTimeout(timer)
        done(url)
      }
    }
    app.stdout.on('data', started)
    app.stderr.on('data', started)
    app.once('exit', (code) => {
      clearTimeout(timer)
      fail(new Error(`Servidor saiu ${code}: ${log}`))
    })
  })
  browser = await chromium.launch(process.platform === 'win32' ? { channel: 'chrome' } : {})
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: origin }])
  await context.route(`${origin}/api/{events,analytics/**,leads}`, (route) =>
    route.fulfill({ json: {} }),
  )
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mkdir(output, { recursive: true })
  for (const width of [320, 390, 768, 1440]) {
    console.log(`Conferindo curso da Vivianne em ${width}px`)
    await page.setViewportSize({ width, height: 1000 })
    const response = await page.goto(`${origin}/kids/${slug}`)
    assert.equal(response?.status(), 200)
    assert.equal(await page.locator('h1').count(), 1)
    // Proposta de 26/11/2026: o topo sem cartão de compra; a compra na seção da oferta.
    assert.equal(await page.locator('section.c9-heroi .c9-plano').count(), 0)
    const buy = page.locator('section#oferta')
    assert.match(await buy.innerText(), /R\$\s?67/)
    assert.equal(await buy.locator('[data-checkout-cta]').count(), 1)
    for (const id of ['na-sua-casa', 'o-que-muda', 'como-funciona', 'quem-conduz', 'duvidas'])
      assert.equal(await page.locator(`section#${id}`).count(), 1)
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
        window.scrollTo(0, y)
        await new Promise((done) => setTimeout(done, 30))
      }
      window.scrollTo(0, 0)
      // Imagem preguiçosa fora da tela nunca termina o decode: carrega todas antes.
      const imagens = Array.from(document.images)
      for (const img of imagens) img.loading = 'eager'
      await Promise.all(imagens.map((img) => img.decode().catch(() => {})))
    })
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `${width}: sem rolagem lateral`,
    )
    assert.deepEqual(
      await page.evaluate(() =>
        Array.from(document.images)
          .filter((img) => img.getClientRects().length > 0 && !img.naturalWidth)
          .map((img) => img.src),
      ),
      [],
    )
    assert.doesNotMatch(await page.locator('body').innerText(), /de graça|sem custo/i)
    await page.screenshot({ path: resolve(output, `venda-${width}.png`), fullPage: true })
  }
  await page.goto(`${origin}/i/pais-laopa`)
  assert.match(page.url(), new RegExp(`/kids/${slug}/oferta\\?indicacao=pais-laopa`))
  const cookie = (await context.cookies()).find((c) => c.name === 'funil_origem')
  assert.ok(cookie?.httpOnly)
  assert.match(decodeURIComponent(cookie!.value), /pais-laopa/)
  await page.goto(`${origin}/kids/${slug}?presente=pais-presente`)
  assert.equal(await page.locator('[data-checkout-cta]').count(), 0)
  // Modo presente: o mesmo cartão, com o cadastro numa janela (26/11/2026).
  assert.equal(await page.locator('#oferta [data-presente-cta]').count(), 1)
  assert.match(await page.locator('.pk-origem').innerText(), /Encontro Laopa/)
  assert.equal(
    await page.locator('meta[name="robots"]').getAttribute('content'),
    'noindex, nofollow',
  )
  assert.deepEqual(errors, [])
  console.log('OK: venda do curso, quatro larguras, imagens, origem da campanha e modo presente.')
} finally {
  await browser?.close()
  app.kill()
  gateway.closeAllConnections()
  await new Promise<void>((done) => gateway.close(() => done()))
}
