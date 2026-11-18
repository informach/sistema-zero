import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const endereco = process.env.CENARIOS_QA_PREVIEW ?? 'http://127.0.0.1:4542',
  saida = resolve(import.meta.dirname, '../../../../output/cenarios-reforma/lote5-worker-producao')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } }),
    erros = [],
    workers = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  pagina.on('worker', (worker) => workers.push(worker.url()))
  await pagina.goto(`${endereco}/?vazio=1`)
  await pagina.waitForFunction(() => window.__cenarios)
  const id = await pagina.evaluate(async () => {
    const h = window.__cenarios.host,
      m = await h.criarMundo('conta', 'Trabalho compilado')
    return (await h.criarCenario(m.id, 'Relevo')).id
  })
  const espaco = pagina.getByRole('combobox', { name: 'De quem são', exact: true })
  await espaco.selectOption('equipe')
  await espaco.selectOption('conta')
  await pagina.getByRole('button', { name: 'Abrir Trabalho compilado', exact: true }).click()
  await pagina.getByRole('button', { name: 'Abrir Relevo', exact: true }).click()
  await pagina.getByRole('button', { name: 'Terreno', exact: true }).click()
  const abrir = pagina.getByRole('button', { name: 'Abrir o painel', exact: true })
  if (await abrir.count()) await abrir.click()
  const painel = pagina.locator('aside.mcn-painel')
  await painel.getByLabel('Modelo de terreno', { exact: true }).selectOption('colinas')
  await painel.getByRole('button', { name: 'Aplicar modelo de terreno', exact: true }).click()
  await pagina
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar modelo', exact: true })
    .click()
  await pagina.waitForFunction(
    () =>
      !Array.from(document.querySelectorAll('[role="status"]')).some((e) =>
        e.textContent?.includes('Preparando e guardando'),
      ),
  )
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  const doc = await pagina.evaluate(
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento,
    id,
  )
  assert.equal(doc.base.tipo, 'terreno')
  assert.ok(doc.base.pecas.length > 0)
  const downloadPromise = pagina.waitForEvent('download')
  await painel.getByRole('button', { name: 'Exportar alturas em PNG 16 bits', exact: true }).click()
  const download = await downloadPromise
  await download.saveAs(resolve(saida, 'alturas.png'))
  await pagina.getByRole('button', { name: 'Água', exact: true }).click()
  await painel.locator('.mcn-agua-acoes').getByRole('button', { name: 'Mar', exact: true }).click()
  const nivel = painel.getByRole('spinbutton', { name: 'Nível da água', exact: true })
  await nivel.fill('-1')
  await nivel.press('Tab')
  await painel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  await painel.getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true }).waitFor()
  await painel.getByRole('button', { name: 'Guardar água', exact: true }).click()
  await painel.getByRole('heading', { name: /Águas do cenário/ }).waitFor()
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  const final = await pagina.evaluate(
    async (id) => (await window.__cenarios.host.abrirCenario(id)).documento,
    id,
  )
  assert.equal(final.aguas[0].tipo, 'mar')
  assert.equal(final.aguas[0].nivel, -1)
  assert.ok(workers.length >= 3)
  assert.ok(workers.some((url) => url.includes('agua.worker-')))
  assert.ok(
    workers.every(
      (url) =>
        new URL(url).pathname.endsWith('.js') && !url.includes('/@fs/') && !url.startsWith('data:'),
    ),
  )
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify(
      {
        terreno: true,
        png16: true,
        agua: true,
        workers: workers.map((url) => new URL(url).pathname),
        erros,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({ terreno: true, png16: true, agua: true, workers: workers.length, erros }),
  )
} finally {
  await navegador.close()
}
