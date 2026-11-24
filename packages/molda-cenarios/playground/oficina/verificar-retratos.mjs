import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-retratos')
const raiz = resolve(import.meta.dirname, '../../../..')
const modelo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos.find((m) => m.arquivo === 'poco_manivela_baixa.209f7e2a54ed.glb')
assert.ok(modelo, 'Poço real ausente')
const modulo = `/@fs/${resolve(raiz, 'packages/molda-cenarios-core/src/v2/index.ts').replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const resultados = []
let pagina
try {
  for (const [tema, largura] of [
    ['light', 1440],
    ['dark', 1440],
    ['light', 1024],
    ['dark', 390],
  ]) {
    const contexto = await browser.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
      recordVideo:
        largura === 1440 && tema === 'light'
          ? { dir: resolve(saida, 'movimento'), size: { width: 1440, height: 900 } }
          : undefined,
    })
    const p = await contexto.newPage()
    pagina = p
    const erros = []
    p.on('pageerror', (e) => {
      erros.push(e.message)
      console.error(e.message)
    })
    p.on('console', (m) => {
      if (m.type() === 'error') {
        erros.push(m.text())
        console.error(m.text())
      }
    })
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForLoadState('networkidle')
    await p.waitForFunction(() => window.__cenarios)
    const ids = await p.evaluate(
      async ({ modelo, modulo }) => {
        const core = await import(modulo),
          h = window.__cenarios.host
        const biblioteca = await h.criarBiblioteca('conta', {
          nome: 'Composições',
          licenca: 'propria',
        })
        const tela = document.createElement('canvas')
        tela.width = tela.height = 32
        const ctx = tela.getContext('2d')
        ctx.fillStyle = '#d0ba86'
        ctx.fillRect(0, 0, 32, 32)
        const miniatura = await new Promise((r) => tela.toBlob(r, 'image/png'))
        const bytes = new Uint8Array(await (await fetch(`/acervo/${modelo.arquivo}`)).arrayBuffer())
        const [m] = await h.importarModelos(biblioteca.id, [
          {
            nome: modelo.nome,
            pasta: '',
            etiquetas: [],
            conteudo: bytes,
            digest: modelo.digest,
            miniatura,
            min: modelo.min,
            max: modelo.max,
            triangulos: modelo.triangulos,
          },
        ])
        const fonte = core.criarDocumentoVazio('fonte', 'Jardim')
        fonte.modelos = [
          {
            id: 'poco',
            biblioteca: biblioteca.id,
            modelo: m.id,
            digest: m.digest,
            volume: {
              min: { x: m.min[0], y: m.min[1], z: m.min[2] },
              max: { x: m.max[0], y: m.max[1], z: m.max[2] },
            },
          },
        ]
        fonte.formas = [
          { id: 'base', nome: 'Base', tipo: 'caixa', largura: 6, altura: 0.3, comprimento: 6 },
        ]
        const objeto = {
          id: 'base',
          nome: 'Base',
          grupo: null,
          modelo: 'base',
          bloqueado: false,
          oculto: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        }
        fonte.instancias = [
          objeto,
          {
            ...structuredClone(objeto),
            id: 'poco',
            nome: 'Poço',
            modelo: 'poco',
            apoio: {
              tipo: 'objeto',
              objeto: 'base',
              contato: { x: 0, y: 0.3, z: 0 },
              deslocamento: 0,
            },
          },
        ]
        const mundo = await h.criarMundo('conta', 'Biblioteca de conjuntos')
        await h.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
        const c = await h.criarCenario(mundo.id, 'Praça'),
          outro = await h.criarCenario(mundo.id, 'Campos')
        fonte.id = c.id
        fonte.nome = 'Praça'
        await h.editarCenario(
          c.id,
          0,
          [{ tipo: 'cenario.restaurar', documento: fonte }],
          crypto.randomUUID(),
        )
        return { cenario: c.id, outro: outro.id, biblioteca: biblioteca.id, mundo: mundo.id }
      },
      { modelo, modulo },
    )
    await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('equipe')
    await p.getByRole('combobox', { name: 'De quem são', exact: true }).selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Biblioteca de conjuntos', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Praça', exact: true }).click()
    const canvas = () => p.locator('canvas.mcn-palco-tela')
    const salvo = () => p.getByText('Guardado', { exact: true }).waitFor()
    const fechar = async () => {
      const b = p.getByRole('button', { name: 'Recolher o painel', exact: true })
      if (await b.isVisible()) await b.click()
    }
    const tecla = async (t) => {
      await canvas().focus()
      await p.keyboard.press(t)
      await salvo()
    }
    const esperar = async (tarefa) => {
      const fim = Date.now() + 20000
      while (!(await tarefa())) {
        if (Date.now() > fim) throw Error('Estado esperado não chegou')
        await p.waitForTimeout(80)
      }
    }
    await salvo()
    await fechar()
    const ler = () => p.evaluate(async (id) => window.__cenarios.host.abrirCenario(id), ids.cenario)
    const fotos = () =>
      p.evaluate(async (id) => window.__cenarios.host.listarRevisoes(id), ids.cenario)
    const original = await ler()
    await esperar(async () =>
      Boolean((await fotos()).itens.find((r) => r.revisao === original.revisao)?.miniatura),
    )
    const foto1 = (await fotos()).itens.find((r) => r.revisao === original.revisao).miniatura
    const tempo = new Date()
    await p.clock.install({ time: tempo })
    await p.clock.pauseAt(new Date(tempo.getTime() + 1000))
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher objeto Poço', exact: true }).click()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    const lugar = p.getByRole('group', { name: 'Lugar', exact: true })
    await lugar.getByRole('spinbutton').nth(0).fill('2')
    await lugar.getByRole('spinbutton').nth(0).press('Tab')
    await esperar(async () => (await ler()).revisao > original.revisao)
    await salvo()
    const intermediarias = [(await ler()).revisao]
    for (const x of ['3', '4']) {
      await p.clock.runFor(400)
      await lugar.getByRole('spinbutton').nth(0).fill(x)
      await lugar.getByRole('spinbutton').nth(0).press('Tab')
      await salvo()
      if (x === '3') intermediarias.push((await ler()).revisao)
    }
    await fechar()
    const mudado = await ler()
    await p.clock.runFor(2000)
    await esperar(async () =>
      Boolean((await fotos()).itens.find((r) => r.revisao === mudado.revisao)?.miniatura),
    )
    const foto2 = (await fotos()).itens.find((r) => r.revisao === mudado.revisao).miniatura
    for (const revisao of intermediarias)
      assert.equal(
        (await fotos()).itens.find((r) => r.revisao === revisao).miniatura,
        null,
        'Um gesto intermediário gerou foto sem estabilizar',
      )
    await p.clock.resume()
    assert.notEqual(foto1, foto2, 'Duas composições distintas receberam a mesma fotografia')
    await p.getByRole('button', { name: 'Versões do cenário', exact: true }).click()
    const dialog = p.getByRole('dialog')
    await dialog
      .getByRole('button', { name: `Ver retrato da versão ${original.revisao}`, exact: true })
      .click()
    await dialog
      .getByAltText(`Retrato guardado da versão ${original.revisao}`, { exact: true })
      .waitFor()
    const ajuste = await dialog
      .locator('.mcn-versao-retrato img')
      .first()
      .evaluate((img) => getComputedStyle(img).objectFit)
    assert.equal(ajuste, 'contain', 'A miniatura cortou parte da composição')
    await p.screenshot({ path: resolve(saida, `historico-${tema}-${largura}.png`) })
    await dialog.getByRole('button', { name: 'Fechar retrato', exact: true }).click()
    await dialog
      .getByRole('button', { name: `Voltar à versão ${original.revisao}`, exact: true })
      .click()
    await dialog.getByRole('button', { name: 'Voltar a esta versão', exact: true }).click()
    await dialog.waitFor({ state: 'detached' })
    await salvo()
    const restaurado = await ler()
    assert.deepEqual(restaurado.documento, original.documento)
    assert.ok(restaurado.revisao > mudado.revisao)
    await tecla('Control+z')
    await esperar(async () => (await ler()).revisao > restaurado.revisao)
    assert.deepEqual((await ler()).documento, mudado.documento)
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Praça', exact: true }).click()
    await salvo()
    await fechar()
    const reabertas = await fotos()
    assert.equal(reabertas.itens.find((r) => r.revisao === original.revisao).miniatura, foto1)
    assert.equal(reabertas.itens.find((r) => r.revisao === mudado.revisao).miniatura, foto2)
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      fotografiaEstabilizada: true,
      gestosIntermediariosSemFoto: true,
      retratosDistintos: true,
      inspecao: true,
      restaurarUndo: true,
      reabrir: true,
      erros,
    })
    console.log(`Retratos conferidos: ${tema} ${largura}px`)
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultados.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados))
} catch (e) {
  if (pagina) await pagina.screenshot({ path: resolve(saida, 'falha.png') }).catch(() => {})
  throw e
} finally {
  await browser.close()
}
