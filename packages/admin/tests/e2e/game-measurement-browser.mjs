import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

// Usa a ferramenta de testes já instalada no workspace do Estúdio, sem importar o jogo.
const require = createRequire(new URL('../../../studio/package.json', import.meta.url))
const { chromium } = require('playwright-core')
const origin = `http://127.0.0.1:${process.env.MEDICAO_TEST_PORT ?? 4626}`
const output = path.resolve(
  process.env.MEDICAO_PRINTS ?? 'docs/qa/assets/2026-10-28-arquipelago-medicao',
)
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } })
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(origin)
  await page.getByLabel('De', { exact: true }).fill('2026-10-01')
  await page.getByLabel('Até', { exact: true }).fill('2026-10-28')
  await page.getByRole('button', { name: 'Aplicar período' }).click()
  await page.getByRole('cell', { name: '10', exact: true }).waitFor()
  assert.equal(await page.getByRole('columnheader').count(), 4)
  assert.equal(await page.getByRole('rowheader', { name: '01/10/2026' }).count(), 1)
  const fotografia = page.getByRole('region', {
    name: 'Fotografia atual das aparências',
    exact: true,
  })
  const mudancas = page.getByRole('region', {
    name: 'Mudanças de aparência no período',
    exact: true,
  })
  const numero = (region, titulo) =>
    region
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: titulo, exact: true }) })
      .locator('p')
  assert.equal(await numero(fotografia, 'Aparências do Pinta e Molda').innerText(), '10')
  assert.equal(await numero(mudancas, 'Com origem Pinta ou Molda').innerText(), '5')
  await page.getByLabel('De', { exact: true }).fill('2026-10-20')
  await page.getByLabel('Até', { exact: true }).fill('2026-10-20')
  await page.getByRole('button', { name: 'Aplicar período' }).click()
  await page.getByText('Período: 20/10/2026 a 20/10/2026', { exact: false }).waitFor()
  assert.equal(await numero(fotografia, 'Aparências do Pinta e Molda').innerText(), 'Poucos dados')
  assert.equal(await numero(mudancas, 'Com origem Pinta ou Molda').innerText(), '5')
  await page.screenshot({ path: path.join(output, 'evento-em-outro-dia.png'), fullPage: true })
  await page.getByLabel('De', { exact: true }).fill('2026-10-01')
  await page.getByLabel('Até', { exact: true }).fill('2026-10-28')
  await page.getByRole('button', { name: 'Aplicar período' }).click()
  await page.getByRole('cell', { name: '10', exact: true }).waitFor()
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true })
  await page.getByLabel('Comunidade da medição').selectOption('adulto')
  await page
    .getByText('O histórico de dias de jogo dos adultos ainda não está disponível.', {
      exact: true,
    })
    .waitFor()
  assert.equal(await page.getByRole('table').count(), 0)
  assert.equal(await numero(mudancas, 'Com origem Pinta ou Molda').innerText(), 'Poucos dados')
  await page.getByLabel('Comunidade da medição').selectOption('kids')
  await page.getByRole('table').waitFor()
  // Erro recuperável não vira um relatório vazio nem reutiliza o da comunidade anterior.
  await page.route('**/api/arquipelago/medicao?*', (r) =>
    r.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Serviço local temporariamente indisponível.' } }),
    }),
  )
  await page.getByRole('button', { name: 'Aplicar período' }).click()
  await page.getByRole('alert').waitFor()
  assert.equal(await page.getByRole('table').count(), 0)
  await page.unroute('**/api/arquipelago/medicao?*')
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await page.getByRole('table').waitFor()
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.screenshot({ path: path.join(output, 'celular.png'), fullPage: true })
  await page.setViewportSize({ width: 320, height: 740 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  // O Admin novo aceita a resposta do serviço antigo, sem fabricar eventos zero.
  await page.route('**/api/arquipelago/medicao?*', async (r) => {
    const response = await r.fetch()
    const body = await response.json()
    delete body.mudancasDeAparencia
    await r.fulfill({ response, json: body })
  })
  await page.getByRole('button', { name: 'Aplicar período' }).click()
  await page
    .getByText('O histórico de mudanças ainda não está disponível neste serviço.', { exact: true })
    .waitFor()
  assert.equal(await mudancas.getByRole('article').count(), 0)
  await page.screenshot({ path: path.join(output, 'servico-anterior.png'), fullPage: true })
  assert.deepEqual(errors, [])
  console.log(
    'PASS: fotografia e eventos por data própria, proteção por público, serviço anterior, Postgres real, recuperação de erro e larguras 1366/390/320 sem rolagem lateral.',
  )
} finally {
  await browser.close()
}
