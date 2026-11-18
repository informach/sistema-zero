import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote5-edicao')
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 1100, height: 800 } }),
    erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForLoadState('networkidle')
  const modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
  await pagina.evaluate(
    async ({ coreUrl, motorUrl }) => {
      const core = await import(coreUrl),
        motor = await import(motorUrl)
      const canvas = document.createElement('canvas')
      Object.assign(canvas.style, {
        position: 'fixed',
        inset: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '99999',
        touchAction: 'none',
      })
      document.body.append(canvas)
      const doc = core.criarDocumentoVazio('c', 'Água')
      doc.base = {
        tipo: 'terreno',
        cobertura: 'grade',
        origem: { x: 0, z: 0 },
        colunas: 64,
        linhas: 64,
        passo: 1,
        min: -20,
        max: 40,
        fundo: 10,
        pecas: [],
      }
      const pontos = [],
        selecoes = []
      const p = motor.criarPalco(canvas, {
        carregarModelo: async () => {
          throw Error('Não há modelos nesta prova')
        },
        aoCapturarPontoDaAgua: (ponto) => {
          pontos.push(ponto)
          p.definirCapturaDeAgua([...pontos])
        },
        aoSelecionarAgua: (id) => selecoes.push(id),
        movimentoReduzido: true,
      })
      p.definirDocumento(doc)
      await p.aguardarRecursos()
      p.definirVista('cima')
      p.enquadrar()
      p.definirCapturaDeAgua([])
      window.aguaQA = { core, p, doc, pontos, selecoes }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motorUrl: modulo('packages/molda-cenarios-motor/src/index.ts'),
    },
  )
  await pagina.waitForTimeout(100)
  await pagina.mouse.click(550, 400)
  assert.equal(await pagina.evaluate(() => window.aguaQA.pontos.length), 1)
  await pagina.mouse.move(500, 400)
  await pagina.mouse.down()
  await pagina.mouse.move(580, 400, { steps: 8 })
  await pagina.mouse.up()
  assert.equal(
    await pagina.evaluate(() => window.aguaQA.pontos.length),
    1,
    'orbitar não captura pontos',
  )
  const resultado = await pagina.evaluate(async () => {
    const { core, p, doc, pontos } = window.aguaQA,
      antes = JSON.stringify(doc)
    let bloqueouCaptura = false,
      bloqueouPrevia = false
    try {
      await p.iniciarTeste({ modo: 'voo' })
    } catch {
      bloqueouCaptura = true
    }
    p.definirCapturaDeAgua(null)
    const r = core.prepararOperacaoDeAgua(
      { id: 'rio', nome: 'Rio' },
      {
        tipo: 'rio',
        pontos: [
          { x: 8, z: 32 },
          { x: 56, z: 32 },
        ],
        largura: 4,
        profundidade: 2,
      },
      p.estadoDoTerreno(),
    )
    p.preverAgua(doc, r)
    const alturaPrevia = p.fonteDeAlturas()(32, 32)
    try {
      await p.capturar()
    } catch {
      bloqueouPrevia = true
    }
    let bloqueouTeste = false
    try {
      await p.iniciarTeste({ modo: 'voo' })
    } catch {
      bloqueouTeste = true
    }
    p.finalizarPreviaDeAgua(true)
    const alturaRestaurada = p.fonteDeAlturas()(32, 32)
    p.preverAgua(doc, r)
    const nova = { ...doc, nome: 'Nova cabeça' }
    p.definirDocumento(nova)
    const alturaNova = p.fonteDeAlturas()(32, 32)
    let recusouAntiga = false
    try {
      p.preverAgua(doc, r)
    } catch (e) {
      recusouAntiga = e.name === 'AbortError'
    }
    const mar = core.prepararOperacaoDeAgua(
      { id: 'mar', nome: 'Mar' },
      { tipo: 'mar', nivel: 11 },
      null,
    )
    p.definirDocumento({ ...nova, aguas: [mar.agua] })
    p.definirVista('cima')
    p.enquadrar()
    return {
      capturados: pontos.length,
      bloqueouCaptura,
      bloqueouPrevia,
      bloqueouTeste,
      alturaPrevia,
      alturaRestaurada,
      alturaNova,
      recusouAntiga,
      autoriaIntacta: JSON.stringify(doc) === antes,
    }
  })
  await pagina.waitForTimeout(100)
  await pagina.mouse.click(550, 400)
  resultado.selecoes = await pagina.evaluate(() => window.aguaQA.selecoes)
  assert.equal(resultado.bloqueouCaptura, true)
  assert.equal(resultado.bloqueouPrevia, true)
  assert.equal(resultado.bloqueouTeste, true)
  assert.ok(resultado.alturaPrevia < 10)
  assert.equal(resultado.alturaRestaurada, 10)
  assert.equal(resultado.alturaNova, 10)
  assert.equal(resultado.recusouAntiga, true)
  assert.equal(resultado.autoriaIntacta, true)
  assert.deepEqual(resultado.selecoes, ['mar'])
  await pagina.screenshot({ path: resolve(saida, 'selecao-mar.png') })
  await pagina.evaluate(() => window.aguaQA.p.destruir())
  assert.deepEqual(erros, [])
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify({ ...resultado, erros }, null, 2))
  console.log(JSON.stringify(resultado))
} finally {
  await navegador.close()
}
