import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium, type Page } from 'playwright'
import { paraFeminino } from '../../src/funnels/comunidade-dos-criadores/quiz/genero'
import { DESAFIO_ADULTO_QUESTIONS } from '../../src/funnels/desafio-adulto/quiz/questions'
import { DESAFIO_QUESTIONS } from '../../src/funnels/desafio-primeiro-jogo/quiz/questions'

// Regressão de jornada dos dois quizzes do Desafio (v5 Kids e v1 adulto, 21/10/2026): nenhuma tela
// antes do resultado cita o Desafio, o jogo, a oferta ou o preço, inclusive as saídas (18 ou mais
// no Kids, menos de 18 no adulto). Usa a API e o banco locais, sem contato, checkout, pagamento ou
// envio de mensagens. Rode contra o funil local (`DESAFIO_QA_URL`, padrão http://127.0.0.1:4347);
// `QA_CHROMIUM_PATH` usa um Chromium já instalado (na nuvem, /opt/pw-browsers/chromium).
const origin = process.env.DESAFIO_QA_URL ?? 'http://127.0.0.1:4347'
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
const kids = '/kids/desafio-primeiro-jogo'
const adulto = '/pro/desafio-primeiro-jogo'
const output = '../../tmp/desafio-quiz-frio'
await mkdir(output, { recursive: true })
const browser = await chromium.launch(
  process.env.QA_CHROMIUM_PATH ? { executablePath: process.env.QA_CHROMIUM_PATH } : {},
)
const errors: string[] = []
// "curso" fica de fora: "Não ser curso de criança" é o medo do adulto nas palavras dele (Canvas).
const product =
  /Desafio|Chave do Farol|Farol|Comunidade|R\$\s*\d|30 dias|Mural|Estúdio|pagamento|oferta|plataforma|preço|prazo|\baulas?\b/i

