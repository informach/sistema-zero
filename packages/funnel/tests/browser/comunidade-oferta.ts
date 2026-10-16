/** Run after `bun run build`: node --import tsx tests/browser/comunidade-oferta.ts */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium } from 'playwright'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(cwd, '../../tmp/comunidade-oferta-review')
const base = '/kids/comunidade-dos-criadores'
const school = `${base}/oferta/habilidades-escolares`
const monthly = 'comunidade-dos-criadores-mensal'
const annual = 'comunidade-dos-criadores-anual'
// Deliberately different from editorial fallbacks: proves SSR uses catalog prices.
const catalog = createServer((req, res) => {
  const slug = req.url?.match(/^\/catalog\/offers\/([^/]+)$/)?.[1]
  if (req.method !== 'GET' || (slug !== monthly && slug !== annual)) {
    res.writeHead(503).end()
    return
  }
  res.setHeader('content-type', 'application/json')
  res.end(
    JSON.stringify({
      id: `qa-${slug}`,
      slug,
      name: 'Comunidade dos Criadores',
      isAvailable: true,
      priceCents: slug === monthly ? 10900 : 89900,
      currency: 'BRL',
      guaranteeDays: 7,
      pricingMode: 'subscription',
      billingIntervalMonths: slug === monthly ? 1 : 12,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
      product: { name: 'Comunidade dos Criadores' },
      content: { altOffer: { slug: slug === monthly ? annual : monthly } },
    }),
  )
})
await new Promise<void>((done) => catalog.listen(0, '127.0.0.1', done))
const address = catalog.address()
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
    FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES: monthly,
    FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-30-dias',
    FUNNEL_OFFER_PRO_NO_COMANDO_DA_IA: 'no-comando-da-ia',
  },
})
let browser: Browser | undefined
try {
  const origin = await new Promise<string>((done, fail) => {
    let log = ''
    const timer = setTimeout(() => fail(new Error(`Server did not start: ${log}`)), 30000)
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
    app.once('error', (error) => {
      clearTimeout(timer)
      fail(error)
    })
    app.once('exit', (code) => {
      clearTimeout(timer)
      fail(new Error(`Server exited ${code}: ${log}`))
    })
  })
  console.log(`QA server: ${origin}`)
  browser = await chromium.launch({ channel: 'chrome' })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  await context.addCookies([{ name: 'sz_metrics', value: 'rejected', url: origin }])
  const contacts: unknown[] = []
  // Only UI contracts are simulated; unexpected API use fails rather than reaching services.
  await context.route(`${origin}/api/**`, async (route) => {
    const path = new URL(route.request().url()).pathname
    assert.ok(['/api/leads', '/api/events', '/api/contact'].includes(path), path)
    if (path === '/api/contact') contacts.push(route.request().postDataJSON())
    await route.fulfill({ json: {} })
  })
  await context.route(`${origin}${base}/checkout?**`, (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<h1>Checkout destination fixture</h1>',
    }),
  )
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mkdir(output, { recursive: true })
  const paths = [
    '',
    '/criacao-de-jogos',
    '/expressao-visual',
    '/formacao-tecnologica',
    '/continuar',
    '/habilidades-escolares',
  ]
  for (const path of paths) {
    console.log(`Checking offer: ${path || 'default'}`)
    const response = await page.goto(`${origin}${base}/oferta${path}`)
    assert.equal(response?.status(), 200, path)
    const order = await page
      .locator('main > section')
      .evaluateAll((sections) =>
        sections
          .slice(0, 4)
          .map((section) =>
            section.classList.contains('hero')
              ? 'hero'
              : section.classList.contains('tour')
                ? 'tour'
                : section.id,
          ),
      )
    // A e F trazem a tese antes da faixa de telas (proposta de copy de 16/10/2026).
    if (path === '/habilidades-escolares') assert.deepEqual(order, ['hero', 'f01', 'tour', 'f02'])
    else if (path === '') assert.deepEqual(order.slice(0, 3), ['hero', 'a02', 'tour'])
    else assert.equal(order[1], 'tour', path)
    assert.equal(await page.locator('#title-tour').count(), 1)
  }
  console.log('Checking school page interactions')
  await page.evaluate(() => document.fonts.ready)
  assert.equal(await page.locator('h1').count(), 1)
  assert.equal(await page.locator('#f03 .carta-interesse').count(), 4)
  assert.equal(await page.locator('#duvidas details').count(), 32)
  assert.equal(
    await page.locator('#convite .prosa strong').count(),
    1,
    'Closing emphasis must render',
  )
  assert.match(await page.locator('#planos').innerText(), /109/)
  assert.match(await page.locator('#planos').innerText(), /899/)
  const integrity = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id)
    return {
      duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
      brokenAnchors: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
        .filter((a) => a.hash && !document.getElementById(a.hash.slice(1)))
        .map((a) => a.hash),
    }
  })
  assert.deepEqual(integrity, { duplicates: [], brokenAnchors: [] })
  const images = await page
    .locator('img[src]')
    .evaluateAll((els) => [...new Set(els.map((el) => (el as HTMLImageElement).src))])
  for (const src of images) assert.equal((await page.request.get(src)).status(), 200, src)
  await page.screenshot({ path: resolve(output, 'desktop.png') })
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 844 })
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `Overflow at ${width}`,
    )
    const columns = await page
      .locator('#f03 .cartas')
      .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    // Quatro cartas ficam dois a dois no computador (copy nova de 16/10/2026).
    assert.equal(columns, width <= 960 ? 1 : 2)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: resolve(output, 'mobile.png') })
  await page.locator('#f03 .carta-interesse').first().scrollIntoViewIfNeeded()
  await page.screenshot({ path: resolve(output, 'mobile-cards.png') })
  await page.locator('.hero-actions .kof-link').click()
  assert.equal(new URL(page.url()).hash, '#experiencia')
  await page.locator('.hero a[data-zoom]').click()
  await page.locator('dialog.zoom[open]').waitFor()
  await page.keyboard.press('Escape')
  assert.equal(await page.locator('dialog.zoom[open]').count(), 0)
  await page.goto(`${origin}${school}#duvida-escola`)
  await page.locator('#duvida-escola[open]').waitFor()
  assert.equal(await page.locator('#duvida-escola').getAttribute('open'), '')
  for (const [label, slug] of [
    ['mensal', monthly],
    ['anual', annual],
  ]) {
    await page.goto(`${origin}${school}?utm_source=qa_escola&utm_campaign=review`)
    await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'))
    const button = page.getByRole('button', { name: `Escolher o plano ${label}`, exact: true })
    assert.equal(await button.getAttribute('data-checkout-oferta'), slug)
    await button.click()
    await page.getByRole('dialog').waitFor({ state: 'visible' })
    await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'nome')
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      assert.equal(
        await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement)),
        true,
        'Keyboard focus left the modal',
      )
    }
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Shift+Tab')
      assert.equal(
        await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement)),
        true,
        'Reverse keyboard focus left the modal',
      )
    }
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    assert.equal(await button.evaluate((el) => el === document.activeElement), true)
    await button.click()
    await page.waitForFunction(() => document.activeElement?.getAttribute('name') === 'nome')
    await page.getByLabel('Nome do responsável', { exact: true }).fill('Responsável de Teste')
    await page.getByLabel('E-mail do responsável', { exact: true }).fill('qa@example.test')
    await page.getByLabel('Telefone do responsável', { exact: true }).fill('11999999999')
    await page.getByRole('button', { name: 'Continuar para o pagamento', exact: true }).click()
    await page.waitForURL(`${origin}${base}/checkout?**`).catch(async (error) => {
      await page.screenshot({ path: resolve(output, 'checkout-failure.png') })
      console.error({
        url: page.url(),
        contacts,
        form: await page
          .getByRole('dialog')
          .innerText()
          .catch(() => ''),
      })
      throw error
    })
    const destination = new URL(page.url())
    assert.equal(destination.searchParams.get('oferta'), slug)
    assert.equal(destination.searchParams.get('utm_source'), 'qa_escola')
    assert.equal(destination.searchParams.get('utm_campaign'), 'review')
  }
  assert.equal(contacts.length, 2)
  assert.equal(
    (await page.request.get(`${origin}${base}/oferta/escolar-inexistente`)).status(),
    404,
  )
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      routes: paths.length,
      widths: 5,
      images: images.length,
      plans: 2,
      errors,
      screenshots: output,
    }),
  )
} finally {
  await browser?.close()
  app.kill()
  catalog.close()
  catalog.closeAllConnections()
}
