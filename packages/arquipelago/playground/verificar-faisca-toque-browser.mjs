import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const base = process.env.ARQUIPELAGO_QA_URL ?? 'http://127.0.0.1:4530',
  saida = resolve(import.meta.dirname, '../../../output/faisca-qa')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
})
const contexto = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  }),
  page = await contexto.newPage(),
  erros = []
page.on('pageerror', (e) => erros.push(e.message))
try {
  await page.goto(`${base}/macro`)
  await page.waitForFunction(
    () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
    {},
    { timeout: 60000 },
  )
  assert.equal(await page.evaluate(() => matchMedia('(pointer:coarse)').matches), true)
  await page.getByText('Medidas e pontos de teste', { exact: true }).tap()
  const antes = await page.locator('.macro-painel dl').innerText()
  await page.getByText('Medidas e pontos de teste', { exact: true }).tap()
  const cdp = await contexto.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: 85, y: 650 }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: 85, y: 560 }],
  })
  await page.waitForTimeout(2200)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Pular', exact: true }).tap()
  await page.waitForTimeout(450)
  await page.screenshot({ path: resolve(saida, 'toque.png') })
  await page.getByText('Medidas e pontos de teste', { exact: true }).tap()
  const depois = await page.locator('.macro-painel dl').innerText()
  const posicao = (texto) => {
    const valores = texto
      .match(/Posição\s+([^\n]+) m/)?.[1]
      .split(', ')
      .map((v) => Number(v.replace(',', '.')))
    assert.equal(valores?.length, 3, texto)
    assert.ok(valores.every(Number.isFinite), texto)
    return valores
  }
  const inicio = posicao(antes),
    fim = posicao(depois)
  assert.ok(
    Math.hypot(fim[0] - inicio[0], fim[2] - inicio[2]) > 1,
    'Joystick deve deslocar o avatar no plano',
  )
  await page.getByRole('button', { name: 'Campos da Íris', exact: true }).tap()
  await page.getByText('Medidas e pontos de teste', { exact: true }).tap()
  await page.getByRole('button', { name: /Conversar com a Íris/ }).waitFor({ timeout: 25000 })
  await page.getByRole('button', { name: /Conversar com a Íris/ }).tap()
  await page.getByRole('dialog', { name: 'Íris · estudo da personagem' }).waitFor()
  await page.waitForTimeout(1300)
  await page.screenshot({ path: resolve(saida, 'iris-toque.png') })
  await page.getByRole('button', { name: 'Continuar explorando', exact: true }).tap()
  await page.getByRole('button', { name: 'Mapa', exact: true }).tap()
  const mapa = await page.locator('.macro-mapa').boundingBox()
  assert.ok(mapa.x >= 0 && mapa.x + mapa.width <= 390)
  await page.screenshot({ path: resolve(saida, 'mapa-toque.png') })
  await page.getByRole('button', { name: 'Fechar mapa', exact: true }).tap()
  const falha = await browser.newContext({ viewport: { width: 1280, height: 800 } }),
    erroPage = await falha.newPage()
  await falha.route('**/api/faisca3d/coelho.*.glb', (route) =>
    route.fulfill({ status: 503, body: 'falha de ensaio' }),
  )
  await erroPage.goto(`${base}/macro`)
  await erroPage.getByRole('alert').waitFor({ timeout: 60000 })
  await erroPage.waitForTimeout(1500)
  const erro = await erroPage.getByRole('alert').innerText()
  assert.match(erro, /503/)
  await erroPage.screenshot({ path: resolve(saida, 'falha-arte.png') })
  await falha.unroute('**/api/faisca3d/coelho.*.glb')
  await erroPage.getByRole('button', { name: 'Tentar carregar a arte', exact: true }).click()
  await erroPage.waitForFunction(
    () => document.querySelector('.macro-topo')?.getAttribute('data-arte') === 'pronto',
    {},
    { timeout: 60000 },
  )
  assert.equal(await erroPage.getByRole('alert').count(), 0)
  await falha.close()
  assert.equal(erros.length, 0, erros.join('\n'))
  writeFileSync(
    resolve(saida, 'toque.json'),
    JSON.stringify({ antes, depois, mapa, erro, recuperouArte: true, erros }, null, 2),
  )
  console.log(
    'PASS: joystick, pulo, conversa e mapa no toque emulado; falha parcial de arte recuperável',
  )
} finally {
  await contexto.close()
  await browser.close()
}
