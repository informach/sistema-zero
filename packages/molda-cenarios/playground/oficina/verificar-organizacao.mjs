import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..')
const saida = resolve(raiz, 'output/cenarios-reforma/organizacao')
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const erros = [],
  resultados = []
let paginaAtiva
try {
  for (const tema of ['light', 'dark']) {
    const p = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    paginaAtiva = p
    p.on('pageerror', (e) => {
      erros.push(e.message)
      console.error(e.message)
    })
    p.on('requestfailed', (r) =>
      console.error('Falha de recurso', new URL(r.url()).pathname, r.failure()?.errorText),
    )
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.getByRole('heading', { name: 'Cenários', exact: true }).waitFor()
    await p.evaluate(
      async (modulo) => {
        const { prepararArquivos, encerrarPreparacao } = await import(modulo)
        const lista = await fetch('/acervo/lista.json').then((r) => r.json())
        const nome = lista.find((n) => n.startsWith('arvore_01'))
        if (!nome) throw Error('Falta o modelo privado de árvore no acervo local')
        const bytes = await fetch(`/acervo/${nome}`).then((r) => r.arrayBuffer())
        const host = window.__cenarios.host
        const biblioteca = await host.criarBiblioteca('conta', {
          nome: 'Jardim do ensaio',
          licenca: 'propria',
        })
        try {
          const { prontos, recusados } = await prepararArquivos([new File([bytes], 'Árvore.glb')])
          if (recusados.length) throw Error(JSON.stringify(recusados))
          await host.importarModelos(biblioteca.id, prontos)
        } finally {
          await encerrarPreparacao()
        }
      },
      `/@fs/${resolve(raiz, 'packages/molda-cenarios/src/oficina/importar.ts').replaceAll('\\', '/')}`,
    )
    await p.getByRole('button', { name: 'Criar mundo', exact: true }).first().click()
    await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Jardim do ensaio')
    await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher bibliotecas', exact: true }).click()
    await p
      .getByRole('dialog')
      .getByRole('checkbox', { name: /Jardim do ensaio/ })
      .check()
    await p.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click()
    await p.getByRole('button', { name: 'Criar cenário', exact: true }).first().click()
    await p.getByRole('dialog').getByLabel('Nome', { exact: true }).fill('Composição')
    await p.getByRole('dialog').getByRole('button', { name: 'Criar', exact: true }).click()
    await p.getByRole('heading', { name: 'Composição', exact: true }).waitFor()
    for (const [x, z] of [
      [-6, -3],
      [0, 1],
      [6, 4],
    ]) {
      await p.getByRole('button', { name: 'Pôr Árvore no cenário', exact: true }).click()
      await p.getByLabel(/^X/).first().fill(String(x))
      await p.getByLabel(/^X/).first().press('Tab')
      await p.getByLabel(/^Z/).first().fill(String(z))
      await p.getByLabel(/^Z/).first().press('Tab')
      await p.getByText('Guardado', { exact: true }).waitFor()
    }
    const id = await p.evaluate(async () => {
      const h = window.__cenarios.host,
        mundo = (await h.listarMundos('conta'))[0]
      return (await h.listarCenarios(mundo.id))[0].id
    })
    const abrir = () => p.evaluate((id) => window.__cenarios.host.abrirCenario(id), id)
    const aguardar = () => p.getByText('Guardado', { exact: true }).waitFor()
    await p.getByRole('heading', { name: 'Composição', exact: true }).click()
    await p.keyboard.press('Control+a')
    await p.getByRole('combobox', { name: 'Eixo', exact: true }).selectOption('z')
    await p.getByRole('button', { name: 'Alinhar centro', exact: true }).click()
    await aguardar()
    const alinhado = await abrir()
    assert.equal(
      new Set(alinhado.documento.instancias.map((o) => o.transformacao.posicao.z)).size,
      1,
    )
    await p.getByRole('combobox', { name: 'Eixo', exact: true }).selectOption('x')
    await p.getByRole('button', { name: 'Vãos iguais', exact: true }).click()
    await aguardar()
    await p.getByLabel('Novas cópias', { exact: true }).fill('2')
    await p.getByLabel('Novas cópias', { exact: true }).press('Tab')
    await p.getByLabel(/^Passo entre cópias/).fill('20')
    await p.getByLabel(/^Passo entre cópias/).press('Tab')
    await p.getByRole('button', { name: 'Criar repetição', exact: true }).click()
    await aguardar()
    assert.equal((await abrir()).documento.instancias.length, 9)
    await p.getByRole('heading', { name: 'Composição', exact: true }).click()
    await p.keyboard.press('Control+a')
    await p.keyboard.press('f')
    await p.waitForFunction(() =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .every((a) => a.playState === 'finished'),
    )
    await p.screenshot({ path: resolve(saida, `organizacao-${tema}.png`) })
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await aguardar()
    assert.equal((await abrir()).documento.instancias.length, 3)
    await p.getByRole('button', { name: 'Refazer', exact: true }).click()
    await aguardar()
    assert.equal((await abrir()).documento.instancias.length, 9)
    await p.getByRole('button', { name: 'Aplicar variação', exact: true }).click()
    await aguardar()
    assert.ok((await abrir()).documento.instancias.some((o) => o.transformacao.rotacao.y !== 0))
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Composição', exact: true }).click()
    assert.equal((await abrir()).documento.instancias.length, 9)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await aguardar()
    assert.ok((await abrir()).documento.instancias.every((o) => o.transformacao.rotacao.y === 0))
    resultados.push({
      tema,
      alinhamento: true,
      distribuicao: true,
      repeticao: true,
      variacao: true,
      desfazerAposReabrir: true,
      objetos: 9,
    })
    await p.close()
  }
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ resultados, erros }, null, 2))
  console.log(JSON.stringify({ resultados, erros }))
} catch (e) {
  if (paginaAtiva && !paginaAtiva.isClosed()) {
    await paginaAtiva.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.json'),
      JSON.stringify(
        await paginaAtiva.evaluate(() => ({
          texto: document.body.innerText,
          campos: [...document.querySelectorAll('input')].map((i) => ({
            tipo: i.type,
            rotulos: [...(i.labels ?? [])].map((l) => l.textContent),
          })),
        })),
        null,
        2,
      ),
    )
  }
  throw e
} finally {
  await browser.close()
}
