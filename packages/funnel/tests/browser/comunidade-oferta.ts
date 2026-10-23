/**
 * Run after `bun run build`: node --import tsx tests/browser/comunidade-oferta.ts
 *
 * As páginas de oferta da Comunidade dos Criadores (20/10/2026): Kids 9 a 17 (`/oferta`), menor de
 * 9 (`/oferta/criar-junto`), continuidade Kids (`/oferta/continuar`), a adulta
 * (`/pro/comunidade-dos-criadores/oferta`) e a continuidade adulta (`/oferta/continuar`). Sobe o
 * build com um catálogo falso (preços diferentes da reserva editorial, para provar que o SSR usa o
 * catálogo) e confere, em cada página: status, um h1, âncoras e ids, imagens, preços ao vivo,
 * larguras sem rolagem lateral, os dois CTAs de plano e o pré-checkout até o checkout com o plano e
 * a atribuição. Também os 301 das cinco páginas de perfil antigas e da Como funciona. `QA_CHROME_CHANNEL=chrome` usa o Chrome instalado e `QA_CHROMIUM_PATH` um
 * Chromium já baixado; sem os dois, o Chromium do Playwright.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium } from 'playwright'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const output = resolve(cwd, '../../tmp/comunidade-oferta-review')
const kidsBase = '/kids/comunidade-dos-criadores'
const adultBase = '/pro/comunidade-dos-criadores'
// Preços propositalmente diferentes da reserva (97 e 797): provam que a página leu o catálogo.
const OFFERS = {
  'comunidade-dos-criadores-mensal': {
    priceCents: 10900,
    months: 1,
    alt: 'comunidade-dos-criadores-anual',
  },
  'comunidade-dos-criadores-anual': {
    priceCents: 89900,
    months: 12,
    alt: 'comunidade-dos-criadores-mensal',
  },
  'comunidade-dos-criadores-adulto-mensal': {
    priceCents: 11900,
    months: 1,
    alt: 'comunidade-dos-criadores-adulto-anual',
  },
  'comunidade-dos-criadores-adulto-anual': {
    priceCents: 99900,
    months: 12,
    alt: 'comunidade-dos-criadores-adulto-mensal',
  },
} as const
type Slug = keyof typeof OFFERS
const catalog = createServer((req, res) => {
  const slug = req.url?.match(/^\/catalog\/offers\/([^/]+)$/)?.[1] as Slug | undefined
  const offer = slug ? OFFERS[slug] : undefined
  if (req.method !== 'GET' || !slug || !offer) {
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
      priceCents: offer.priceCents,
      currency: 'BRL',
      guaranteeDays: 7,
      pricingMode: 'subscription',
      billingIntervalMonths: offer.months,
      accessMode: 'billing_cycle',
      accessDurationValue: null,
      accessDurationUnit: null,
      product: { name: 'Comunidade dos Criadores' },
      content: { altOffer: { slug: offer.alt } },
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
  mensal: Slug
  anual: Slug
  /** Os preços do catálogo falso como a página os escreve. */
  precos: RegExp[]
  /** Rótulo do campo de nome no pré-checkout: o Kids pede os dados do responsável. */
  nome_campo: string
}
const PAGINAS: Pagina[] = [
  {
    nome: 'kids-9a17',
    path: `${kidsBase}/oferta`,
    basePath: kidsBase,
    mensal: 'comunidade-dos-criadores-mensal',
    anual: 'comunidade-dos-criadores-anual',
    precos: [/109/, /899/],
    nome_campo: 'Nome do responsável',
  },
  {
    nome: 'kids-criar-junto',
    path: `${kidsBase}/oferta/criar-junto`,
    basePath: kidsBase,
    mensal: 'comunidade-dos-criadores-mensal',
    anual: 'comunidade-dos-criadores-anual',
    precos: [/109/, /899/],
    nome_campo: 'Nome do responsável',
  },
  {
    nome: 'kids-continuar',
    path: `${kidsBase}/oferta/continuar`,
    basePath: kidsBase,
    mensal: 'comunidade-dos-criadores-mensal',
    anual: 'comunidade-dos-criadores-anual',
    precos: [/109/, /899/],
    nome_campo: 'Nome do responsável',
  },
  {
    nome: 'adulto',
    path: `${adultBase}/oferta`,
    basePath: adultBase,
    mensal: 'comunidade-dos-criadores-adulto-mensal',
    anual: 'comunidade-dos-criadores-adulto-anual',
    precos: [/119/, /999/],
    nome_campo: 'Nome',
  },
  {
    nome: 'adulto-continuar',
    path: `${adultBase}/oferta/continuar`,
    basePath: adultBase,
    mensal: 'comunidade-dos-criadores-adulto-mensal',
    anual: 'comunidade-dos-criadores-adulto-anual',
    precos: [/119/, /999/],
    nome_campo: 'Nome',
  },
]

