import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { aplicarCorPelaOficina, conferirCoresDaSelecao } from './ensaiar-cores.mjs'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-formas')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let paginaAtual
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1440],
    ['dark', 390],
  ]) {
    const pagina = await navegador.newPage({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
    })
    paginaAtual = pagina
    const erros = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    await pagina.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await pagina.waitForFunction(() => window.__cenarios)
    const id = await pagina.evaluate(async () => {
      const host = window.__cenarios.host,
        mundo = await host.criarMundo('conta', 'Blocos autorais')
      return (await host.criarCenario(mundo.id, 'Quatro formas')).id
    })
    const espaco = pagina.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await pagina.getByRole('button', { name: 'Abrir Blocos autorais', exact: true }).click()
    await pagina.getByRole('button', { name: 'Abrir Quatro formas', exact: true }).click()
    const ler = () =>
      pagina.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).documento, id)
    const antes = await ler()
    await pagina.getByRole('button', { name: 'Blocos', exact: true }).click()
    await pagina.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
    assert.deepEqual(await ler(), antes)
    for (const [i, tipo] of ['caixa', 'rampa', 'escada', 'cilindro'].entries()) {
      await pagina.getByRole('button', { name: 'Blocos', exact: true }).click()
      const dialogo = pagina.getByRole('dialog')
      await dialogo.getByLabel('Forma', { exact: true }).selectOption(tipo)
      const altura = dialogo.getByLabel(/^Altura do bloco/)
      await altura.fill('2')
      await altura.press('Tab')
      await dialogo.getByRole('button', { name: 'Colocar bloco', exact: true }).click()
      await pagina.getByText('Guardado', { exact: true }).waitFor()
      const d = await ler()
      assert.equal(d.instancias.length, i + 1)
      assert.equal(d.formas.length, i + 1)
      assert.equal(d.modelos.length, 0)
      assert.equal(d.formas.at(-1).tipo, tipo)
      if (!i) {
        await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
        await pagina.getByText('Guardado', { exact: true }).waitFor()
        assert.deepEqual(await ler(), antes)
        await pagina.getByRole('button', { name: 'Refazer', exact: true }).click()
        await pagina.getByText('Guardado', { exact: true }).waitFor()
        assert.deepEqual(await ler(), d)
        await pagina.keyboard.press('Control+a')
      }
      const abrirPainel = pagina.getByRole('button', { name: 'Abrir o painel', exact: true })
      if (await abrirPainel.count()) await abrirPainel.click()
      for (const [eixo, valor] of [
        ['X', -5 + 4 * i],
        ['Z', 0],
      ]) {
        const campo = pagina
          .locator('aside.mcn-painel')
          .getByRole('spinbutton', { name: eixo, exact: true })
          .first()
        await campo.fill(String(valor))
        await campo.press('Tab')
      }
      await pagina.getByText('Guardado', { exact: true }).waitFor()
      if (process.argv.includes('--cores')) {
        const cor = ['#ff9944', '#32cc9a', '#e67db5', '#66aaff'][i]
        const colorido = await aplicarCorPelaOficina(pagina, ler, cor)
        assert.equal(colorido.instancias[i].aparencia.cor, cor)
      }
      if (largura === 390)
        await pagina.getByRole('button', { name: 'Recolher o painel', exact: true }).click()
    }
    if (largura === 390)
      await pagina.getByRole('button', { name: 'Abrir o painel', exact: true }).click()
    await pagina.getByRole('button', { name: 'Espelhar X', exact: true }).click()
    if (largura === 390)
      await pagina.getByRole('button', { name: 'Recolher o painel', exact: true }).click()
    await pagina.getByRole('button', { name: 'Livre', exact: true }).click()
    await pagina.keyboard.press('Control+a')
    await pagina.keyboard.press('f')
    let cores
    if (process.argv.includes('--cores')) {
      if (largura === 390)
        await pagina.getByRole('button', { name: 'Abrir o painel', exact: true }).click()
      cores = await conferirCoresDaSelecao(pagina, ler)
      if (largura === 390)
        await pagina.getByRole('button', { name: 'Recolher o painel', exact: true }).click()
    }
    await pagina.screenshot({ path: resolve(saida, `formas-${tema}-${largura}.png`) })
    await pagina.getByRole('button', { name: 'De lado', exact: true }).click()
    await pagina.screenshot({ path: resolve(saida, `formas-lado-${tema}-${largura}.png`) })
    const guardado = await ler()
    await pagina.keyboard.press('Delete')
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    assert.equal((await ler()).instancias.length, 0)
    await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    assert.deepEqual(await ler(), guardado)
    await pagina.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await pagina.getByRole('button', { name: 'Abrir Quatro formas', exact: true }).click()
    assert.deepEqual(await ler(), guardado)
    assert.deepEqual(erros, [])
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    resultados.push({
      tema,
      largura,
      formas: guardado.formas.length,
      modelosGlb: guardado.modelos.length,
      cancelamento: true,
      desfazer: true,
      refazer: true,
      espelho: true,
      reentrada: true,
      ...(cores ? { cores } : {}),
      erros,
    })
    await pagina.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), `${JSON.stringify(resultados, null, 2)}\n`)
  console.log(JSON.stringify(resultados))
} catch (e) {
  if (paginaAtual && !paginaAtual.isClosed()) {
    await paginaAtual.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.json'),
      JSON.stringify(
        { erro: String(e), texto: await paginaAtual.locator('body').innerText() },
        null,
        2,
      ),
    )
  }
  throw e
} finally {
  await navegador.close()
}
