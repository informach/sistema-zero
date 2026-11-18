import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote7-guias-integracao'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const pagina = await navegador.newPage({ viewport: { width: 1440, height: 900 } }),
    erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForLoadState('networkidle')
  const inicio = await pagina.evaluate(
    async ({ coreUrl, motorUrl }) => {
      const core = await import(coreUrl),
        { criarPalco } = await import(motorUrl)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const documento = core.criarDocumentoVazio('qa', 'Guias integradas'),
        escolhidos = [],
        areas = [],
        medidas = [],
        estados = []
      documento.base = { tipo: 'plano', largura: 16, comprimento: 16 }
      documento.marcadores = [
        core.MarcadorSchema.parse({
          id: 'm',
          nome: 'Centro',
          grupo: null,
          oculto: false,
          bloqueado: false,
          posicao: { x: 0, y: 0, z: 0 },
          giro: 0,
          noChao: true,
          objeto: null,
        }),
      ]
      const palco = criarPalco(canvas, {
        movimentoReduzido: true,
        carregarModelo: async () => {
          throw Error('Este ensaio não usa um arquivo de modelo')
        },
        aoSelecionarMarcador: (id) => escolhidos.push(id),
        aoSelecionarArea: (ids) => areas.push([...ids]),
        aoMedir: (m) => medidas.push(m),
        aoMarcadores: (e) => estados.push(e),
      })
      palco.definirDocumento(documento)
      await palco.aguardarRecursos()
      palco.definirVista('cima')
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const semGuias = await palco.capturar(640)
      palco.definirGuiasDoJogo(true)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      const comGuias = await palco.capturar(640),
        iguais =
          (await core.digestDosBytes(new Uint8Array(await semGuias.arrayBuffer()))) ===
          (await core.digestDosBytes(new Uint8Array(await comGuias.arrayBuffer())))
      window.__guiasIntegradas = {
        palco,
        documento,
        antes: JSON.stringify(documento),
        escolhidos,
        areas,
        medidas,
        estados,
      }
      return { retratoSemGuias: iguais }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motorUrl: modulo('packages/molda-cenarios-motor/src/index.ts'),
    },
  )
  assert.equal(inicio.retratoSemGuias, true)
  await pagina.mouse.click(720, 450)
  await pagina.waitForFunction(() => window.__guiasIntegradas.escolhidos.length > 0)
  await pagina.screenshot({ path: resolve(saida, 'editor.png') })
  for (const modo of ['retangulo', 'laco']) {
    await pagina.evaluate((m) => window.__guiasIntegradas.palco.definirModoDeSelecao(m), modo)
    await pagina.mouse.move(100, 100)
    await pagina.mouse.down()
    if (modo === 'laco') {
      await pagina.mouse.move(1340, 100, { steps: 6 })
      await pagina.mouse.move(1340, 800, { steps: 6 })
      await pagina.mouse.move(100, 800, { steps: 6 })
      await pagina.mouse.move(100, 100, { steps: 6 })
    } else await pagina.mouse.move(1340, 800, { steps: 12 })
    await pagina.mouse.up()
    assert.deepEqual(await pagina.evaluate(() => window.__guiasIntegradas.areas.at(-1)), ['m'])
  }
  await pagina.evaluate(async () => {
    const { palco } = window.__guiasIntegradas
    palco.definirModoDeSelecao('ponto')
    await palco.iniciarTeste({ modo: 'terceira', inicio: { x: 0, y: 0, z: 0 } })
  })
  const teste = await pagina.evaluate(() => {
    const { palco } = window.__guiasIntegradas
    let protegeu = false
    try {
      palco.definirGuiasDoJogo(true)
    } catch {
      protegeu = true
    }
    return { estado: palco.estadoDoTeste(), protegeu }
  })
  assert.equal(teste.protegeu, true)
  assert.equal(teste.estado.modo, 'terceira')
  await pagina.screenshot({ path: resolve(saida, 'teste.png') })
  await pagina.evaluate(() => window.__guiasIntegradas.palco.encerrarTeste())
  const antes = await pagina.evaluate(() => window.__guiasIntegradas.escolhidos.length)
  await pagina.mouse.click(720, 450)
  await pagina.waitForFunction((n) => window.__guiasIntegradas.escolhidos.length > n, antes)
  const final = await pagina.evaluate(() => {
    const q = window.__guiasIntegradas
    q.palco.destruir()
    return {
      escolhidos: q.escolhidos,
      areas: q.areas,
      estados: q.estados,
      autoriaPreservada: JSON.stringify(q.documento) === q.antes,
    }
  })
  assert.equal(final.autoriaPreservada, true)
  assert.deepEqual(erros, [])
  assert.ok(final.estados.every((e) => !e.falhas.length))
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ...inicio, ...final, teste, erros }, null, 2),
  )
  console.log(
    JSON.stringify({
      ...inicio,
      escolhidos: final.escolhidos,
      areas: final.areas,
      autoriaPreservada: final.autoriaPreservada,
      protegeu: teste.protegeu,
      erros,
    }),
  )
} finally {
  await navegador.close()
}