/** Rola a página inteira para as imagens `loading="lazy"` carregarem antes da captura. */
async function carregarTudo(page: import('playwright').Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 500) {
      window.scrollTo(0, y)
      await new Promise((done) => setTimeout(done, 40))
    }
    window.scrollTo(0, 0)
  })
  // Imagem sem caixa (dentro de um <dialog> fechado ou escondida no celular) nunca carrega.
  // Melhor esforço: a captura é para revisão humana; o status de cada imagem já foi conferido.
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
    process.env.QA_CHROME_CHANNEL
      ? { channel: process.env.QA_CHROME_CHANNEL }
      : process.env.QA_CHROMIUM_PATH
        ? { executablePath: process.env.QA_CHROMIUM_PATH }
        : {},
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

  for (const p of PAGINAS) {
    console.log(`Checking offer: ${p.nome}`)
    await page.setViewportSize({ width: 1440, height: 1000 })
    const response = await page.goto(`${origin}${p.path}`)
    assert.equal(response?.status(), 200, p.path)
    await page.evaluate(() => document.fonts.ready)
    assert.equal(await page.locator('h1').count(), 1, `${p.nome}: one h1`)
    const texto = await page.locator('body').innerText()
    for (const preco of p.precos) assert.match(texto, preco, `${p.nome}: live price ${preco}`)
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

    // Os dois planos: cada botão leva o slug do seu plano e o pré-checkout chega ao checkout com
    // ele e com a atribuição da URL.
    const ctas = page.locator('[data-checkout-cta]')
    assert.equal(await ctas.count(), 2, `${p.nome}: two plan CTAs`)
    for (const slug of [p.mensal, p.anual]) {
      await page.goto(`${origin}${p.path}?utm_source=qa_oferta&utm_campaign=review`)
      await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'))
      const button = page.locator(`[data-checkout-cta][data-checkout-oferta="${slug}"]`)
      assert.equal(await button.count(), 1, `${p.nome}: CTA for ${slug}`)
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
      const rodape = await page.getByRole('dialog').innerText()
      assert.match(rodape, /Assinatura mensal ou anual, com 7 dias de garantia/, p.nome)
      await page.getByLabel(p.nome_campo, { exact: true }).fill('Pessoa de Teste')
      await page.getByLabel(/^E-mail/).fill('qa@example.test')
      await page.getByLabel(/^Telefone/).fill('11999999999')
      await page.getByRole('button', { name: 'Continuar para o pagamento', exact: true }).click()
      await page.waitForURL(`${origin}${p.basePath}/checkout?**`)
      const destination = new URL(page.url())
      assert.equal(destination.searchParams.get('oferta'), slug)
      assert.equal(destination.searchParams.get('utm_source'), 'qa_oferta')
      assert.equal(destination.searchParams.get('utm_campaign'), 'review')
    }
  }
  assert.equal(contacts.length, PAGINAS.length * 2)

  // As cinco páginas de perfil (até 20/10/2026) levam à página 9 a 17, com a mesma query.
  for (const antiga of [
    'tempo-de-tela',
    'criacao-de-jogos',
    'expressao-visual',
    'formacao-tecnologica',
    'habilidades-escolares',
  ]) {
    const res = await page.request.get(`${origin}${kidsBase}/oferta/${antiga}?cupom=QA`, {
      maxRedirects: 0,
    })
    assert.equal(res.status(), 301, antiga)
    assert.equal(res.headers().location, `${kidsBase}/oferta?cupom=QA`, antiga)
  }
  // A Como funciona (até 20/10/2026) leva à experiência da página de 9 a 17, com a mesma query.
  const comoFunciona = await page.request.get(`${origin}/como-funciona/?utm_source=qa`, {
    maxRedirects: 0,
  })
  assert.equal(comoFunciona.status(), 301)
  assert.equal(comoFunciona.headers().location, `${kidsBase}/oferta?utm_source=qa#experiencia`)
  for (const inexistente of [
    `${kidsBase}/oferta/escolar-inexistente`,
    `${adultBase}/oferta/tempo-de-tela`,
    `${adultBase}/oferta/criar-junto`,
  ])
    assert.equal((await page.request.get(`${origin}${inexistente}`)).status(), 404, inexistente)
  assert.deepEqual(errors, [])
  console.log(
    JSON.stringify({
      pages: PAGINAS.length,
      widths: 5,
      images: imagens,
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
