import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
mkdirSync('.cache/minijogos', { recursive: true })
try {
  for (const largura of [1280, 390]) {
    const contexto = await browser.newContext({
      viewport: { width: largura, height: 844 },
      hasTouch: largura === 390,
    })
    const pagina = await contexto.newPage()
    const erros: string[] = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.setDefaultTimeout(60_000)
    await pagina.goto('http://127.0.0.1:4598', { waitUntil: 'networkidle' })
    await pagina
      .locator('.arq-acao')
      .filter({ hasText: /fliperama/i })
      .waitFor()
    await pagina.keyboard.press('e')
    await pagina.getByRole('region', { name: 'Seus minijogos' }).waitFor()
    await pagina.screenshot({ path: `.cache/minijogos/fliperama-${largura}.png` })
    await pagina.getByRole('button', { name: /^Jogar Corrida dos bichos$/i }).click()
    await pagina.waitForTimeout(3000)
    await pagina.getByRole('dialog').locator('iframe').waitFor()
    await pagina.waitForTimeout(3500)
    assert.equal(await pagina.getByRole('alert').count(), 0)
    const canvas = pagina.frameLocator('dialog iframe').locator('canvas').first()
    const area = await canvas.boundingBox()
    assert(area)
    // O palco da Corrida é paisagem, centralizado pelo player em telas de retrato.
    const larguraDoPalco = Math.min(area.width, area.height * 1.6)
    const alturaDoPalco = larguraDoPalco / 1.6
    await canvas.click({
      position: {
        x: (area.width - larguraDoPalco) / 2 + larguraDoPalco * 0.16,
        y: (area.height - alturaDoPalco) / 2 + alturaDoPalco * 0.93,
      },
    })
    await pagina.waitForTimeout(1500)
    await pagina.screenshot({ path: `.cache/minijogos/player-${largura}.png` })
    await pagina.getByRole('button', { name: 'Voltar', exact: true }).click()
    await pagina.locator('dialog[open]').waitFor({ state: 'hidden' })
    await pagina.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
    await pagina.goto('http://127.0.0.1:4598/?pais=1', { waitUntil: 'networkidle' })
    await pagina.getByText('Minijogos que Lia fez').waitFor()
    await pagina.screenshot({ path: `.cache/minijogos/pais-${largura}.png` })
    await pagina.getByRole('button', { name: /^Jogar / }).click()
    await pagina.getByRole('dialog').locator('iframe').waitFor()
    await pagina.waitForTimeout(2000)
    assert.equal(await pagina.getByRole('alert').count(), 0)
    await pagina.keyboard.press('Escape')
    await pagina.locator('dialog[open]').waitFor({ state: 'hidden' })
    assert.deepEqual(erros, [])
    console.log(`PASS ${largura}: fliperama, projeto real do Bosque no player, Voltar, pais e Esc`)
    await contexto.close()
  }
} finally {
  await browser.close()
}
