/**
 * Run after `bun run build`: node --import tsx tests/browser/desafio-ofertas.ts
 *
 * As três páginas de oferta do Desafio do Primeiro Jogo (21/10/2026): Kids 9 a 17 (`/oferta`), menor
 * de 9 (`/oferta/criar-junto`) e a adulta (`/pro/desafio-primeiro-jogo/oferta`). Sobe o build com um
 * catálogo falso (preço diferente da referência de R$ 67, para provar que o SSR usa o catálogo) e
 * confere, em cada página: status e no-store, um h1, âncoras e ids, imagens, o preço ao vivo,
 * larguras sem rolagem lateral, os dois CTAs e o pré-checkout até o checkout com a atribuição.
 * Também os 301 das variantes antigas e o 404 da subpágina no funil adulto. Os quizzes do Desafio,
 * que gravam leads, ficam em `desafio-quiz-frio.ts` e `desafio-farol.ts` (precisam de banco). `QA_CHROMIUM_PATH` usa um Chromium já
 * baixado; sem ele, o Chromium do Playwright.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, type Page } from 'playwright'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(cwd, '../../tmp/desafio-ofertas-review')
const kidsBase = '/kids/desafio-primeiro-jogo'
const adultBase = '/pro/desafio-primeiro-jogo'
// Preços propositalmente diferentes da referência (67): provam que a página leu o catálogo.
const OFFERS: Record<string, number> = {
  'desafio-primeiro-jogo-30-dias': 7300,
  'desafio-primeiro-jogo-adulto-30-dias': 7900,
}
const catalog = createServer((req, res) => {
  const slug = req.url?.match(/^\/catalog\/offers\/([^/]+)$/)?.[1]
  const priceCents = slug ? OFFERS[slug] : undefined
  if (req.method !== 'GET' || !slug || !priceCents) {
    res.writeHead(503).end()
    return
  }
  res.setHeader('content-type', 'application/json')
  res.end(
    JSON.stringify({
      id: `qa-${slug}`,
      slug,
      name: 'Desafio do Primeiro Jogo',
      isAvailable: true,
      priceCents,
      currency: 'BRL',
      guaranteeDays: 7,
      pricingMode: 'one_time',
      billingIntervalMonths: null,
      accessMode: 'fixed',
      accessDurationValue: 30,
      accessDurationUnit: 'days',
      product: { name: 'Desafio do Primeiro Jogo' },
      content: {},
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
    FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-mensal',
    FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-adulto-mensal',
    FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-adulto-30-dias',
    FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-30-dias',
    FUNNEL_OFFER_PRO_NO_COMANDO_DA_IA: 'no-comando-da-ia',
  },
})

interface Pagina {
  nome: string
  path: string
  basePath: string
  /** O preço do catálogo falso como a página o escreve. */
  preco: RegExp
  /** Rótulo do campo de nome no pré-checkout: o Kids pede os dados do responsável. */
  nomeCampo: string
  subtitulo: RegExp
}
const PAGINAS: Pagina[] = [
  {
    nome: 'kids-9a17',
    path: `${kidsBase}/oferta`,
    basePath: kidsBase,
    preco: /R\$\s73/,
    nomeCampo: 'Nome do responsável',
    subtitulo: /Confirme os dados do responsável/,
  },
  {
    nome: 'kids-criar-junto',
    path: `${kidsBase}/oferta/criar-junto`,
    basePath: kidsBase,
    preco: /R\$\s73/,
    nomeCampo: 'Nome do responsável',
    subtitulo: /Confirme os dados do responsável/,
  },
  {
    nome: 'adulto',
    path: `${adultBase}/oferta`,
    basePath: adultBase,
    preco: /R\$\s79/,
    nomeCampo: 'Nome',
    subtitulo: /Confirme seus dados/,
  },
]

