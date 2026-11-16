import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(import.meta.dirname, '../../../output/molda-cenarios/qa')
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
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } }),
  p = await context.newPage(),
  erros = []
p.on('pageerror', (e) => {
  erros.push(e.message)
  console.log('ERRO', e.message)
})
try {
  await p.goto('http://127.0.0.1:4531')
  await p.waitForSelector('[data-runtime-pronto=true]', { timeout: 120000 })
  await p.screenshot({ path: resolve(saida, 'editor-aberto.png') })
  const inicial = await p.locator('footer').innerText()
  console.log('PRONTO', inicial)
  await p.getByRole('button', { name: 'Criar cópia', exact: true }).click()
  await p.getByRole('dialog').getByRole('textbox').fill(`QA — edição ${Date.now()}`)
  await p.getByRole('dialog').getByRole('button', { name: 'Criar cópia', exact: true }).click()
  await p.waitForSelector('[data-runtime-pronto=true]', { timeout: 120000 })
  await p.getByRole('button', { name: 'Objetos', exact: true }).click()
  await p.getByRole('button', { name: 'poco', exact: true }).click()
  const x = p
      .getByRole('group', { name: 'Posição · metros' })
      .getByRole('spinbutton', { name: 'X', exact: true }),
    antes = Number(await x.inputValue())
  const rev = Number(await p.locator('[data-revisao]').getAttribute('data-revisao'))
  await x.fill(String(antes + 1))
  await x.press('Tab')
  await p.waitForSelector(`[data-revisao="${rev + 1}"]`, { timeout: 30000 })
  await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await p.waitForSelector(`[data-revisao="${rev + 2}"]`, { timeout: 30000 })
  assert.equal(Number(await x.inputValue()), antes)
  await p.getByRole('button', { name: 'Testar', exact: true }).click()
  await p.waitForSelector('button:has-text("Voltar à edição")')
  await p.waitForTimeout(4000)
  await p.keyboard.down('w')
  await p.waitForTimeout(1500)
  await p.keyboard.up('w')
  await p.screenshot({ path: resolve(saida, 'avatar-no-ensaio.png') })
  await p.getByRole('button', { name: 'Voltar à edição', exact: true }).click()
  const final = await p.locator('footer').innerText()
  writeFileSync(
    resolve(saida, 'resultados.json'),
    JSON.stringify({ inicial, final, erros }, null, 2),
  )
  assert.equal(erros.length, 0)
  console.log('QA concluído', final)
} finally {
  await context.close()
  await browser.close()
}
