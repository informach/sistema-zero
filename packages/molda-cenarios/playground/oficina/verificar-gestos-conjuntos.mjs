import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-conjuntos-gestos')
mkdirSync(saida, { recursive: true })
const raiz = resolve(import.meta.dirname, '../../../..'),
  fs = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
let page
try {
  page = await browser.newPage({ viewport: { width: 1100, height: 850 } })
  await page.goto('http://127.0.0.1:4541/?vazio=1')
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => window.__cenarios)
  const pontos = await page.evaluate(
    async ({ corePath, motorPath, threePath }) => {
      const core = await import(corePath),
        motor = await import(motorPath),
        three = await import(threePath)
      const caixa = document.createElement('div')
      caixa.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:800px;z-index:99999'
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'width:800px;height:800px'
      caixa.append(canvas)
      document.body.append(caixa)
      const d = core.criarDocumentoVazio('gesto', 'Gestos')
      d.formas = [{ id: 'f', nome: 'Bloco', tipo: 'caixa', largura: 2, altura: 1, comprimento: 2 }]
      d.instancias = [
        {
          id: 'bloco',
          nome: 'Bloco',
          modelo: 'f',
          grupo: null,
          oculto: false,
          bloqueado: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        },
      ]
      const conteudo = core.capturarConteudoDeConjunto(d, ['bloco'], 'conta')
      const doc = core.criarDocumentoVazio('gesto', 'Gestos')
      doc.definicoesConjuntos = [
        { id: 'd', biblioteca: 'b', conjunto: 'j', revisao: 1, nome: 'Bloco', conteudo },
      ]
      doc.montagens = [
        {
          id: 'montagem',
          nome: 'Bloco',
          grupo: null,
          bloqueado: false,
          oculto: false,
          definicao: 'd',
          transformacao: {
            posicao: { x: 0, y: 0, z: 0 },
            rotacao: { x: 0, y: 0, z: 0 },
            escala: { x: 1, y: 1, z: 1 },
          },
        },
      ]
      const estado = { gestos: 0, mudancas: [], iniciado: false, aceitar: false, documento: doc }
      const palco = motor.criarPalco(canvas, {
        carregarModelo: async () => {
          throw Error('Só formas neste ensaio')
        },
        movimentoReduzido: true,
        aoGesto: (ativo) => {
          estado.iniciado = ativo
        },
        aoTransformar: (mudancas) => {
          estado.gestos++
          estado.mudancas = mudancas
          if (estado.aceitar) {
            const novo = core.executarLote(
              { documento: estado.documento, revisao: 0 },
              {
                revisaoEsperada: 0,
                comandos: mudancas.map((m) => ({
                  tipo: 'montagem.atualizar',
                  id: m.id,
                  alteracoes: { transformacao: m.transformacao },
                })),
              },
            )
            estado.documento = novo.documento
            palco.definirDocumento(novo.documento)
            return true
          }
          return false
        },
      })
      palco.definirDocumento(doc)
      palco.definirSelecao(['montagem'])
      palco.definirFerramenta('mover')
      await palco.aguardarRecursos()
      await new Promise(requestAnimationFrame)
      await new Promise(requestAnimationFrame)
      const hash = async () => {
        const b = await palco.capturar(256)
        return Array.from(
          new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer())),
        )
          .map((v) => v.toString(16).padStart(2, '0'))
          .join('')
      }
      const camera = new three.PerspectiveCamera(48, 1, 0.1, 6000)
      camera.position.set(16, 13, 20)
      camera.lookAt(0, 0.5, 0)
      camera.updateMatrixWorld(true)
      const projetar = (x) => {
        const p = new three.Vector3(x, 0, 0).project(camera)
        return { x: (p.x + 1) * 400, y: (1 - p.y) * 400 }
      }
      const factor =
        (camera.position.distanceTo(new three.Vector3()) *
          Math.min(1.9 * Math.tan((Math.PI * 48) / 360), 7) *
          0.9) /
        4
      window.__gestoQA = { palco, doc, estado, hash, antes: await hash(), motor }
      return { inicio: projetar(factor * 0.35), fim: projetar(factor * 0.35 + 3) }
    },
    {
      corePath: fs('packages/molda-cenarios-core/src/v2/index.ts'),
      motorPath: fs('packages/molda-cenarios-motor/src/index.ts'),
      threePath: fs('node_modules/three/build/three.module.js'),
    },
  )
  await page.screenshot({ path: resolve(saida, 'antes.png') })
  await page.mouse.move(pontos.inicio.x, pontos.inicio.y)
  await page.mouse.down()
  await page.mouse.move(pontos.fim.x, pontos.fim.y, { steps: 15 })
  await page.mouse.up()
  await page.mouse.move(1000, 820)
  const resultado = await page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    const q = window.__gestoQA
    return {
      gestos: q.estado.gestos,
      mudancas: q.estado.mudancas,
      iniciado: q.estado.iniciado,
      antes: q.antes,
      depois: await q.hash(),
    }
  })
  await page.screenshot({ path: resolve(saida, 'gesto.png') })
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  assert.equal(resultado.gestos, 1, 'Arraste não alcançou a alça nativa')
  assert.ok(resultado.mudancas[0].transformacao.posicao.x > 1)
  assert.equal(
    resultado.depois,
    resultado.antes,
    'Gesto recusado deixou a prévia fora do documento autoral',
  )
  console.log('Recusa do gesto nativo conferida')
  await page.mouse.move(pontos.inicio.x, pontos.inicio.y)
  await page.mouse.down()
  await page.mouse.move(pontos.fim.x, pontos.fim.y, { steps: 10 })
  await page.evaluate(() => {
    const q = window.__gestoQA,
      nova = structuredClone(q.doc)
    nova.montagens[0].transformacao.posicao.x = 7
    q.nova = nova
    q.palco.definirDocumento(nova)
  })
  await page.mouse.up()
  await page.mouse.move(1000, 820)
  const atualizacao = await page.evaluate(async () => {
    const q = window.__gestoQA
    await new Promise(requestAnimationFrame)
    const depois = await q.hash()
    q.palco.definirDocumento(q.nova)
    const correto = await q.hash()
    return { gestos: q.estado.gestos, depois, correto }
  })
  assert.equal(atualizacao.gestos, 1, 'Gesto antigo foi publicado sobre uma cabeça nova')
  assert.equal(atualizacao.depois, atualizacao.correto)
  writeFileSync(resolve(saida, 'atualizacao.json'), JSON.stringify(atualizacao, null, 2))
  console.log('Atualização durante arraste conferida')
  await page.evaluate(() => window.__gestoQA.palco.definirDocumento(window.__gestoQA.doc))
  await page.mouse.move(pontos.inicio.x, pontos.inicio.y)
  await page.mouse.down()
  await page.mouse.move(pontos.fim.x, pontos.fim.y, { steps: 10 })
  await page.evaluate(() => {
    document
      .querySelector('div[style*="z-index: 99999"] canvas')
      .dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1, bubbles: true }))
  })
  await page.mouse.up()
  await page.mouse.move(1000, 820)
  const cancelamento = await page.evaluate(async () => {
    const q = window.__gestoQA
    await new Promise(requestAnimationFrame)
    return {
      gestos: q.estado.gestos,
      iniciado: q.estado.iniciado,
      antes: q.antes,
      depois: await q.hash(),
    }
  })
  assert.equal(cancelamento.gestos, 1, 'Cancelar o ponteiro publicou o gesto')
  assert.equal(cancelamento.iniciado, false)
  assert.equal(cancelamento.antes, cancelamento.depois)
  await page.evaluate(() => {
    window.__gestoQA.estado.aceitar = true
  })
  await page.mouse.move(pontos.inicio.x, pontos.inicio.y)
  await page.mouse.down()
  await page.mouse.move(pontos.fim.x, pontos.fim.y, { steps: 12 })
  await page.mouse.up()
  await page.mouse.move(1000, 820)
  const aceito = await page.evaluate(() => {
    const q = window.__gestoQA
    return {
      gestos: q.estado.gestos,
      transformacao: q.estado.documento.montagens[0].transformacao,
      origem: q.doc.montagens[0].transformacao,
    }
  })
  assert.equal(aceito.gestos, 2)
  assert.ok(aceito.transformacao.posicao.x > 1)
  assert.equal(aceito.origem.posicao.x, 0)
  writeFileSync(resolve(saida, 'aceito.json'), JSON.stringify(aceito, null, 2))
  const fotos = await page.evaluate(async () => {
    const q = window.__gestoQA,
      inicio = document.querySelectorAll('canvas').length
    const carregarModelo = async () => {
      throw Error('Modelo indisponível no ensaio')
    }
    const falha = structuredClone(q.doc)
    falha.definicoesConjuntos[0].conteudo.modelos = [
      {
        id: 'ausente',
        biblioteca: 'b',
        modelo: 'm',
        digest: 'a'.repeat(64),
        volume: { min: { x: 0, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } },
      },
    ]
    falha.definicoesConjuntos[0].conteudo.instancias[0].modelo = 'ausente'
    let recusou = false
    try {
      await q.motor.fotografarComposicao(falha, { carregarModelo })
    } catch {
      recusou = true
    }
    const abort = new AbortController()
    const cancelada = q.motor.fotografarComposicao(
      falha,
      {
        carregarModelo: async () => {
          await new Promise((r) => setTimeout(r, 100))
          throw Error('Carga encerrada')
        },
      },
      abort.signal,
    )
    setTimeout(() => abort.abort(), 10)
    let cancelou = false
    try {
      await cancelada
    } catch (e) {
      cancelou = e.name === 'AbortError'
    }
    const tamanhos = []
    for (let i = 0; i < 8; i++) {
      const foto = await q.motor.fotografarComposicao(q.doc, { carregarModelo })
      tamanhos.push(foto.size)
    }
    return {
      recusou,
      cancelou,
      ciclos: tamanhos.length,
      fotosValidas: tamanhos.every((n) => n > 100 && n < 262144),
      canvasAntes: inicio,
      canvasDepois: document.querySelectorAll('canvas').length,
    }
  })
  assert.equal(fotos.recusou, true)
  assert.equal(fotos.cancelou, true)
  assert.equal(fotos.fotosValidas, true)
  assert.equal(fotos.canvasAntes, fotos.canvasDepois)
  writeFileSync(resolve(saida, 'fotografias.json'), JSON.stringify(fotos, null, 2))
  console.log('Falha, cancelamento, oito fotografias e limpeza de canvas conferidos')
} finally {
  await browser.close()
}
