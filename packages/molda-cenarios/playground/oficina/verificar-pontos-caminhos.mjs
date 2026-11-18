import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote6-pontos'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
mkdirSync(saida, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const contexto = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      hasTouch: true,
      recordVideo: { dir: resolve(saida, 'movimento') },
    }),
    pagina = await contexto.newPage(),
    erros = [],
    workers = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  pagina.on('worker', (w) => workers.push(w.url()))
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForLoadState('networkidle')
  await pagina.evaluate(
    async ({ coreUrl, motor, oficina }) => {
      const core = await import(coreUrl),
        { criarPalco } = await import(motor),
        { criarHostEmMemoria } = await import(`${oficina}/host-memoria.ts`),
        { criarControlador } = await import(`${oficina}/controlador.ts`)
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.tabIndex = 0
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      const host = criarHostEmMemoria(),
        mundo = await host.criarMundo('conta', 'Pontos'),
        cenario = await host.criarCenario(mundo.id, 'Caminhos'),
        controlador = criarControlador(host, await host.abrirCenario(cenario.id))
      let cfg = { pontos: [], modo: 'adicionar', fechada: false, minimo: 2, maximo: 128 },
        avisos = [],
        cancelamentos = 0
      const p = criarPalco(canvas, {
        carregarTerreno: (digest, sinal) => host.conteudoDoTerreno(cenario.id, digest, sinal),
        carregarModelo: async () => {
          throw Error('Ensaio nativo')
        },
        aoEditarPontosDeCaminho: (g) => {
          if (g.documentoDeOrigem !== controlador.getState().documento)
            throw Error('Gesto de outra cabeça')
          cfg = { ...cfg, pontos: g.pontos, selecionado: g.selecionado }
          p.definirCapturaDeCaminho(cfg)
        },
        aoErroDePontosDeCaminho: (m) => avisos.push(m),
        aoCancelarPontosDeCaminho: () => cancelamentos++,
      })
      p.definirDocumento(controlador.getState().documento)
      p.definirVista('cima')
      p.enquadrar()
      p.definirCapturaDeCaminho(cfg)
      window.__pontosQA = {
        p,
        core,
        host,
        controlador,
        cenario,
        cfg: () => structuredClone(cfg),
        modo: (modo) => {
          cfg = { ...cfg, modo }
          p.definirCapturaDeCaminho(cfg)
        },
        pixel: (x, z) => {
          const o = p.pontoNoChao(720, 450),
            a = p.pontoNoChao(820, 450),
            b = p.pontoNoChao(720, 550),
            ax = a.x - o.x,
            az = a.z - o.z,
            bx = b.x - o.x,
            bz = b.z - o.z,
            det = ax * bz - az * bx
          return {
            x: 720 + (100 * ((x - o.x) * bz - (z - o.z) * bx)) / det,
            y: 450 + (100 * ((z - o.z) * ax - (x - o.x) * az)) / det,
          }
        },
        avisos: () => avisos,
        cancelamentos: () => cancelamentos,
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motor: modulo('packages/molda-cenarios-motor/src/Palco.ts'),
      oficina: modulo('packages/molda-cenarios/src/oficina'),
    },
  )
  await pagina.waitForTimeout(150)
  const pixel = (x, z) => pagina.evaluate(([x, z]) => window.__pontosQA.pixel(x, z), [x, z]),
    clicar = async (x, z) => {
      const p = await pixel(x, z)
      await pagina.mouse.click(p.x, p.y)
    },
    pontos = () => pagina.evaluate(() => window.__pontosQA.cfg().pontos)
  for (const [x, z] of [
    [-8, -4],
    [0, -4],
    [8, 4],
  ])
    await clicar(x, z)
  assert.equal((await pontos()).length, 3)
  await pagina.keyboard.press('Delete')
  assert.equal((await pontos()).length, 2)
  await pagina.keyboard.press('Delete')
  assert.equal((await pontos()).length, 2)
  await pagina.evaluate(() => window.__pontosQA.modo('inserir'))
  await clicar(-4, -4)
  assert.equal((await pontos()).length, 3)
  await pagina.evaluate(() => window.__pontosQA.modo('mover'))
  const de = await pixel(-4, -4),
    ate = await pixel(-4, 0)
  await pagina.mouse.move(de.x, de.y)
  await pagina.mouse.down()
  await pagina.mouse.move(ate.x, ate.y, { steps: 8 })
  await pagina.mouse.up()
  const movidos = await pontos()
  assert.ok(Math.abs(movidos[1].z) < 0.1)
  const inicio = await pixel(movidos[1].x, movidos[1].z)
  await pagina.mouse.move(inicio.x, inicio.y)
  await pagina.mouse.down()
  await pagina.mouse.move(inicio.x + 60, inicio.y + 30, { steps: 5 })
  await pagina.keyboard.press('Escape')
  await pagina.mouse.up()
  assert.deepEqual(await pontos(), movidos)
  const cdp = await contexto.newCDPSession(pagina),
    toque = (id, x, y) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [toque(1, inicio.x, inicio.y)],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [toque(1, inicio.x + 30, inicio.y)],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [toque(1, inicio.x + 30, inicio.y), toque(2, inicio.x + 90, inicio.y + 40)],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.deepEqual(await pontos(), movidos)
  await pagina.evaluate(() => window.__pontosQA.modo('adicionar'))
  const vazio = await pixel(20, 20)
  await pagina.mouse.move(vazio.x, vazio.y)
  await pagina.mouse.down()
  await pagina.mouse.move(vazio.x + 60, vazio.y + 40, { steps: 5 })
  await pagina.mouse.up()
  assert.deepEqual(await pontos(), movidos)
  await pagina.evaluate(() => window.__pontosQA.p.definirVista('cima'))
  await pagina.screenshot({ path: resolve(saida, 'pontos.png') })
  const resultado = await pagina.evaluate(
    async ({ oficina }) => {
      const { p, host, controlador, cenario } = window.__pontosQA,
        { processarCaminhoNoWorker } = await import(`${oficina}/processar-caminho-no-worker.ts`),
        { guardarCaminho } = await import(`${oficina}/caminho-autoria.ts`)
      if (controlador.getState().revisao !== 0) throw Error('Editar pontos não pode criar revisões')
      p.definirCapturaDeCaminho(null)
      const base = {
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
      controlador.executar([{ tipo: 'base.definir', base }])
      await controlador.terminar()
      const origem = controlador.getState().documento
      p.definirDocumento(origem)
      await p.aguardarRecursos()
      const estado = p.estadoDoTerreno(),
        intencao = {
          id: 'estrada',
          nome: 'Estrada',
          tipo: 'estrada',
          grupo: null,
          oculto: false,
          bloqueado: false,
          acabamento: null,
          largura: 3,
          pontos: [
            { x: 8, z: 32 },
            { x: 56, z: 32 },
          ],
          molde: { deslocamento: -0.25, borda: 2, suavizacao: 4 },
        },
        op = await processarCaminhoNoWorker({ intencao, estado }, new AbortController().signal)
      if (estado.campo.alturas.byteLength !== 0)
        throw Error('A cópia não foi transferida ao worker')
      if (p.estadoDoTerreno().campo.alturas[32 * 65 + 32] !== 10)
        throw Error('O worker alterou o campo publicado')
      p.preverCaminho(origem, op)
      const h = p.fonteDeAlturas()(32, 32)
      if (Math.abs(h - 9.75) > 0.001) throw Error('A prévia não moldou o campo')
      p.finalizarPreviaDeAgua(true)
      if (p.fonteDeAlturas()(32, 32) !== h) throw Error('A água cancelou a estrada')
      let bloqueioTeste = false,
        bloqueioRetrato = false
      try {
        await p.iniciarTeste({ modo: 'terceira', altura: 1.17 })
      } catch {
        bloqueioTeste = true
      }
      try {
        await p.capturar()
      } catch {
        bloqueioRetrato = true
      }
      p.finalizarPreviaDeCaminho(true)
      if (p.fonteDeAlturas()(32, 32) !== 10) throw Error('Cancelar não restaurou o campo')
      p.preverCaminho(origem, op)
      const salvo = await guardarCaminho({
        controlador,
        palco: p,
        documentoDeOrigem: origem,
        operacao: op,
      })
      p.definirDocumento(controlador.getState().documento)
      await p.aguardarRecursos()
      p.enquadrar()
      const final = await host.abrirCenario(cenario.id)
      await controlador.desfazer()
      p.definirDocumento(controlador.getState().documento)
      await p.aguardarRecursos()
      const desfeito = p.fonteDeAlturas()(32, 32)
      await controlador.refazer()
      p.definirDocumento(controlador.getState().documento)
      await p.aguardarRecursos()
      const refeito = p.fonteDeAlturas()(32, 32)
      const abortador = new AbortController(),
        preparando = processarCaminhoNoWorker(
          { intencao, estado: p.estadoDoTerreno() },
          abortador.signal,
        )
      abortador.abort()
      let cancelouWorker = false
      try {
        await preparando
      } catch (e) {
        cancelouWorker = e.name === 'AbortError'
      }
      return {
        salvo,
        revisao: final.revisao,
        caminhos: final.documento.caminhos.length,
        pecas: final.documento.base.pecas.length,
        desfeito,
        refeito,
        bloqueioTeste,
        bloqueioRetrato,
        cancelouWorker,
        avisos: window.__pontosQA.avisos(),
      }
    },
    { oficina: modulo('packages/molda-cenarios/src/oficina') },
  )
  await pagina.waitForTimeout(150)
  await pagina.screenshot({ path: resolve(saida, 'estrada.png') })
  await pagina.evaluate(() => window.__pontosQA.p.destruir())
  await contexto.close()
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify({ ...resultado, pontos: movidos, workers, erros }, null, 2),
  )
  console.log(JSON.stringify({ ...resultado, pontos: movidos, workers: workers.length, erros }))
  assert.deepEqual(erros, [])
  assert.equal(resultado.revisao, 2)
  assert.equal(resultado.caminhos, 1)
  assert.equal(resultado.pecas, 1)
  assert.equal(resultado.desfeito, 10)
  assert.ok(Math.abs(resultado.refeito - 9.75) < 0.001)
  assert.equal(resultado.bloqueioTeste, true)
  assert.equal(resultado.bloqueioRetrato, true)
  assert.equal(resultado.cancelouWorker, true)
} finally {
  await browser.close()
}
