import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage()
  const erros = []
  pagina.on('pageerror', (erro) => erros.push(erro.message))
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForFunction(() => window.__cenarios)
  await pagina.evaluate(async () => {
    const fixture = await import('/qa-abertura.tsx')
    await fixture.abrirCenarioDeOutroMundo()
  })
  await pagina
    .getByRole('button', { name: 'Tentar de novo', exact: true })
    .waitFor({ timeout: 10_000 })
  assert.equal(await pagina.locator('canvas').count(), 0)
  assert.deepEqual(erros, [])
  console.log('Abertura recusou cenário de outro mundo antes de montar o editor.')
} finally {
  await navegador.close()
}