/** Rola a página inteira para as imagens `loading="lazy"` carregarem antes da captura. */
async function carregarTudo(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((done) => setTimeout(done, 40))
    }
    window.scrollTo(0, 0)
  })
  await page
    .waitForFunction(
      () =>
        Array.from(document.images).every(
          (img) => img.complete || img.getClientRects().length === 0,
        ),
      undefined,
      { timeout: 8000 },
    )
    .catch(() => {})
}

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
  browser = await chromium.launch(
    process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
  )
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
  for (const base of [kidsBase, adultBase])
    await context.route(`${origin}${base}/checkout?**`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<h1>Checkout destination fixture</h1>' }),
    )
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mkdir(output, { recursive: true })
  let imagens = 0
  // O funil adulto só entra no registry quando a env existir no Railway: até lá, as rotas dele são
  // 404 e a página adulta fica fora da conferência (qualquer outro status reprova).
  const adultoStatus = (await page.request.get(`${origin}${adultBase}/oferta`)).status()
  assert.ok([200, 404].includes(adultoStatus), `adult offer: ${adultoStatus}`)
  const adultoRegistrado = adultoStatus === 200
  if (!adultoRegistrado) console.log('Adult funnel not registered yet: checking only its 404s')
  const paginas = PAGINAS.filter((p) => adultoRegistrado || p.basePath !== adultBase)

  for (const p of paginas) {
    console.log(`Checking offer: ${p.nome}`)
    await page.setViewportSize({ width: 1440, height: 1000 })
    const response = await page.goto(`${origin}${p.path}`)
    assert.equal(response?.status(), 200, p.path)
    assert.equal(response?.headers()['cache-control'], 'no-store', `${p.nome}: no-store`)
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.locator('h1').count(), 1, `${p.nome}: one h1`)
    const texto = await page.locator('body').innerText()
    assert.match(texto, p.preco, `${p.nome}: live price`)
    assert.doesNotMatch(texto, /R\$\s67/, `${p.nome}: no hand-written price`)
    assert.doesNotMatch(texto, /\{\{preco/, `${p.nome}: every price placeholder filled`)
    const integrity = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map((el) => el.id)
      return {
        duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
        brokenAnchors: Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
          .filter((a) => a.hash && !document.getElementById(a.hash.slice(1)))
          .map((a) => a.hash),
      }
    })
    assert.deepEqual(integrity, { duplicates: [], brokenAnchors: [] }, p.nome)
    const srcs = await page
      .locator('img[src]')
      .evaluateAll((els) => [...new Set(els.map((el) => (el as HTMLImageElement).src))])
    for (const src of srcs) assert.equal((await page.request.get(src)).status(), 200, src)
    imagens += srcs.length
    await carregarTudo(page)
    await page.screenshot({ path: resolve(output, `${p.nome}-1440.png`), fullPage: true })
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
        `${p.nome}: overflow at ${width}`,
      )
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await carregarTudo(page)
    await page.screenshot({ path: resolve(output, `${p.nome}-390.png`), fullPage: true })

    // Os dois CTAs abrem o pré-checkout, que chega ao checkout com a atribuição da URL.
    assert.equal(await page.locator('[data-checkout-cta]').count(), 2, `${p.nome}: two CTAs`)
    for (const indice of [0, 1]) {
      await page.goto(`${origin}${p.path}?utm_source=qa_oferta&utm_campaign=review`)
      await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'))
      await page.locator('[data-checkout-cta]').nth(indice).click()
      const dialog = page.getByRole('dialog')
      await dialog.waitFor({ state: 'visible' })
      assert.match(await dialog.innerText(), p.subtitulo, `${p.nome}: pre-checkout subtitle`)
      await page.getByLabel(p.nomeCampo, { exact: true }).fill('Pessoa de Teste')
      await page.getByLabel(/^E-mail/).fill('qa@example.test')
      await page.getByLabel(/^Telefone/).fill('11999999999')
      await page.getByRole('button', { name: 'Continuar para o pagamento', exact: true }).click()
      await page.waitForURL(`${origin}${p.basePath}/checkout?**`)
      const destination = new URL(page.url())
      assert.equal(destination.searchParams.get('oferta'), null, `${p.nome}: single offer`)
      assert.equal(destination.searchParams.get('utm_source'), 'qa_oferta')
      assert.equal(destination.searchParams.get('utm_campaign'), 'review')
    }
  }
  assert.equal(contacts.length, paginas.length * 2)

  // As variantes por motivo (até 21/10/2026) levam à página de 9 a 17, com a mesma query.
  for (const antiga of ['primeiro-jogo', 'tempo-de-tela', 'iniciacao-tecnologica']) {
    const res = await page.request.get(`${origin}${kidsBase}/oferta/${antiga}?cupom=QA`, {
      maxRedirects: 0,
    })
    assert.equal(res.status(), 301, antiga)
    assert.equal(res.headers().location, `${kidsBase}/oferta?cupom=QA`, antiga)
  }
  for (const inexistente of [
    `${kidsBase}/oferta/expressao-visual`,
    `${adultBase}/oferta/criar-junto`,
    `${adultBase}/oferta/tempo-de-tela`,
  ])
    assert.equal((await page.request.get(`${origin}${inexistente}`)).status(), 404, inexistente)
  assert.equal(
    (await page.request.get(`${origin}${adultBase}/termos`)).status(),
    adultoRegistrado ? 200 : 404,
  )
  // Desde 21/10/2026 o Desafio adulto tem quiz (os quizzes gravam leads e ficam em
  // `desafio-quiz-frio.ts`, com banco): aqui só o status da página, que não toca no banco.
  assert.equal(
    (await page.request.get(`${origin}${adultBase}/quiz`)).status(),
    adultoRegistrado ? 200 : 404,
  )
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({ pages: paginas.length, widths: 5, images: imagens, screenshots: output }),
  )
} finally {
  await browser?.close()
  app.kill()
  catalog.close()
  catalog.closeAllConnections()
}
