import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, type Page } from 'playwright'
import { DESAFIO_QUESTIONS } from '../../src/funnels/desafio-primeiro-jogo/quiz/questions'

// O resultado em carta do quiz Kids do Desafio (v5, 21/10/2026): a carta inteira a 390 e 1440 px,
// "Esse resultado parece com você?", rever e mudar uma resposta (a carta nova abre na hora) e responder
// pensando em outra criança (lead novo, quiz do começo). Rode contra o funil local com banco
// (`DESAFIO_QA_URL`, padrão http://127.0.0.1:4347); `QA_CHROMIUM_PATH` usa um Chromium já
// instalado. Nenhum contato é enviado e nenhum pagamento é criado.
const origin = process.env.DESAFIO_QA_URL ?? 'http://127.0.0.1:4347'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const base = '/kids/desafio-primeiro-jogo'
const output = '../../tmp/desafio-qa'
await mkdir(output, { recursive: true })
const browser = await chromium.launch(
  process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
)
const errors: string[] = []
const respostas: [string, string][] = [
  ['idade', '9_12'],
  ['tempo_tela', 'mais_4'],
  ['computador', 'celular_tablet'],
  ['cena', 'A'],
  ['trava', 'desiste'],
  ['cena_desejada', 'A'],
  ['garantia', 'tempo_tela'],
  ['sintese', 'A'],
]
const label = (key: string, value: string) =>
  DESAFIO_QUESTIONS.find((s) => s.key === key)!.opcoes.find((o) => o.value === value)!.label
async function answer(page: Page, key: string, value: string) {
  await page.locator(`main[data-analytics-question="${key}"]`).waitFor()
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
  )
  await page
    .locator(`main .qz-opcao:has(span:text-is(${JSON.stringify(label(key, value))}))`)
    .click()
  assert.equal((await saved).status(), 200, key)
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
    viewport: { width: 390, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(`${origin}${base}/quiz?utm_source=qa_farol`)
  await page.locator('.qz-carta-genero--filho').click()
  for (const [key, value] of respostas) await answer(page, key, value)
  await page.waitForURL(`**${base}/resultado**`)
  await page.locator('.rc-titulo').waitFor()

  // A carta: título do perfil A, 4 títulos, a tela do jogo, o relato e o botão das dúvidas (só
  // celular ou tablet não atende).
  assert.equal(
    await page.locator('.rc-titulo').innerText(),
    'O tempo que seu filho passa no jogo pode virar um jogo feito por ele',
  )
  assert.equal(await page.locator('.rc-h').count(), 4)
  assert.equal(await page.locator('.rc-tela img[src$="farol-jogo.png"]').count(), 1)
  assert.equal(await page.locator('.rc-relato').count(), 1)
  assert.ok((await page.locator('mark').count()) >= 4)
  const botao = page.locator('[data-analytics-id="resultado-oferta"]')
  assert.equal(await botao.innerText(), 'Ver os requisitos e como funciona')
  assert.equal(await botao.getAttribute('href'), `${base}/oferta?utm_source=qa_farol#duvidas`)
  await noOverflow(page)
  await page.screenshot({ path: `${output}/resultado-390.png`, fullPage: true })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await noOverflow(page)
  await page.screenshot({ path: `${output}/resultado-1440.png`, fullPage: true })

  // "Esse resultado parece com você?" grava uma vez.
  // A ilha é `client:visible`: só responde ao clique depois de hidratar (o Astro tira o `ssr`).
  const sim = page.getByRole('button', { name: 'Sim', exact: true })
  await sim.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => !document.querySelector('astro-island[ssr]'))
  const feedback = page.waitForResponse((r) => r.url().includes('/api/leads/quiz-feedback'))
  await sim.click()
  assert.equal((await feedback).status(), 201)

  // Rever: mudar o computador troca o botão da carta para o do perfil.
  await page.getByRole('link', { name: 'Rever as respostas' }).click()
  await page.getByRole('heading', { name: 'Suas respostas' }).waitFor()
  await page.getByRole('button', { name: /^Mudar: Ele tem um computador/ }).click()
  // Com o quiz completo, a resposta mudada leva direto à carta nova.
  await answer(page, 'computador', 'so_dele')
  await page.waitForURL(`**${base}/resultado**`)
  await page.locator('.rc-titulo').waitFor()
  assert.equal(
    await page.locator('[data-analytics-id="resultado-oferta"]').innerText(),
    'Ver como ele faz o primeiro jogo',
  )

  // Outra criança: lead novo, quiz do começo.
  await page.getByRole('link', { name: 'Responder pensando em outra criança' }).click()
  await page.locator('[data-analytics-question="genero"] .qz-carta-genero').first().waitFor()
  await context.close()
  assert.deepEqual(errors, [])
  console.log('PASS resultado Kids: carta, feedback, rever e outra criança; nenhum erro de página')
} finally {
  await browser.close()
}
