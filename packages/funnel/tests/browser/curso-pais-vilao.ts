/**
 * Run after `bun run build`: node --import tsx tests/browser/curso-pais-vilao.ts
 *
 * Página pública do guia gratuito para pais (`/kids/vilao-em-aliado`, 18/11/2026; texto e layout
 * novos em 21/11/2026). Sobe o build com um referrals falso (pelo gateway falso, que não confere o
 * HMAC) e confere, a 320, 390, 768 e 1440 px: um h1, tema Kids, página indexável, sem rolagem
 * lateral, imagens carregadas, o formulário no topo, as seções curtas, "guia" no lugar de "curso" e
 * o presente em segredo. Depois os estados (campanha ainda não criada, pausada) e o cadastro até o
 * concluído, com o link do guia na área dos pais. Capturas em `QA_OUTPUT` (padrão
 * `tmp/curso-pais-review` na raiz). `QA_CHROMIUM_PATH` usa um Chromium já baixado.
 */

import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, chromium, type Page } from 'playwright'

const cwd = fileURLToPath(new URL('../../', import.meta.url))
const output = process.env.QA_OUTPUT ?? resolve(cwd, '../../tmp/curso-pais-review')
const CODIGO = 'vilao-em-aliado'
const SLUG = 'transformando-o-vilao-em-aliado'

/** O que o referrals falso responde para a campanha do curso; `null` = campanha inexistente. */
let campanha: Record<string, unknown> | null = null
const ativa = (extra: Record<string, unknown> = {}) => ({
  code: CODIGO,
  ownerKind: 'campaign',
  audience: 'kids',
  displayName: 'Minicurso para pais',
  giftAvailable: true,
  source: { kind: 'campaign', name: 'Minicurso para pais', context: 'other', description: '' },
  state: 'active',
  startsAt: '2026-11-18T03:00:00Z',
  endsAt: '2030-01-01T03:00:00Z',
  gift: {
    offerId: '44444444-4444-4444-8444-444444444444',
    offerTitle: 'Transformando o vilão em aliado',
    courseSlug: SLUG,
    courseTitle: 'Transformando o vilão em aliado',
    learner: 'parents',
    accessDays: null,
    includesMural: false,
  },
  ...extra,
})
const resgates: { code: string; email: string }[] = []

