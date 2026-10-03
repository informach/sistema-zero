import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, type Page } from 'playwright'

// Regressão de jornada: não antecipa produto, demonstração ou oferta no quiz.
// Usa API/DB locais, sem contato, checkout, pagamento ou envio de mensagens.
const origin = process.env.DESAFIO_QA_URL ?? 'http://localhost:4321'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const base = '/kids/desafio-primeiro-jogo'
const output = '../../tmp/desafio-quiz-frio'
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
const errors: string[] = []
const product =
  /Desafio do Primeiro Jogo|Chave do Farol|Comunidade dos Criadores|R\$\s*\d|30 dias|Mural|Estúdio/i

async function noOverflow(page: Page) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
  )
}
async function coldScreen(page: Page) {
  const texto = await page.locator('main').innerText()
  // ⚠️ Uma tela VAZIA também "não cita o produto": com o servidor de desenvolvimento em mau
  // estado a ilha do quiz não montava e esta checagem passava sozinha (03/10/2026).
  assert.ok(texto.trim().length > 40, 'a tela está vazia: a ilha do quiz não montou?')
  assert.doesNotMatch(texto, product)
  assert.doesNotMatch(await page.title(), product)
  assert.doesNotMatch(
    (await page.locator('meta[name="description"]').getAttribute('content')) ?? '',
    product,
  )
  assert.doesNotMatch(
    (await page.locator('meta[property="og:image"]').getAttribute('content')) ?? '',
    /farol|capa/i,
  )
  assert.equal(
    await page.locator('a[href*="/oferta"], [data-checkout-cta], img[src*="farol-"]').count(),
    0,
  )
  await noOverflow(page)
}
async function answer(page: Page, key: string, values: string[]) {
  await page.locator(`[data-analytics-question="${key}"]`).waitFor()
  await coldScreen(page)
  for (const value of values) await page.locator(`label:has(input[value="${value}"])`).click()
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
  )
  await page.locator('.cq-continue').click()
  assert.equal((await saved).status(), 200, key)
}
const defaults: Record<string, string[]> = {
  idade: ['9_11'],
  equipamento: ['disponivel'],
  interesses: ['joga'],
  experiencia: ['primeira_vez'],
  motivos: ['B'],
  duvida: ['ajuda'],
  formato: ['gravado'],
  abertura_criacao: ['conhecer'],
}
const scenarios: Array<{ name: string; overrides: Record<string, string[]>; path?: string }> = [
  { name: 'primeiro-jogo', overrides: {}, path: `${base}/oferta` },
  {
    name: 'prioridade',
    overrides: { motivos: ['A', 'C'], prioridade: ['A'], interesses: ['desenha'] },
    path: `${base}/oferta/tempo-de-tela`,
  },
  {
    name: 'tecnologia',
    overrides: { motivos: ['D'], formato: ['prefere_ao_vivo'] },
    path: `${base}/oferta/iniciacao-tecnologica`,
  },
  {
    name: 'outra-atividade',
    overrides: { motivos: ['C'], abertura_criacao: ['outra_atividade'], desencontro: ['desenho'] },
    path: '/kids/comunidade-dos-criadores/oferta/expressao-visual',
  },
  {
    name: 'sem-computador',
    overrides: { equipamento: ['sem_computador'] },
    path: `${base}/oferta#requisitos`,
  },
  { name: 'fora-da-faixa', overrides: { idade: ['menos_9'] } },
]
try {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    })
    const page = await context.newPage()
    page.on('pageerror', (e) => errors.push(e.message))
    const response = await page.goto(`${origin}${base}/quiz?utm_source=qa_quiz_frio`)
    assert.equal(response?.status(), 200)
    await coldScreen(page)
    if (scenario.name === 'primeiro-jogo') {
      await page.screenshot({ path: `${output}/entrada-mobile.png`, fullPage: true })
      await page.setViewportSize({ width: 1440, height: 1000 })
      await noOverflow(page)
      await page.screenshot({ path: `${output}/entrada-desktop.png`, fullPage: true })
      await page.setViewportSize({ width: 390, height: 844 })
    }
    await page.locator('[data-analytics-id="desafio-quiz-iniciar"]').click()
    const sequence = { ...defaults, ...scenario.overrides }
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
      if (key === 'idade' && scenario.name === 'fora-da-faixa') {
        await page
          .getByRole('heading', {
            name: 'Esta orientação foi pensada para famílias com filhos de 9 a 14 anos.',
          })
          .waitFor()
        await coldScreen(page)
        break
      }
      if (key === 'equipamento' && scenario.name === 'sem-computador') {
        await page.getByRole('button', { name: 'Continuar a orientação', exact: true }).waitFor()
        await coldScreen(page)
        await page.getByRole('button', { name: 'Continuar a orientação', exact: true }).click()
      }
      if (key === 'interesses' && scenario.name === 'primeiro-jogo') {
        await page.locator('[data-analytics-question="experiencia"]').waitFor()
        await page.getByRole('button', { name: 'Rever respostas', exact: true }).click()
        await page.getByRole('heading', { name: 'O que você gostaria de ajustar?' }).waitFor()
        await coldScreen(page)
        await page.getByRole('button', { name: 'Continuar o quiz', exact: true }).click()
      }
    }
    if (scenario.path) {
      await page.waitForURL(`**${base}/resultado**`)
      assert.match(await page.locator('main').innerText(), /Desafio do Primeiro Jogo/)
      const links = await page
        .locator('main a[href]')
        .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).href))
      assert.ok(
        links.some((href) => {
          const url = new URL(href)
          return (
            `${url.pathname}${url.hash}` === scenario.path &&
            url.searchParams.get('utm_source') === 'qa_quiz_frio'
          )
        }),
        `Destino ${scenario.path}`,
      )
      if (scenario.name === 'primeiro-jogo') {
        assert.match(
          await page.locator('main').innerText(),
          /primeira experiência dentro da plataforma/,
        )
        assert.match(await page.locator('main').innerText(), /assinatura é uma escolha separada/)
        await page.screenshot({ path: `${output}/resultado-mobile.png`, fullPage: true })
      }
      if (scenario.name === 'outra-atividade')
        assert.equal(
          await page.locator('[data-analytics-id="desafio-resultado-experiencia"]').count(),
          0,
        )
      await noOverflow(page)
    }
    await context.close()
    console.log(`PASS ${scenario.name}`)
  }
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    assert.equal((await page.goto(origin))?.status(), 200)
    assert.match(await page.locator('h1').innerText(), /Tempo de tela/)
    assert.equal(await page.locator('.bio-links a').count(), 4)
    await noOverflow(page)
    await page.screenshot({ path: `${output}/bio-${width}.png`, fullPage: true })
  }
  await context.close()
  assert.deepEqual(errors, [])
  console.log('PASS bio desktop/mobile; jornada sem exposição antecipada; nenhum erro de página')
} finally {
  await browser.close()
}
