import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { ensaiarEncaixes } from './ensaiar-encaixes.mjs'

const raiz = resolve(import.meta.dirname, '../../../..')
const saida = resolve(
  process.argv[2] ?? resolve(raiz, 'output/cenarios-reforma/lote3-espelho-troca'),
)
const catalogo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos
const modelos = ['poco_manivela_baixa.209f7e2a54ed.glb', 'morada_banco.a3bf1765ed72.glb'].map(
  (arquivo) => {
    const m = catalogo.find((m) => m.arquivo === arquivo)
    assert.ok(m, `Modelo local ausente: ${arquivo}`)
    return m
  },
)
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
    const id = await pagina.evaluate(async (modelos) => {
      const host = window.__cenarios.host
      const bib = await host.criarBiblioteca('conta', {
        nome: 'Espelho e troca',
        licenca: 'propria',
      })
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 2
      const miniatura = await new Promise((r) => canvas.toBlob(r, 'image/png'))
      for (const m of modelos) {
        const resposta = await fetch(`/acervo/${encodeURIComponent(m.arquivo)}`)
        if (!resposta.ok) throw new Error('Modelo ausente no acervo local')
        await host.importarModelos(bib.id, [
          {
            nome: m.nome,
            pasta: '',
            etiquetas: [],
            conteudo: new Uint8Array(await resposta.arrayBuffer()),
            digest: m.digest,
            miniatura,
            min: m.min,
            max: m.max,
            triangulos: m.triangulos,
          },
        ])
      }
      const mundo = await host.criarMundo('conta', 'Objetos em ensaio')
      await host.editarMundo(mundo.id, { bibliotecas: [bib.id] })
      return (await host.criarCenario(mundo.id, 'Espelho e troca')).id
    }, modelos)
    const espaco = pagina.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await pagina.getByRole('button', { name: 'Abrir Objetos em ensaio', exact: true }).click()
    await pagina.getByRole('button', { name: 'Abrir Espelho e troca', exact: true }).click()
    await pagina
      .getByRole('button', { name: `Pôr ${modelos[0].nome} no cenário`, exact: true })
      .click()
    if (largura === 390)
      await pagina.getByRole('button', { name: 'Abrir o painel', exact: true }).click()
    await pagina.getByRole('button', { name: 'Espelhar X', exact: true }).click()
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    const ler = () =>
      pagina.evaluate(async (id) => (await window.__cenarios.host.abrirCenario(id)).documento, id)
    const espelhado = await ler()
    assert.equal(espelhado.instancias[0].espelho.x, true)
    await pagina.waitForFunction(() => {
      const t = document.querySelector('.mcn-orcamento')?.textContent
      return t && !t.includes('chegando')
    })
    await pagina.screenshot({ path: resolve(saida, `espelho-${tema}-${largura}.png`) })
    const encaixes = process.argv.includes('--encaixes')
      ? await ensaiarEncaixes(pagina, {
          ler,
          saida,
          tema,
          largura,
          modulo: `/@fs/${resolve(raiz, 'packages/molda-cenarios-core/src/v2/index.ts').replaceAll('\\', '/')}`,
        })
      : undefined
    await pagina.getByRole('button', { name: 'Trocar modelo', exact: true }).click()
    await pagina.getByRole('button', { name: 'Cancelar troca', exact: true }).click()
    assert.deepEqual(await ler(), espelhado)
    if (largura === 390)
      await pagina.getByRole('button', { name: 'Abrir o painel', exact: true }).click()
    await pagina.getByRole('button', { name: 'Trocar modelo', exact: true }).click()
    await pagina
      .getByRole('button', { name: `Pôr ${modelos[1].nome} no cenário`, exact: true })
      .click()
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    await pagina.waitForFunction(
      () => !document.querySelector('.mcn-orcamento')?.textContent?.includes('chegando'),
    )
    const trocado = await ler()
    assert.equal(trocado.instancias.length, 1)
    assert.notEqual(trocado.instancias[0].modelo, espelhado.instancias[0].modelo)
    assert.deepEqual(trocado.instancias[0].espelho, espelhado.instancias[0].espelho)
    await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    assert.deepEqual(await ler(), espelhado)
    await pagina.getByRole('button', { name: 'Refazer', exact: true }).click()
    await pagina.getByText('Guardado', { exact: true }).waitFor()
    assert.deepEqual(await ler(), trocado)
    await pagina.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await pagina.getByRole('button', { name: 'Abrir Espelho e troca', exact: true }).click()
    await pagina.waitForFunction(() => {
      const t = document.querySelector('.mcn-orcamento')?.textContent
      return t && !t.includes('chegando')
    })
    assert.deepEqual(await ler(), trocado)
    assert.deepEqual(erros, [])
    assert.ok(await pagina.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
    await pagina.screenshot({ path: resolve(saida, `troca-${tema}-${largura}.png`) })
    resultados.push({
      tema,
      largura,
      espelho: true,
      troca: true,
      cancelamento: true,
      desfazer: true,
      refazer: true,
      reentrada: true,
      ...(encaixes ? { encaixes } : {}),
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
