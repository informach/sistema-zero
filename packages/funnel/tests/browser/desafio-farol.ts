import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, type Page } from 'playwright'

// Execute contra um funil local. O catálogo precisa estar disponível ou usar a
// fixture isolada descrita em docs/marketing/kids/desafio-primeiro-jogo/implementacao.md.
// Nenhum contato é enviado e nenhum pagamento é criado.
const origin = process.env.DESAFIO_QA_URL ?? 'http://127.0.0.1:4347'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const output = '../../tmp/desafio-qa'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const base = '/kids/desafio-primeiro-jogo'
const errors: string[] = []
const answers: Record<string, string[]> = {
  idade: ['9_11'],
  equipamento: ['disponivel'],
  interesses: ['joga'],
  experiencia: ['primeira_vez'],
  motivos: ['B'],
  duvida: ['ajuda'],
  formato: ['gravado'],
  abertura_criacao: ['conhecer'],
}
async function consent(page: Page, accept = false) {
  const button = page.getByRole('button', {
    name: accept ? 'Permitir métricas' : 'Continuar sem métricas',
    exact: true,
  })
  if (await button.isVisible()) await button.click()
}
async function answer(page: Page, key: string, values: string[]) {
  await page.locator(`[data-analytics-question="${key}"]`).waitFor()
  for (const value of values) await page.locator(`label:has(input[value="${value}"])`).click()
  const response = page.waitForResponse(
    (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
  )
  await page.locator('.cq-continue').click()
  assert.equal((await response).status(), 200, `Save ${key}`)
}
async function start(page: Page, accept = false) {
  await page.goto(`${origin}${base}/quiz?utm_source=qa_farol&utm_campaign=implementacao`)
  await consent(page, accept)
  await page.locator('[data-analytics-id="desafio-quiz-iniciar"]').click()
  await page.locator('[data-analytics-question="idade"]').waitFor()
}
async function complete(page: Page, overrides: Record<string, string[]> = {}) {
  const sequence = { ...answers, ...overrides }
  for (const key of [
    'idade',
    'equipamento',
    'interesses',
    'experiencia',
    'motivos',
    'prioridade',
    'duvida',
    'formato',
    'abertura_criacao',
    'desencontro',
  ]) {
    if (!sequence[key]) continue
    await answer(page, key, sequence[key]!)
    if (key === 'equipamento' && sequence[key]![0] === 'sem_computador')
      await page.getByRole('button', { name: 'Continuar a orientação', exact: true }).click()
  }
  await page.waitForURL(`**${base}/resultado**`)
  await page.locator('#resultado-title').waitFor()
}
async function noOverflow(page: Page) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
    `Horizontal overflow ${page.url()}`,
  )
}
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  const events: Array<Record<string, unknown>> = []
  page.on('request', (r) => {
    if (r.url().endsWith('/api/analytics/events')) events.push(...r.postDataJSON().events)
  })
  for (const variant of ['', '/tempo-de-tela', '/iniciacao-tecnologica']) {
    const response = await page.goto(
      `${origin}${base}/oferta${variant}?utm_source=qa_farol&email=nao-levar@example.test`,
    )
    assert.equal(response?.status(), 200)
    assert.match(response?.headers()['cache-control'] ?? '', /no-store/)
    await consent(page)
    await page.evaluate(() =>
      document.querySelectorAll('img').forEach((img) => {
        img.loading = 'eager'
      }),
    )
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (img) => !img.getAttribute('src') || (img.complete && img.naturalWidth > 0),
      ),
    )
    await noOverflow(page)
    assert.equal(await page.locator('#duvidas details').count(), 19)
    const how = await page
      .locator('[data-analytics-id="desafio-nav-como-funciona"]')
      .getAttribute('href')
    assert.ok(how?.includes('utm_source=qa_farol'))
    assert.ok(!how?.includes('email'))
    const id = variant.slice(1) || 'primeiro-jogo'
    await page.screenshot({ path: `${output}/${id}-desktop.png` })
    await page.setViewportSize({ width: 390, height: 844 })
    await noOverflow(page)
    await page.screenshot({ path: `${output}/${id}-mobile.png` })
    await page.locator('footer').scrollIntoViewIfNeeded()
    assert.ok(
      (await page.locator('footer img').boundingBox())!.height < 30,
      'Footer logo keeps shared proportions',
    )
    await page.screenshot({ path: `${output}/footer-mobile.png` })
    await page.setViewportSize({ width: 1440, height: 1000 })
  }
  await page.locator('#duvida-5 summary').click()
  await page.locator('#duvida-5 a[data-zoom]').first().click()
  await page.getByRole('dialog', { name: 'Imagem ampliada' }).waitFor()
  await page.keyboard.press('Escape')
  await page.locator('[data-analytics-id="desafio-hero-comprar"]').click()
  await page.getByRole('textbox', { name: 'Nome do responsável', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.goto(`${origin}${base}/oferta?cupom=QA10`)
  if (process.env.DESAFIO_QA_FIXTURE === '1')
    assert.match(await page.locator('.df-price').innerText(), /57/)
  const alias = await context.request.get(
    `${origin}${base}/oferta/primeiro-jogo?utm_source=qa_farol`,
    { maxRedirects: 0 },
  )
  assert.equal(alias.status(), 301)
  assert.ok(alias.headers().location?.includes('utm_source=qa_farol'))
  assert.equal(
    (await context.request.get(`${origin}${base}/oferta/expressao-visual`)).status(),
    404,
  )

  // Sem respostas, nunca há um resultado presumido; a atribuição precisa sobreviver ao retorno.
  await page.goto(`${origin}${base}/resultado?utm_source=qa_farol`)
  assert.ok(new URL(page.url()).pathname.endsWith('/quiz'))
  assert.equal(new URL(page.url()).searchParams.get('utm_source'), 'qa_farol')
  await start(page)
  // Falha de rede conserva a seleção e permite repetir sem duplicar revisão.
  let failOnce = true
  await page.route('**/api/leads', async (route) => {
    if (failOnce && route.request().method() === 'PATCH') {
      failOnce = false
      await route.abort()
      return
    }
    await route.continue()
  })
  await page.locator('label:has(input[value="9_11"])').click()
  await page.locator('.cq-continue').click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.locator('input[value="9_11"]').isChecked(), true)
  await page.unroute('**/api/leads')
  await complete(page)
  await noOverflow(page)
  const cta = page.locator('[data-analytics-id="desafio-resultado-oferta"]')
  assert.match((await cta.getAttribute('href'))!, /\/oferta\?utm_source=qa_farol/)
  assert.ok(!(await cta.getAttribute('href'))!.includes('perfil='))
  await page.screenshot({ path: `${output}/resultado-desktop.png` })
  await page.setViewportSize({ width: 390, height: 844 })
  await noOverflow(page)
  await page.screenshot({ path: `${output}/resultado-mobile.png` })
  // Métricas: o resultado mede o destino, sem copiar texto personalizado.
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click()
  const analyticsReady = page.waitForResponse(
    (r) => r.url().endsWith('/api/analytics/events') && r.ok(),
  )
  await consent(page, true)
  await analyticsReady
  await cta.click()
  await page.waitForURL(`**${base}/oferta**`)
  await page.waitForTimeout(6000)
  assert.ok(events.some((e) => e.name === 'click' && e.elementId === 'desafio-resultado-oferta'))
  assert.ok(events.filter((e) => String(e.path).includes('/resultado')).every((e) => !e.label))
  await page.goto(`${origin}${base}/quiz#rever`)
  await page
    .getByRole('button', { name: /^Editar: .*além|^Editar:/ })
    .first()
    .waitFor()
  const before = (await context.cookies()).find((c) => c.name === 'funil_lead')?.value
  await page.getByRole('button', { name: 'Responder pensando em outro filho', exact: true }).click()
  await page.locator('[data-analytics-question="idade"]').waitFor()
  const after = (await context.cookies()).find((c) => c.name === 'funil_lead')?.value
  assert.ok(before && after)
  assert.notEqual(before, after)
  await answer(page, 'idade', ['menos_9'])
  await page.getByRole('heading', { name: /Esta orientação foi pensada/ }).waitFor()
  assert.equal(await page.locator('[data-checkout-cta]').count(), 0)
  await context.close()

  for (const scenario of [
    {
      id: 'prioridade-A',
      override: { motivos: ['A', 'C'], prioridade: ['A'], interesses: ['inventa_historias'] },
      route: '/tempo-de-tela',
    },
    { id: 'iniciacao-D', override: { motivos: ['D'] }, route: '/iniciacao-tecnologica' },
    {
      id: 'empate',
      override: { motivos: ['A', 'C'], prioridade: ['iguais'] },
      text: 'Você deu o mesmo peso',
    },
    {
      id: 'sem-computador',
      override: { equipamento: ['sem_computador'] },
      text: 'Hoje vocês têm celular ou tablet',
    },
    {
      id: 'recusa-desenho',
      override: {
        motivos: ['C'],
        interesses: ['desenha'],
        abertura_criacao: ['outra_atividade'],
        desencontro: ['desenho'],
      },
      text: 'Vocês procuram uma atividade centrada em desenhar',
    },
  ] as Array<{ id: string; override: Record<string, string[]>; route?: string; text?: string }>) {
    const cx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    const tab = await cx.newPage()
    tab.on('pageerror', (e) => errors.push(e.message))
    await start(tab)
    await complete(tab, scenario.override)
    await noOverflow(tab)
    if (scenario.route)
      assert.ok(
        (
          await tab.locator('[data-analytics-id="desafio-resultado-oferta"]').getAttribute('href')
        )?.includes(scenario.route),
      )
    if (scenario.text) assert.ok((await tab.locator('main').innerText()).includes(scenario.text))
    if (scenario.id === 'sem-computador' || scenario.id === 'recusa-desenho') {
      assert.equal(await tab.locator('[data-analytics-id="desafio-resultado-oferta"]').count(), 0)
      assert.equal(
        await tab.locator('[data-analytics-id="desafio-resultado-experiencia"]').count(),
        0,
      )
    }
    if (scenario.id === 'recusa-desenho')
      assert.ok(
        !(await tab.locator('#convite-para-conversar').innerText()).includes(
          'Mostre a cena do jogo',
        ),
      )
    await tab.screenshot({ path: `${output}/${scenario.id}.png` })
    await cx.close()
  }
  assert.deepEqual(errors, [])
  if (process.env.DESAFIO_QA_FIXTURE === '1') {
    const cx = await browser.newContext()
    const mode = async (value: string) => {
      const res = await cx.request.post('http://127.0.0.1:3347/__qa/catalog', {
        data: { mode: value },
      })
      assert.equal(res.status(), 200)
    }
    try {
      await mode('changed_price')
      const tab = await cx.newPage()
      // O catálogo compartilhado tem cache visual de 60s; a cotação de cupom é
      // autoritativa e deve corrigir tanto preço cheio quanto final imediatamente.
      await tab.goto(`${origin}${base}/oferta?cupom=QA10`)
      assert.match(await tab.locator('.df-price').innerText(), /67/)
      assert.match(await tab.locator('.df-price-card s').innerText(), /77/)
      await mode('unavailable')
      await tab.goto(`${origin}${base}/quiz`)
      assert.ok(
        await tab.locator('[data-analytics-id="desafio-quiz-iniciar"]').isVisible(),
        'Orientation remains available without catalog',
      )
    } finally {
      await mode('available')
      await cx.close()
    }
  }
  console.log(
    'Passed: three offers, mobile/desktop, 19 FAQs, screenshots/zoom, footer, pre-checkout, coupon, attribution, quiz result, network recovery, restart, age, A/D routing, ties, device restriction, refusal and result analytics without personal text.',
  )
} finally {
  await browser.close()
}
