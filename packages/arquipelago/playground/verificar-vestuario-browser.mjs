/** Configurador real; servidor QA local sem banco nem credenciais. Node + Chrome. */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const base = new URL(process.env.ARQUIPELAGO_VESTUARIO_URL ?? '')
if (base.protocol !== 'http:' || base.hostname !== '127.0.0.1')
  throw Error('Use somente servidor QA em 127.0.0.1')
const prints = path.resolve(process.env.ARQUIPELAGO_PRINTS ?? '.cache/vestuario-prints')
mkdirSync(prints, { recursive: true })
const browser = await chromium.launch({
  ...(process.env.ARQUIPELAGO_CHROMIUM
    ? { executablePath: process.env.ARQUIPELAGO_CHROMIUM }
    : { channel: 'chrome' }),
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const prazo = setTimeout(() => {
  void browser.close()
}, 6 * 60_000)
const resultados = []
try {
  for (const [publico, celular, salvar] of [
    ['kids', false, false],
    ['kids', true, true],
    ['adulto', false, true],
    ['adulto', true, false],
  ]) {
    const context = await browser.newContext({
      viewport: celular ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      hasTouch: celular,
      isMobile: celular,
      reducedMotion: 'reduce',
      deviceScaleFactor: 1,
    })
    const nome = `${publico}-${celular ? 'celular' : 'computador'}`
    const page = await context.newPage()
    page.setDefaultTimeout(45_000)
    const erros = []
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (e) => {
      if (e.type() === 'error') erros.push(e.text())
    })
    page.on('response', (r) => {
      if (r.status() >= 400) erros.push(`${r.status()} ${r.url()}`)
    })
    try {
      await page.goto(`${base.origin}/?publico=${publico}&caso=${nome}-${Date.now()}`, {
        waitUntil: 'domcontentloaded',
      })
      const dialog = page.getByRole('dialog', { name: 'Roupas da festa' })
      const escolhas = dialog.locator('details[aria-label="Ideias para o Carnaval"]')
      await escolhas.locator('summary').click()
      const mascara = escolhas.getByRole('button', { name: 'Máscara · 10 moedas', exact: true })
      await mascara.waitFor()
      await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0)
      await mascara.click()
      await page.waitForLoadState('networkidle')
      const previa = await dialog.locator('canvas').first().boundingBox()
      assert.ok(
        previa && previa.height >= 140 && previa.width >= 200,
        'A prévia 3D precisa manter espaço útil',
      )
      const ler = () => page.evaluate(async () => (await fetch('/qa/estado')).json())
      assert.equal((await ler()).compras, 0)
      await page.screenshot({ path: path.join(prints, `${nome}-previa.png`) })
      if (salvar) {
        await dialog
          .getByRole('button', {
            name: publico === 'kids' ? 'Comprar por 10' : 'Desbloquear por 10 moedas',
            exact: true,
          })
          .click()
        await page.waitForFunction(
          async () => (await (await fetch('/qa/estado')).json()).compras === 1,
        )
        const salvarBotao = dialog.getByRole('button', { name: /^Salvar$/ })
        // No Kids estreito o texto é oculto visualmente, mas o nome acessível permanece.
        await salvarBotao.click()
        await page.getByRole('status').filter({ hasText: 'Avatar salvo' }).waitFor()
      } else {
        await dialog.getByRole('button', { name: 'Voltar ao jogo', exact: true }).click()
        await page.getByRole('status').filter({ hasText: 'Prévia cancelada' }).waitFor()
      }
      const estado = await ler()
      assert.equal(estado.compras, salvar ? 1 : 0)
      assert.equal(estado.saves, salvar ? 1 : 0)
      assert.equal(estado.balance, salvar ? 70 : 80)
      assert.equal(estado.equipped.faceDecor.asset, salvar ? 'face-08' : 'face-none')
      assert.equal(await page.locator('dialog[open]').count(), 0)
      assert.equal(await page.locator('canvas').count(), 0)
      await page.screenshot({ path: path.join(prints, `${nome}-retorno.png`) })
      assert.deepEqual(erros, [])
      resultados.push({
        publico,
        celular,
        salvar,
        compras: estado.compras,
        saldo: estado.balance,
        erros,
      })
      writeFileSync(path.join(prints, 'resultado.json'), JSON.stringify(resultados, null, 2))
      console.log('PASS', nome)
    } catch (e) {
      await page.screenshot({ path: path.join(prints, `${nome}-falha.png`) }).catch(() => {})
      writeFileSync(
        path.join(prints, `${nome}-falha.json`),
        JSON.stringify(
          {
            erro: String(e),
            erros,
            texto: await page
              .locator('body')
              .innerText()
              .catch(() => ''),
          },
          null,
          2,
        ),
      )
      throw e
    } finally {
      await context.close()
    }
  }
} finally {
  clearTimeout(prazo)
  await browser.close()
}
