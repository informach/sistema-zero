import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(import.meta.dirname, '../../../../output/cenarios-reforma/historico')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const erros = [],
  resultados = []
try {
  for (const tema of ['light', 'dark']) {
    const p = await navegador.newPage({ viewport: { width: 1440, height: 900 } })
    p.on('pageerror', (e) => erros.push(e.message))
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.getByRole('button', { name: 'Criar mundo', exact: true }).first().click()
    await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Mundo dos Jardins')
    await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await p.getByRole('button', { name: 'Criar cenário', exact: true }).first().click()
    await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Jardim')
    await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await p.getByRole('heading', { name: 'Jardim', exact: true }).waitFor()
    const id = await p.evaluate(async () => {
      const host = window.__cenarios.host
      const mundo = (await host.listarMundos('conta')).find((m) => m.nome === 'Mundo dos Jardins')
      return (await host.listarCenarios(mundo.id))[0].id
    })
    for (const nome of ['Jardim de manhã', 'Jardim à tarde']) {
      await p.getByRole('textbox', { name: 'Nome', exact: true }).fill(nome)
      await p.getByRole('textbox', { name: 'Nome', exact: true }).press('Tab')
      await p.getByRole('heading', { name: nome, exact: true }).waitFor()
      await p.getByText('Guardado', { exact: true }).waitFor()
    }
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Jardim à tarde', exact: true }).click()
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await p.getByRole('heading', { name: 'Jardim de manhã', exact: true }).waitFor()
    await p.getByRole('button', { name: 'Refazer', exact: true }).click()
    await p.getByRole('heading', { name: 'Jardim à tarde', exact: true }).waitFor()
    await p.getByText('Guardado', { exact: true }).waitFor()
    await p.getByRole('button', { name: 'Versões do cenário', exact: true }).click()
    await p.getByRole('button', { name: 'Voltar à versão 1', exact: true }).waitFor()
    await p.screenshot({ path: resolve(saida, `versoes-${tema}.png`) })
    await p.getByRole('button', { name: 'Voltar à versão 1', exact: true }).click()
    await p.getByRole('button', { name: 'Voltar a esta versão', exact: true }).click()
    await p.getByRole('dialog').waitFor({ state: 'hidden' })
    await p.getByRole('heading', { name: 'Jardim de manhã', exact: true }).waitFor()
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await p.getByRole('heading', { name: 'Jardim à tarde', exact: true }).waitFor()
    const salvo = await p.evaluate((id) => window.__cenarios.host.abrirCenario(id), id)
    assert.equal(salvo.revisao, 6)
    assert.equal(salvo.documento.nome, 'Jardim à tarde')
    assert.equal(salvo.historico.refazer, 1)
    if (tema === 'light') {
      await p.setViewportSize({ width: 390, height: 844 })
      await p.getByRole('button', { name: 'Versões do cenário', exact: true }).click()
      await p.getByRole('button', { name: 'Voltar à versão 1', exact: true }).waitFor()
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await p.screenshot({ path: resolve(saida, 'versoes-celular.png') })
      await p.keyboard.press('Escape')
      await p.setViewportSize({ width: 1440, height: 900 })
    }
    await p.evaluate(() => {
      const host = window.__cenarios.host
      const real = host.editarCenario.bind(host)
      host.editarCenario = () => Promise.reject(Error('Sem conexão no ensaio'))
      window.__cenarios.retomar = () => {
        host.editarCenario = real
      }
    })
    await p.getByRole('textbox', { name: 'Nome', exact: true }).fill('Jardim protegido')
    await p.getByRole('textbox', { name: 'Nome', exact: true }).press('Tab')
    await p.getByRole('button', { name: 'Tentar de novo', exact: true }).waitFor()
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.waitForFunction(
      () => !document.querySelector('button[aria-label="Voltar ao mundo"]').disabled,
    )
    await p.getByRole('heading', { name: 'Jardim protegido', exact: true }).waitFor()
    assert.equal((await p.evaluate((id) => window.__cenarios.host.abrirCenario(id), id)).revisao, 6)
    await p.evaluate(() => window.__cenarios.retomar())
    await p.getByRole('button', { name: 'Tentar de novo', exact: true }).click()
    await p.getByText('Guardado', { exact: true }).waitFor()
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Jardim protegido', exact: true }).click()
    await p.getByRole('heading', { name: 'Jardim protegido', exact: true }).waitFor()
    resultados.push({
      tema,
      revisao: salvo.revisao,
      reabertura: true,
      desfazer: true,
      refazer: true,
      restaurar: true,
      desfazerRestauracao: true,
      saidaPreservaEdicaoNaoGravada: true,
    })
    await p.close()
  }
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ resultados, erros }, null, 2))
  console.log(
    'Histórico reaberto, desfazer/refazer e restauração exercitados no Chrome, nos dois temas e no celular',
  )
} finally {
  await navegador.close()
}