const gateway = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://gateway')
  const send = (status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(body))
  }
  let raw = ''
  req.on('data', (chunk) => {
    raw += chunk
  })
  req.on('end', () => {
    if (req.method === 'GET' && url.pathname === `/referrals/internal/codes/${CODIGO}`)
      return campanha ? send(200, campanha) : send(404, {})
    if (req.method === 'POST' && url.pathname === '/referrals/internal/redemptions') {
      resgates.push(JSON.parse(raw))
      return send(201, {
        status: 'completed',
        expiresAt: null,
        emailStatus: 'accepted',
        muralAccess: 'none',
      })
    }
    send(503, {})
  })
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
    FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-mensal',
    FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-adulto-mensal',
    FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-adulto-30-dias',
    FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-30-dias',
  },
})

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
    const timer = setTimeout(() => fail(new Error(`Server did not start: ${log}`)), 20000)
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
  await context.route(`${origin}/api/{events,analytics/**}`, (route) => route.fulfill({ json: {} }))
  const page = await context.newPage()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mkdir(output, { recursive: true })
  const url = `${origin}/kids/${CODIGO}`

  // Campanha aberta: a página completa, em quatro larguras.
  campanha = ativa()
  for (const largura of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width: largura, height: 1000 })
    const resposta = await page.goto(url)
    assert.equal(resposta?.status(), 200, `${largura}: status`)
    await carregarTudo(page)
    assert.equal(await page.locator('h1').count(), 1, `${largura}: um h1`)
    assert.match(
      (await page.locator('html').getAttribute('class')) ?? '',
      /theme-kids/,
      `${largura}: tema`,
    )
    assert.equal(await page.locator('meta[name="robots"]').count(), 0, `${largura}: indexável`)
    const lateral = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    assert.ok(lateral <= 1, `${largura}: rolagem lateral de ${lateral}px`)
    const quebradas = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.getClientRects().length > 0 && img.naturalWidth === 0)
        .map((img) => img.src),
    )
    assert.deepEqual(quebradas, [], `${largura}: imagens`)
    for (const id of ['o-que-muda', 'quem-conduz', 'duvidas'])
      assert.equal(await page.locator(`section#${id}`).count(), 1, `${largura}: seção ${id}`)
    for (const id of ['por-que', 'para-quem', 'aulas', 'como-funciona', 'depoimentos'])
      assert.equal(await page.locator(`#${id}`).count(), 0, `${largura}: sem a seção ${id}`)
    assert.equal(await page.locator('.c9-etapa').count(), 3, `${largura}: o que muda`)
    assert.equal(await page.locator('.c9-duvida').count(), 6, `${largura}: dúvidas`)
    assert.equal(
      await page.locator('section.c9-heroi #resgatar input[name="email"]').count(),
      1,
      `${largura}: formulário no topo`,
    )
    assert.equal(await page.locator('section.c9-fim a[href="#resgatar"]').count(), 1)
    const corpo = await page.locator('body').innerText()
    assert.match(
      corpo,
      /A tela que hoje vira briga em casa pode ser\s+sua aliada\s+no desenvolvimento do seu filho\./,
      `${largura}: título`,
    )
    assert.match(corpo, /Estes dados são seus/, `${largura}: aviso do formulário`)
    assert.match(corpo, /Liberar o meu guia/, `${largura}: botão do formulário`)
    assert.doesNotMatch(
      await page.locator('main').innerText(),
      /\bcursos?\b(?! para pais)|minicurso|presente/i,
      `${largura}: guia, não curso`,
    )
    assert.doesNotMatch(
      corpo,
      /Cadê Todo Mundo|7 dias|Desafio do Primeiro Jogo/,
      `${largura}: segredo`,
    )
    await page.screenshot({ path: resolve(output, `aberta-${largura}.png`), fullPage: true })
  }

  // O título e a imagem de compartilhamento.
  assert.match(await page.title(), /guia gratuito para pais \| Sistema Zero$/)
  assert.match(
    (await page.locator('meta[property="og:image"]').getAttribute('content')) ?? '',
    /\/img\/transformando-o-vilao-em-aliado\/compartilhar\.jpg$/,
  )

  // A barra fixa do celular, depois da primeira dobra, cabe numa linha.
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(url)
  await page.evaluate(() => window.scrollTo(0, 1900))
  const barra = page.locator('[data-presente-barra]')
  await barra.locator('a').waitFor({ state: 'visible' })
  assert.match(await barra.innerText(), /Guia gratuito\s+Sem cartão\s+Quero assistir de graça/)
  assert.ok(
    await barra.evaluate((el) => el.scrollWidth <= el.clientWidth),
    'barra sem rolagem lateral',
  )
  await page.screenshot({ path: resolve(output, 'barra-390.png') })

  // Cadastro até o concluído: o guia abre na área dos pais do app Kids.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(url)
  await page.locator('#resgatar input[name="nome"]').fill('Paula Prado')
  await page.locator('#resgatar input[name="email"]').fill('paula@example.com')
  await page.locator('#resgatar button[type="submit"]').click()
  await page.getByRole('link', { name: 'Abrir o guia' }).waitFor()
  assert.match(await page.locator('#resgatar').innerText(), /O seu guia está liberado/)
  assert.equal(
    await page.getByRole('link', { name: 'Abrir o guia' }).getAttribute('href'),
    `https://kids.qa.local/pais/cursos/${SLUG}`,
  )
  assert.equal(resgates.length, 1, 'um resgate enviado')
  assert.equal(resgates[0]?.code, CODIGO)
  assert.equal(resgates[0]?.email, 'paula@example.com')
  await page.locator('#resgatar').screenshot({ path: resolve(output, 'concluido.png') })

  // Campanha ainda não criada: a página continua no ar, sem formulário.
  campanha = null
  for (const largura of [390, 1440]) {
    await page.setViewportSize({ width: largura, height: 1000 })
    const resposta = await page.goto(url)
    assert.equal(resposta?.status(), 200, `em breve ${largura}: status`)
    await carregarTudo(page)
    assert.equal(
      await page.locator('#resgatar input').count(),
      0,
      `em breve ${largura}: sem formulário`,
    )
    assert.match(
      await page.locator('section.c9-heroi #resgatar').innerText(),
      /As inscrições abrem em breve/,
    )
    assert.equal(await page.locator('.c9-etapa').count(), 3)
    assert.equal(
      await page.locator('section.c9-fim').count(),
      0,
      `em breve ${largura}: sem a faixa`,
    )
    await page.screenshot({ path: resolve(output, `em-breve-${largura}.png`), fullPage: true })
  }

  // Campanha pausada: fechada, com a retomada para quem já começou o cadastro.
  campanha = ativa({ state: 'paused', giftAvailable: false })
  await page.goto(url)
  assert.match(await page.locator('body').innerText(), /As inscrições estão fechadas no momento/)
  assert.equal(await page.locator('details#retomar').count(), 1, 'pausada: retomada')

  assert.deepEqual(errors, [], 'page errors')
  console.log(
    `OK: página do guia para pais em 4 larguras, barra do celular, cadastro e estados. Capturas em ${output}`,
  )
} finally {
  await browser?.close()
  app.kill()
  gateway.close()
}
