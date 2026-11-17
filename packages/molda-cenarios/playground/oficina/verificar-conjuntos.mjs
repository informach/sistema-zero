import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-conjuntos')
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
        const conteudo = core.capturarConteudoDeConjunto(fonte, ['base', 'poco'], 'conta')
        const conjunto = await h.criarConjunto(biblioteca.id, {
          nome: 'Jardim',
          conteudo,
          operacaoId: crypto.randomUUID(),
        })
        const mundo = await h.criarMundo('conta', 'Conjuntos reais')
        await h.editarMundo(mundo.id, { bibliotecas: [biblioteca.id] })
        const c = await h.criarCenario(mundo.id, 'Praça em conjunto'),
          d = (await h.abrirCenario(c.id)).documento
        const { definicao, comandos } = core.referenciarConjunto(d, {
          biblioteca: biblioteca.id,
          conjunto: conjunto.id,
          revisao: 1,
          nome: conjunto.nome,
          conteudo,
        })
        await h.editarCenario(
          c.id,
          0,
          [
            ...comandos,
            {
              tipo: 'montagem.definir',
              montagem: {
                id: 'jardim',
                nome: 'Jardim',
                grupo: null,
                bloqueado: false,
                oculto: false,
                definicao: definicao.id,
                transformacao: {
                  posicao: { x: 0, y: 0, z: 0 },
                  rotacao: { x: 0, y: 0, z: 0 },
                  escala: { x: 1, y: 1, z: 1 },
                },
              },
            },
          ],
          crypto.randomUUID(),
        )
        return { cenario: c.id, conjunto: conjunto.id, conteudo }
      },
      { modelo, modulo },
    )
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Conjuntos reais', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Praça em conjunto', exact: true }).click()
    const canvas = p.locator('canvas.mcn-palco-tela')
    const ler = () => p.evaluate(async (id) => window.__cenarios.host.abrirCenario(id), ids.cenario)
    const salvo = () => p.getByText('Guardado', { exact: true }).waitFor()
    const fechar = async () => {
      const b = p.getByRole('button', { name: 'Recolher o painel', exact: true })
      if (await b.isVisible()) await b.click()
    }
    const abrir = async () => {
      const b = p.getByRole('button', { name: 'Abrir o painel', exact: true })
      if (await b.isVisible()) await b.click()
    }
    const tecla = async (t) => {
      await canvas.focus()
      await p.keyboard.press(t)
      await salvo()
    }
    const aguardar = async (n) => {
      await p.evaluate(
        async ({ id, n }) => {
          const fim = performance.now() + 15000
          while ((await window.__cenarios.host.abrirCenario(id)).revisao < n) {
            if (performance.now() > fim) throw Error('Revisão não chegou')
            await new Promise(requestAnimationFrame)
          }
        },
        { id: ids.cenario, n },
      )
      await salvo()
    }
    await salvo()
    await p.getByTitle(/chamadas de desenho/).waitFor({ state: 'attached' })
    await p.waitForFunction((triangulos) => {
      const texto = document.querySelector('.mcn-orcamento')?.textContent ?? ''
      const valor = texto.match(/([\d.,]+) triângulos/)?.[1]
      return texto.includes('2 objetos') && valor && Number(valor.replace(/\D/g, '')) >= triangulos
    }, modelo.triangulos)
    await fechar()
    await tecla('Control+a')
    await abrir()
    await p.getByRole('button', { name: 'Separar peças', exact: true }).waitFor()
    await p.screenshot({ path: resolve(saida, `conjunto-antes-${tema}-${largura}.png`) })
    await fechar()
    await tecla('Escape')
    let apontou = false
    for (const [x, y] of [
      [0.5, 0.5],
      [0.5, 0.62],
      [0.42, 0.6],
      [0.58, 0.6],
      [0.5, 0.7],
    ]) {
      const caixa = await canvas.boundingBox()
      if (largura === 390)
        await p.touchscreen.tap(caixa.x + caixa.width * x, caixa.y + caixa.height * y)
      else await canvas.click({ position: { x: caixa.width * x, y: caixa.height * y } })
      await abrir()
      if (await p.getByRole('button', { name: 'Separar peças', exact: true }).isVisible()) {
        apontou = true
        break
      }
      await fechar()
    }
    assert.ok(apontou, 'Toque numa peça não selecionou a raiz do conjunto')
    const original = await ler()
    const lugar = p.getByRole('group', { name: 'Lugar', exact: true })
    await lugar.getByRole('spinbutton').nth(0).fill('3')
    await lugar.getByRole('spinbutton').nth(0).press('Tab')
    await aguardar(original.revisao + 1)
    const giro = p.getByRole('group', { name: 'Giro', exact: true })
    await giro.getByRole('spinbutton').nth(1).fill('30')
    await giro.getByRole('spinbutton').nth(1).press('Tab')
    await aguardar(original.revisao + 2)
    const tamanho = p.getByRole('spinbutton', { name: 'Tamanho do conjunto', exact: true })
    await tamanho.fill('1.4')
    await tamanho.press('Tab')
    await aguardar(original.revisao + 3)
    const mudado = await ler(),
      m = mudado.documento.montagens[0]
    assert.equal(m.transformacao.posicao.x, 3)
    assert.ok(Math.abs(m.transformacao.rotacao.y - Math.PI / 6) < 1e-8)
    assert.deepEqual(m.transformacao.escala, { x: 1.4, y: 1.4, z: 1.4 })
    assert.equal(mudado.documento.instancias.length, 0)
    assert.deepEqual(mudado.documento.definicoesConjuntos[0].conteudo, ids.conteudo)
    await fechar()
    await p.screenshot({ path: resolve(saida, `conjunto-depois-${tema}-${largura}.png`) })
    await p.getByRole('button', { name: 'Luz e céu', exact: true }).click()
    await p.getByRole('button', { name: 'Noite', exact: true }).click()
    await salvo()
    assert.equal((await ler()).documento.iluminacao.hora, 22)
    await p.screenshot({ path: resolve(saida, `conjunto-noite-${tema}-${largura}.png`) })
    await p.getByRole('button', { name: 'Meio-dia', exact: true }).click()
    await salvo()
    await p.getByRole('button', { name: 'Objetos', exact: true }).click()
    await tecla('Control+d')
    await aguardar(mudado.revisao + 1)
    const duplicado = await ler()
    assert.equal(duplicado.documento.montagens.length, 2)
    assert.equal(duplicado.documento.definicoesConjuntos.length, 1)
    assert.notEqual(duplicado.documento.montagens[0].nome, duplicado.documento.montagens[1].nome)
    await tecla('Control+z')
    await aguardar(duplicado.revisao + 1)
    assert.equal((await ler()).documento.montagens.length, 1)
    await tecla('Control+a')
    await abrir()
    await p.getByRole('button', { name: 'Separar peças', exact: true }).click()
    const separado = await ler()
    assert.equal(separado.documento.montagens?.length ?? 0, 0)
    assert.equal(separado.documento.instancias.length, 2)
    await fechar()
    await tecla('Control+z')
    await aguardar(separado.revisao + 1)
    assert.equal((await ler()).documento.montagens.length, 1)
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Praça em conjunto', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).documento.montagens[0].transformacao, m.transformacao)
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      modeloReal: true,
      toqueNaRaiz: true,
      transformacoes: true,
      tamanhoUniforme: true,
      semClonesAutorais: true,
      iluminacaoDiurnaNoturna: true,
      duplicar: true,
      separarUndo: true,
      reabrir: true,
      erros,
    })
    console.log(`Conjunto conferido: ${tema} ${largura}px`)
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
