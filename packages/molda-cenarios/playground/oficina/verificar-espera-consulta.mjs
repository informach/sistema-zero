import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'
import { esperarConsulta } from './esperar-consulta.mjs'

const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage()
  const antecipado = await pagina.waitForFunction(async () => false)
  assert.equal(await antecipado.jsonValue(), false)
  await pagina.evaluate(() => {
    window.tentativasQA = 0
  })
  const confirmado = await esperarConsulta(pagina, async () => {
    await new Promise((r) => setTimeout(r, 10))
    return ++window.tentativasQA >= 3
  })
  assert.equal(confirmado, true)
  assert.equal(await pagina.evaluate(() => window.tentativasQA), 3)
  await assert.rejects(
    esperarConsulta(pagina, async () => false, undefined, { timeout: 100 }),
    /não confirmou/,
  )
  console.log(
    JSON.stringify({
      reproduziuRetornoFalsoPrematuro: true,
      confirmouSomenteNaTerceiraConsulta: true,
      timeout: true,
    }),
  )
} finally {
  await navegador.close()
}
