import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(import.meta.dirname, '../../../../output/cenarios-reforma/lote7-layout')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  resultados = []
try {
  for (const [largura, altura, tema] of [
    [1440, 900, 'light'],
    [1366, 768, 'dark'],
    [1024, 768, 'light'],
    [390, 844, 'dark'],
  ]) {
    const p = await browser.newPage({
        viewport: { width: largura, height: altura },
        hasTouch: largura <= 1024,
      }),
      erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    try {
      await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
      await p.waitForFunction(() => window.__cenarios)
      await p.evaluate(async () => {
        const h = window.__cenarios.host,
          m = await h.criarMundo('conta', 'Layout de jogo e luz')
        await h.criarCenario(m.id, 'Marcadores de ensaio')
      })
      const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
      await espaco.selectOption('equipe')
      await espaco.selectOption('conta')
      await p.getByRole('button', { name: 'Abrir Layout de jogo e luz', exact: true }).click()
      await p.getByRole('button', { name: 'Abrir Marcadores de ensaio', exact: true }).click()
      const aba = (nome) =>
          p.locator('.mld-workshop-tabs').getByRole('button', { name: nome, exact: true }),
        rail = p.locator('nav.mld-workshop-rail'),
        painel = p.locator('aside.mcn-painel')
      await aba('Jogo').click()
      await rail.getByRole('button', { name: 'Zona poligonal', exact: true }).click()
      await painel
        .getByRole('textbox', { name: 'Nome do marcador', exact: true })
        .fill('Zona de encontros')
      assert.equal(await p.getByRole('button', { name: 'Testar', exact: true }).isDisabled(), true)
      if (largura === 390) {
        await painel.getByRole('button', { name: 'Colocar no cenário', exact: true }).tap()
        await painel.waitFor({ state: 'detached' })
        await p.getByRole('button', { name: 'Abrir o painel', exact: true }).tap()
        assert.equal(
          await painel.getByRole('textbox', { name: 'Nome do marcador', exact: true }).inputValue(),
          'Zona de encontros',
        )
      }
      await painel.getByRole('button', { name: 'Ver prévia do marcador', exact: true }).click()
      await painel.getByRole('button', { name: 'Guardar marcador', exact: true }).waitFor()
      await painel
        .getByRole('textbox', { name: 'Nome do marcador', exact: true })
        .scrollIntoViewIfNeeded()
      assert.equal(
        await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      )
      await p.screenshot({ path: resolve(saida, `${largura}-${tema}-jogo.png`) })
      await painel.getByRole('button', { name: 'Cancelar edição do marcador', exact: true }).click()
      await aba('Luz e céu').click()
      if (largura === 390)
        await p.getByRole('button', { name: 'Recolher o painel', exact: true }).tap()
      await rail.getByRole('button', { name: 'Céu', exact: true }).click()
      await painel.getByRole('button', { name: 'Cor do céu', exact: true }).click()
      await p.waitForFunction(() =>
        [...document.querySelectorAll('button')].some(
          (b) => b.textContent === 'Guardar iluminação' && !b.disabled,
        ),
      )
      await painel.getByText('Céu', { exact: true }).first().scrollIntoViewIfNeeded()
      assert.equal(
        await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1),
        false,
      )
      await p.screenshot({ path: resolve(saida, `${largura}-${tema}-luz.png`) })
      await painel.getByRole('button', { name: 'Guardar iluminação', exact: true }).click()
      await painel.getByRole('button', { name: 'Ajustar iluminação', exact: true }).waitFor()
      await p.getByText('Guardado', { exact: true }).waitFor()
      assert.deepEqual(erros, [])
      resultados.push({
        largura,
        altura,
        tema,
        rascunho: true,
        previa: true,
        guardar: true,
        overflow: false,
        erros,
      })
      console.log(JSON.stringify(resultados.at(-1)))
    } catch (e) {
      await p.screenshot({ path: resolve(saida, `${largura}-falha.png`) })
      throw e
    } finally {
      await p.close()
    }
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultados, null, 2))
} finally {
  await browser.close()
}