async function noOverflow(page: Page) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
    false,
    `Horizontal overflow ${page.url()}`,
  )
}
async function coldScreen(page: Page) {
  const texto = await page.locator('main').innerText()
  // ⚠️ Uma tela VAZIA também "não cita o produto": a ilha precisa ter montado.
  assert.ok(texto.trim().length > 20, 'a tela está vazia: a ilha do quiz não montou?')
  assert.doesNotMatch(texto, product, page.url())
  assert.doesNotMatch(await page.title(), product)
  assert.doesNotMatch(
    (await page.locator('meta[name="description"]').getAttribute('content')) ?? '',
    product,
  )
  // O quiz adulto não tem imagem de prévia: o jogo só aparece no resultado.
  const og = page.locator('meta[property="og:image"]')
  if (await og.count()) assert.doesNotMatch((await og.getAttribute('content')) ?? '', /farol|capa/i)
  assert.equal(
    await page.locator('a[href*="/oferta"], [data-checkout-cta], img[src*="farol"]').count(),
    0,
  )
  await noOverflow(page)
}
/** A criança da vez: para uma filha, as opções aparecem no feminino. */
let filha = false
const label = (key: string, value: string, adult = false) => {
  const step = (adult ? DESAFIO_ADULTO_QUESTIONS : DESAFIO_QUESTIONS).find((s) => s.key === key)
  const o = step?.opcoes.find((x) => x.value === value)
  assert.ok(o, `${key}=${value}`)
  return filha && !adult ? paraFeminino(o.label) : o.label
}
/** Toca na opção da pergunta da tela (grava e segue) e confere a resposta da API. */
async function answer(page: Page, key: string, value: string, adult = false) {
  await page.locator(`main[data-analytics-question="${key}"]`).waitFor()
  await coldScreen(page)
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
  )
  const texto = label(key, value, adult)
  if (key === 'idade' && value === '18_mais')
    await page.locator('main .qz-link--centro', { hasText: texto }).click()
  else await page.locator(`main .qz-opcao:has(span:text-is(${JSON.stringify(texto)}))`).click()
  assert.equal((await saved).status(), 200, key)
}
async function genero(page: Page, value: 'filho' | 'filha') {
  await page.locator('[data-analytics-question="genero"] .qz-carta-genero').first().waitFor()
  await coldScreen(page)
  const saved = page.waitForResponse(
    (r) => r.url().endsWith('/api/leads') && r.request().method() === 'PATCH',
  )
  filha = value === 'filha'
  await page.locator(`.qz-carta-genero--${value}`).click()
  assert.equal((await saved).status(), 200, 'genero')
}
async function newPage(width = 390) {
  const context = await browser.newContext({
    viewport: { width, height: 900 },
    reducedMotion: 'reduce',
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  return { context, page }
}

const kids917: [string, string][] = [
  ['idade', '13_17'],
  ['tempo_tela', '2_4'],
  ['computador', 'dividido'],
  ['cena', 'B'],
  ['trava', 'chama'],
  ['cena_desejada', 'B'],
  ['garantia', 'ajuda'],
  ['sintese', 'B'],
]
const kidsM9: [string, string][] = [
  ['idade', 'menos_9'],
  ['m9_leitura', 'comecando'],
  ['m9_computador', 'organizar'],
  ['m9_tempo_juntos', 'duas_tres'],
  ['m9_cena', 'B'],
  ['m9_cena_desejada', 'B'],
  ['m9_garantia', 'ao_vivo'],
  ['m9_sintese', 'B'],
]
const adulto8: [string, string][] = [
  ['computador', 'meu'],
  ['programacao', 'nunca'],
  ['tempo_livre', '1_3'],
  ['cena', 'B'],
  ['tentativa', 'fechei'],
  ['cena_desejada', 'B'],
  ['garantia', 'terminar'],
  ['sintese', 'B'],
]

try {
  // Kids, de 9 a 17: entrada, oito telas e o resultado com o botão para /oferta.
  {
    const { context, page } = await newPage()
    const anuncio = '?utm_source=qa_quiz_frio&cupom=QAQUIZ'
    assert.equal((await page.goto(`${origin}${kids}/quiz${anuncio}`))?.status(), 200)
    await coldScreen(page)
    await page.screenshot({ path: `${output}/kids-entrada-390.png`, fullPage: true })
    await genero(page, 'filha')
    for (const [key, value] of kids917) await answer(page, key, value)
    await page.waitForURL(`**${kids}/resultado**`)
    await page.locator('.rc-titulo').waitFor()
    assert.match(await page.locator('.rc-titulo').innerText(), /sua filha/)
    assert.match(await page.locator('main').innerText(), /Desafio do Primeiro Jogo/)
    // O cupom e as UTMs do anúncio chegam à oferta, que só lê o cupom da própria URL.
    assert.equal(
      await page.locator('[data-analytics-id="resultado-oferta"]').getAttribute('href'),
      `${kids}/oferta${anuncio}`,
    )
    assert.match(
      await page.locator('.rc-cta-nota').innerText(),
      /^O preço aparece na próxima página/,
    )
    await noOverflow(page)
    await page.screenshot({ path: `${output}/kids-resultado-390.png`, fullPage: true })
    await context.close()
    console.log('PASS Kids 9 a 17 até o resultado')
  }
  // Kids, menor de 9 com professor ao vivo: o botão aponta as dúvidas da página de criar junto.
  {
    const { context, page } = await newPage(1440)
    await page.goto(`${origin}${kids}/quiz?manchete=tela`)
    assert.match(await page.locator('h1').innerText(), /passa horas na tela/)
    await genero(page, 'filho')
    for (const [key, value] of kidsM9) await answer(page, key, value)
    await page.waitForURL(`**${kids}/resultado**`)
    await page.locator('.rc-titulo').waitFor()
    assert.equal(
      await page.locator('[data-analytics-id="resultado-oferta"]').getAttribute('href'),
      `${kids}/oferta/criar-junto#sessao`,
    )
    assert.equal(await page.locator('.rc--kids-m9').count(), 1)
    await noOverflow(page)
    await page.screenshot({ path: `${output}/kids-m9-resultado-1440.png`, fullPage: true })
    await context.close()
    console.log('PASS Kids menor de 9 até o resultado')
  }
  // Kids, 18 ou mais: a saída leva ao quiz adulto do Desafio, sem citar o produto.
  {
    const { context, page } = await newPage()
    await page.goto(`${origin}${kids}/quiz?utm_source=qa_saida`)
    await genero(page, 'filho')
    await answer(page, 'idade', '18_mais')
    const saida = page.locator('[data-analytics-id="quiz-desafio-kids-saida-adulto"]')
    await saida.waitFor()
    await coldScreen(page)
    assert.equal(await saida.getAttribute('href'), `${adulto}/quiz?utm_source=qa_saida`)
    await page.screenshot({ path: `${output}/kids-saida-adulto-390.png`, fullPage: true })
    await context.close()
    console.log('PASS Kids saída de 18 ou mais')
  }
  // Adulto: "Começar", oito telas e o resultado com o botão para a página adulta.
  {
    const { context, page } = await newPage()
    assert.equal((await page.goto(`${origin}${adulto}/quiz`))?.status(), 200)
    await coldScreen(page)
    assert.equal(await page.locator('.qz-marca-nome').count(), 0)
    await page.screenshot({ path: `${output}/adulto-entrada-390.png`, fullPage: true })
    await page.locator('[data-analytics-id="quiz-desafio-adulto-comecar"]').click()
    for (const [key, value] of adulto8) await answer(page, key, value, true)
    await page.waitForURL(`**${adulto}/resultado**`)
    await page.locator('.rc-titulo').waitFor()
    assert.equal(await page.locator('.rc--adulto').count(), 1)
    assert.equal(await page.locator('.rc-relato').count(), 0)
    assert.equal(
      await page.locator('[data-analytics-id="resultado-oferta"]').getAttribute('href'),
      `${adulto}/oferta`,
    )
    await noOverflow(page)
    await page.screenshot({ path: `${output}/adulto-resultado-390.png`, fullPage: true })
    await context.close()
    console.log('PASS adulto até o resultado')
  }
  // Adulto, menos de 18: a saída leva ao quiz Kids do Desafio e o Voltar devolve à entrada.
  {
    const { context, page } = await newPage(1440)
    await page.goto(`${origin}${adulto}/quiz?manchete=ideia`)
    assert.match(await page.locator('h1').innerText(), /ideia de jogo/)
    await page.locator('[data-analytics-id="quiz-desafio-adulto-menor-de-18"]').click()
    const saida = page.locator('[data-analytics-id="quiz-desafio-adulto-saida-kids"]')
    await saida.waitFor()
    await coldScreen(page)
    assert.equal(await saida.getAttribute('href'), `${kids}/quiz`)
    await page.getByRole('button', { name: 'Voltar' }).click()
    await page.locator('[data-analytics-id="quiz-desafio-adulto-comecar"]').waitFor()
    await context.close()
    console.log('PASS adulto saída de menos de 18')
  }
  assert.deepEqual(errors, [])
  console.log('PASS nenhuma tela antes do resultado cita o produto; nenhum erro de página')
} finally {
  await browser.close()
}
