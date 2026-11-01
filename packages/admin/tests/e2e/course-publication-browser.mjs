import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(new URL('../../../studio/package.json', import.meta.url))
const { chromium } = require('playwright-core')
const origin = `http://127.0.0.1:${process.env.COURSE_PUBLICATION_QA_PORT ?? 5391}`
const output = path.resolve(
  process.env.COURSE_PUBLICATION_PRINTS ??
    '.cache/course-audience-sync/publication-browser-evidence-r1',
)
await mkdir(output)
const browser = await chromium.launch({
  ...(process.env.COURSE_PUBLICATION_CHROMIUM
    ? { executablePath: process.env.COURSE_PUBLICATION_CHROMIUM }
    : { channel: 'chrome' }),
  headless: true,
})
const errors = [],
  responses = [],
  steps = []
const startedAt = new Date().toISOString()
const deadline = setTimeout(() => {
  void browser.close()
}, 180_000)
let page
try {
  page = await browser.newPage({ viewport: { width: 1366, height: 1000 } })
  page.setDefaultTimeout(15_000)
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('response', (response) => {
    if (response.status() >= 400) responses.push({ status: response.status(), url: response.url() })
  })
  const open = async (scenario) => {
    await page.goto(`${origin}/?scenario=${scenario}`)
    await page
      .getByRole('button', {
        name: scenario === 'promote' ? 'Promover para produção' : 'Publicar no adulto',
        exact: true,
      })
      .click()
    await page.getByRole('dialog').waitFor()
  }
  await open('ready')
  const input = page.getByLabel('Endereço do curso adulto', { exact: true })
  await page.getByText('Consultando publicações', { exact: true }).waitFor({ state: 'hidden' })
  const slug = await input.inputValue()
  await input.fill('endereço inválido/')
  await page.getByRole('button', { name: 'Conferir destino', exact: true }).click()
  await page.getByRole('alert').waitFor()
  await input.fill(slug)
  await page.getByRole('button', { name: 'Conferir destino', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).waitFor()
  assert.match(await page.getByRole('dialog').innerText(), /Kids · Staging/)
  assert.match(await page.getByRole('dialog').innerText(), /Adulto · Staging/)
  await page.screenshot({ path: path.join(output, 'desktop-preview.png'), fullPage: true })
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).click()
  await page.getByText('Curso publicado', { exact: true }).waitFor({ timeout: 20_000 })
  assert.match(await page.getByRole('dialog').innerText(), /2 de 2 recursos preparados/)
  assert.match(await page.getByRole('dialog').innerText(), /foi criado/)
  await page.screenshot({ path: path.join(output, 'desktop-completed.png'), fullPage: true })
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Publicar no adulto', exact: true }).click()
  await page.getByText('Curso publicado', { exact: true }).waitFor()
  steps.push('prévia, validação, publicação e reabertura no computador')

  await page.setViewportSize({ width: 390, height: 844 })
  await open('hold')
  await page.getByRole('button', { name: 'Conferir destino', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).click()
  await page
    .getByText('Preparando mídias e material do Zappy', { exact: true })
    .waitFor({ timeout: 10_000 })
  await page.getByRole('button', { name: 'Fechar', exact: true }).click()
  await page.getByRole('button', { name: 'Publicar no adulto', exact: true }).click()
  await page.getByText('Preparando mídias e material do Zappy', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Cancelar trabalho', exact: true }).click()
  await page.getByText('Publicação cancelada', { exact: true }).waitFor()
  await page.screenshot({ path: path.join(output, 'mobile-cancelled.png'), fullPage: true })
  const cancelled = await page.getByRole('dialog').innerText()
  assert.match(cancelled, /Publicação cancelada/)
  steps.push('fechar, reabrir e cancelar enquanto o provedor está em andamento')

  await open('fail')
  await page.getByRole('button', { name: 'Conferir destino', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).click()
  // Free the held request only now. The cancelled worker must never publish its result.
  await page.request.post(`${origin}/__qa/release`)
  // The provider for this scenario must fail once regardless of the held resource release.
  await page.getByText('Publicação interrompida', { exact: true }).waitFor({ timeout: 20_000 })
  await page.screenshot({ path: path.join(output, 'mobile-failed.png'), fullPage: true })
  await page.request.post(`${origin}/__qa/recover`)
  await page.getByRole('button', { name: 'Retomar publicação', exact: true }).click()
  await page.getByText('Curso publicado', { exact: true }).waitFor({ timeout: 20_000 })
  await page.screenshot({ path: path.join(output, 'mobile-resumed.png'), fullPage: true })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390)
  const box = await page.getByRole('dialog').boundingBox()
  assert.ok(box && box.x >= 0 && box.x + box.width <= 390)
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog').count(), 0)
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    'Publicar no adulto',
  )
  steps.push('falha, retomada, responsividade e foco restaurado no celular emulado')
  await open('hold')
  await page.getByText('Publicação cancelada', { exact: true }).waitFor()
  steps.push('resultado tardio do provedor não desfaz cancelamento')
  await open('promote')
  await page.getByText('Consultando publicações', { exact: true }).waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: 'Conferir destino', exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).waitFor()
  assert.match(await page.getByRole('dialog').innerText(), /Kids · Staging/)
  assert.match(await page.getByRole('dialog').innerText(), /Kids · Produção/)
  await page.screenshot({ path: path.join(output, 'mobile-promotion-preview.png'), fullPage: true })
  await page.getByRole('button', { name: 'Confirmar publicação', exact: true }).click()
  await page.getByText('Curso publicado', { exact: true }).waitFor({ timeout: 30_000 })
  const promotedResponse = await page.request.get(`${origin}/__qa/promoted`)
  assert.equal(promotedResponse.status(), 200)
  const promoted = await promotedResponse.json()
  assert.notEqual(promoted.sourceDatabase, promoted.targetDatabase)
  assert.equal(promoted.completed, true)
  assert.equal(promoted.sourceCover, 'https://stage.assets.example/capa.png')
  assert.ok(
    promoted.targetCover.startsWith('https://prod.assets.example/admin/course-publication/'),
  )
  assert.deepEqual(promoted.videos, ['https://player.vimeo.com/video/20?h=production'])
  assert.equal(promoted.attachments.length, 1)
  assert.ok(promoted.attachments[0].startsWith('r2priv:admin/course-publication/'))
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  await page.screenshot({
    path: path.join(output, 'mobile-promotion-completed.png'),
    fullPage: true,
  })
  steps.push(
    'promoção entre dois bancos locais separados com arquivos públicos/privados, vídeo copiado, voz e tutor',
  )
  assert.deepEqual(errors, [])
  assert.equal(responses.length, 1)
  assert.equal(responses[0].status, 400)
  assert.equal(new URL(responses[0].url).pathname, '/api/members/course-publications/preview')
  await writeFile(
    path.join(output, 'receipt.json'),
    JSON.stringify(
      {
        startedAt,
        endedAt: new Date().toISOString(),
        steps,
        errors,
        responses,
        viewports: ['1366x1000', '390x844'],
        externalProviders: 'deterministic local fixtures',
        verdict: 'PASS',
      },
      null,
      2,
    ),
    { flag: 'wx' },
  )
  console.log(JSON.stringify({ passed: steps.length, output }))
} catch (error) {
  await page?.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {})
  await writeFile(
    path.join(output, 'receipt.json'),
    JSON.stringify(
      {
        startedAt,
        endedAt: new Date().toISOString(),
        steps,
        errors,
        responses,
        error: String(error),
        verdict: 'FAIL',
      },
      null,
      2,
    ),
    { flag: 'wx' },
  )
  throw error
} finally {
  clearTimeout(deadline)
  await browser.close()
}
