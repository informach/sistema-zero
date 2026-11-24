import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(import.meta.dirname, '../../../../output/cenarios-reforma/lote6-layout')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  resultados = []
try {
  for (const [largura, altura, tema] of [
    [1440, 900, 'light'],
    [1366, 900, 'dark'],
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
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForFunction(() => window.__cenarios)
    const id = await p.evaluate(async () => {
      const h = window.__cenarios.host,
        m = await h.criarMundo('conta', 'Layout de caminhos'),
        c = await h.criarCenario(m.id, 'Ponte de ensaio')
      await h.editarCenario(
        c.id,
        0,
        [
          {
            tipo: 'caminho.definir',
            caminho: {
              id: 'p',
              nome: 'Ponte QA',
              tipo: 'ponte',
              grupo: null,
              bloqueado: false,
              oculto: false,
              acabamento: null,
              largura: 2.6,
              pontos: [
                { x: -5, z: 0 },
                { x: 5, z: 0 },
              ],
              cotas: { de: 2, ate: 2 },
              pilares: { espacamento: 4, largura: 0.25 },
            },
          },
        ],
        'layout-ponte',
      )
      return c.id
    })
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Layout de caminhos', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Ponte de ensaio', exact: true }).click()
    await p.getByRole('button', { name: 'Caminhos', exact: true }).click()
    const abrir = p.getByRole('button', { name: 'Abrir o painel', exact: true })
    if (await abrir.count()) await abrir.click()
    const painel = p.locator('aside.mcn-painel')
    await painel.getByRole('button', { name: 'Ponte QA', exact: true }).click()
    const afastamento = painel.getByRole('spinbutton', {
      name: 'Afastamento lateral dos pilares',
      exact: true,
    })
    await afastamento.fill('.35')
    await afastamento.press('Tab')
    assert.equal(await p.getByRole('button', { name: 'Testar', exact: true }).isDisabled(), true)
    if (largura === 390) {
      await painel.getByRole('button', { name: 'Escolher pontos no cenário', exact: true }).click()
      await painel.waitFor({ state: 'detached' })
      await p.getByRole('button', { name: 'Abrir o painel', exact: true }).click()
      assert.equal(await afastamento.inputValue(), '0.35')
    }
    await painel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
    await painel
      .getByRole('heading', { name: 'Prévia · ainda não guardada', exact: true })
      .waitFor()
    const overflow = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
    assert.equal(overflow, false)
    await painel.getByText('Criar pilares', { exact: true }).scrollIntoViewIfNeeded()
    await p.screenshot({ path: resolve(saida, `${largura}-${tema}.png`) })
    await painel.getByRole('button', { name: 'Guardar caminho', exact: true }).click()
    await painel.getByRole('heading', { name: /Caminhos do cenário/ }).waitFor()
    await p.getByText('Guardado', { exact: true }).waitFor()
    const salvo = await p.evaluate(async (id) => await window.__cenarios.host.abrirCenario(id), id)
    assert.equal(salvo.documento.caminhos[0].pilares.afastamentoLateral, 0.35)
    assert.deepEqual(erros, [])
    resultados.push({ largura, altura, tema, preparar: true, guardar: true, overflow, erros })
    console.log(JSON.stringify(resultados.at(-1)))
    await p.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultados, null, 2))
} finally {
  await browser.close()
}
