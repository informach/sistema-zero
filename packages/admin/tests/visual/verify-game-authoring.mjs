import { strict as assert } from 'node:assert'
import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const { chromium } = createRequire(resolve('packages/agent-integrations/package.json'))(
  'playwright-core',
)
const baseUrl = process.argv[2]
if (!baseUrl || !/^http:\/\/127\.0\.0\.1:\d+\/$/.test(baseUrl))
  throw new Error('Pass the fresh local preview URL')
const browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 30000 })
const timer = setTimeout(() => browser.close(), 120000)
console.log('browser launched')
const results = []
const errors = []
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  page.setDefaultTimeout(15000)
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  page.on('dialog', (d) => d.accept())
  await page.goto(baseUrl)
  await page.getByRole('button', { name: 'Abrir desafio', exact: true }).click()
  await page.getByLabel('Título', { exact: true }).fill('Minha edição preservada')
  await page.request.post(new URL('__qa/conflict', baseUrl).href)
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'Sua edição permanece aqui' }).waitFor()
  assert.equal(
    await page.getByLabel('Título', { exact: true }).inputValue(),
    'Minha edição preservada',
  )
  results.push('409 preserves draft')
  await page.getByRole('button', { name: 'Abrir desafio', exact: true }).click()
  await page.getByLabel('Título', { exact: true }).fill('A cor revisada')
  await page.getByRole('button', { name: 'Salvar rascunho', exact: true }).click()
  await page.getByText('Rascunho salvo. Analise antes de publicar.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Analisar desafio', exact: true }).click()
  await page.getByText('Sem impedimentos de publicação.', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Publicar revisão', exact: true }).click()
  await page
    .getByText('Publicado. Esta revisão já pode aparecer no jogo.', { exact: true })
    .waitFor()
  results.push('edit/save/analyze/publish HTTP fixture')
  await page.getByRole('button', { name: 'Adultos', exact: true }).click()
  await page
    .getByText('Nenhum desafio nesta seleção. Comece por um dos seis quadros da ilha.', {
      exact: true,
    })
    .waitFor()
  results.push('audience list isolation')
  await page.getByRole('button', { name: 'Novo desafio', exact: true }).click()
  await page.getByRole('button', { name: 'Editar projeto inicial', exact: true }).click()
  await page.getByRole('dialog').waitFor()
  await page.locator('.blocklySvg').first().waitFor({ state: 'visible', timeout: 60000 })
  await page.screenshot({ path: '.cache/game-editor-desktop.png' })
  const dialog = await page.getByRole('dialog').innerText()
  await writeFile('.cache/game-editor-text.txt', dialog)
  await page.getByRole('button', { name: 'Usar no rascunho', exact: true }).click()
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 30000 })
  results.push('real embedded Studio opens and flushes')
  await page.screenshot({ path: '.cache/game-admin-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '.cache/game-admin-mobile.png', fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  results.push('390px without horizontal overflow')
  assert.deepEqual(errors, [
    'Failed to load resource: the server responded with a status of 409 (Conflict)',
  ])
  console.log(JSON.stringify({ results, errors }))
} catch (e) {
  console.error(e)
  console.error(JSON.stringify({ results, errors }))
  process.exitCode = 1
} finally {
  clearTimeout(timer)
  await browser.close()
}
