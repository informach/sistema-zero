import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, 'output/cenarios-reforma/lote7-gestos'),
  modulo = (p) => `/@fs/${resolve(raiz, p).replaceAll('\\', '/')}`
const threeModulo = modulo(
  resolve(
    dirname(
      createRequire(resolve(raiz, 'packages/molda-cenarios-motor/package.json')).resolve('three'),
    ),
    'three.module.js',
  ),
)
mkdirSync(saida, { recursive: true })
const navegador = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const contexto = await navegador.newContext({
      viewport: { width: 1440, height: 900 },
      hasTouch: true,
      recordVideo: { dir: resolve(saida, 'movimento') },
    }),
    pagina = await contexto.newPage(),
    erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  pagina.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
  await pagina.goto('http://127.0.0.1:4541/?vazio=1')
  await pagina.waitForLoadState('networkidle')
  await pagina.evaluate(
    async ({ coreUrl, motorUrl, oficina }) => {
      const core = await import(coreUrl),
        { criarPalco } = await import(motorUrl),
        { criarHostEmMemoria } = await import(`${oficina}/host-memoria.ts`),
        { criarControlador } = await import(`${oficina}/controlador.ts`),
        { comandosDoGesto } = await import(`${oficina}/acoes.ts`),
        host = criarHostEmMemoria(),
        mundo = await host.criarMundo('conta', 'Guias'),
        cenario = await host.criarCenario(mundo.id, 'Gestos'),
        ctl = criarControlador(host, await host.abrirCenario(cenario.id)),
        base = {
          grupo: null,
          oculto: false,
          bloqueado: false,
          posicao: { x: 0, y: 0, z: 0 },
          giro: 0,
          noChao: true,
          objeto: null,
        }
      ctl.executar([
        {
          tipo: 'marcador.definir',
          marcador: {
            ...base,
            id: 'zona',
            nome: 'Zona',
            configuracao: { tipo: 'zona', forma: { tipo: 'caixa', tamanho: { x: 2, y: 2, z: 2 } } },
          },
        },
        {
          tipo: 'marcador.definir',
          marcador: {
            ...base,
            id: 'inicio',
            nome: 'Início',
            posicao: { x: -4, y: 0, z: -3 },
            giro: Math.PI / 2,
            configuracao: { tipo: 'inicio', principal: true },
          },
        },
      ])
      await ctl.terminar()
      document.querySelector('#root').remove()
      const canvas = document.createElement('canvas')
      canvas.tabIndex = 0
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%'
      document.body.append(canvas)
      let gestos = 0,
        captura = null,
        cancelamentos = 0
      const colisoes = [],
        donos = []
      const palco = criarPalco(canvas, {
        movimentoReduzido: true,
        aoColisoesVisiveis: (e) => colisoes.push(e),
        aoEditarPontosDeCaminho: (g, dono) => {
          if (g.documentoDeOrigem !== ctl.getState().documento)
            throw Error('Cabeça antiga publicou pontos')
          captura = { ...captura, pontos: g.pontos, selecionado: g.selecionado }
          donos.push(dono)
          palco.definirCapturaDeCaminho(captura, dono)
        },
        aoCancelarPontosDeCaminho: () => {
          captura = null
          cancelamentos++
        },
        carregarModelo: async () => {
          throw Error('Não usa GLB')
        },
        aoTransformar: (mudancas) => {
          const aceito = ctl.executar(
            comandosDoGesto(ctl.getState().documento, mudancas, palco.fonteDeAlturas()),
          )
          if (aceito) {
            gestos++
            palco.definirDocumento(ctl.getState().documento)
          }
          return aceito
        },
      })
      palco.definirDocumento(ctl.getState().documento)
      await palco.aguardarRecursos()
      palco.definirGuiasDoJogo(true)
      palco.restaurarCamera({
        posicao: { x: 0, y: 8, z: 12 },
        alvo: { x: 0, y: 0, z: 0 },
        campoDeVisao: 48,
      })
      palco.definirSelecao(['zona'])
      palco.definirFerramenta('mover')
      window.__gestos = {
        core,
        host,
        cenario,
        ctl,
        palco,
        gestos: () => gestos,
        colisoes,
        captura: () => captura,
        donos,
        definirCaptura: (c, dono = 'caminhos') => {
          captura = c
          palco.definirCapturaDeCaminho(c, dono)
        },
        cancelamentos: () => cancelamentos,
      }
    },
    {
      coreUrl: modulo('packages/molda-cenarios-core/src/v2/index.ts'),
      motorUrl: modulo('packages/molda-cenarios-motor/src/index.ts'),
      oficina: modulo('packages/molda-cenarios/src/oficina'),
    },
  )

  const quadro = () =>
      pagina.evaluate(
        () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
      ),
    estado = () =>
      pagina.evaluate(() => ({
        documento: window.__gestos.ctl.getState().documento,
        gestos: window.__gestos.gestos(),
      })),
    alcaX = async () => {
      await pagina.mouse.move(30, 30)
      await quadro()
      const imagem = await pagina.locator('canvas').screenshot()
      return pagina.evaluate(async (base64) => {
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
          img = await createImageBitmap(new Blob([bytes], { type: 'image/png' })),
          c = document.createElement('canvas')
        c.width = img.width
        c.height = img.height
        const ctx = c.getContext('2d')
        ctx.drawImage(img, 0, 0)
        img.close()
        const a = ctx.getImageData(0, 0, c.width, c.height).data,
          pontos = []
        for (let y = 0; y < c.height; y++)
          for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4
            if (a[i] > 180 && a[i + 1] < 100 && a[i + 2] < 100) pontos.push({ x, y })
          }
        if (!pontos.length) throw Error('Alça X não apareceu na captura')
        const max = Math.max(...pontos.map((p) => p.x)),
          ponta = pontos.filter((p) => p.x >= max - 8)
        return {
          x: ponta.reduce((n, p) => n + p.x, 0) / ponta.length,
          y: ponta.reduce((n, p) => n + p.y, 0) / ponta.length,
        }
      }, imagem.toString('base64'))
    },
    arrastar = async (delta, cancelar = false) => {
      const p = await alcaX()
      await pagina.mouse.move(p.x, p.y)
      await pagina.mouse.down()
      await pagina.mouse.move(p.x + delta, p.y, { steps: 10 })
      if (cancelar) await pagina.keyboard.press('Escape')
      await pagina.mouse.up()
      await quadro()
      return p
    }
  const antes = await estado()
  await arrastar(90)
  const movido = await estado()
  assert.equal(movido.gestos, 1)
  assert.ok(movido.documento.marcadores[0].posicao.x > 0.5)
  assert.equal(movido.documento.marcadores[0].posicao.y, 0)
  await pagina.screenshot({ path: resolve(saida, 'mover.png') })
  await arrastar(65, true)
  assert.deepEqual(await estado(), movido)
  const touch = await contexto.newCDPSession(pagina),
    eixo = await alcaX(),
    dedo = (id, x, y) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 })
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [dedo(1, eixo.x, eixo.y)],
  })
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [dedo(1, eixo.x + 50, eixo.y)],
  })
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [dedo(1, eixo.x + 50, eixo.y), dedo(2, eixo.x + 120, eixo.y + 80)],
  })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.deepEqual(await estado(), movido)
  await pagina.evaluate(() => window.__gestos.palco.definirFerramenta('tamanho'))
  await arrastar(40)
  const escalado = await estado()
  assert.equal(escalado.gestos, 2)
  assert.ok(escalado.documento.marcadores[0].configuracao.forma.tamanho.x > 2)
  await pagina.evaluate(async () => {
    const { ctl, palco } = window.__gestos
    await ctl.terminar()
    await ctl.desfazer()
    palco.definirDocumento(ctl.getState().documento)
  })
  assert.deepEqual((await estado()).documento, movido.documento)
  const eixoNovo = await alcaX()
  await pagina.mouse.move(eixoNovo.x, eixoNovo.y)
  await pagina.mouse.down()
  await pagina.mouse.move(eixoNovo.x + 35, eixoNovo.y, { steps: 5 })
  await pagina.evaluate(() => {
    const { ctl, palco } = window.__gestos,
      marco = ctl.getState().documento.marcadores[0]
    ctl.executar([{ tipo: 'marcador.definir', marcador: { ...marco, nome: 'Cabeça nova' } }])
    palco.definirDocumento(ctl.getState().documento)
  })
  await pagina.mouse.up()
  const cabecaNova = await estado()
  assert.equal(cabecaNova.gestos, 2)
  assert.equal(cabecaNova.documento.marcadores[0].nome, 'Cabeça nova')
  assert.deepEqual(
    cabecaNova.documento.marcadores[0].posicao,
    movido.documento.marcadores[0].posicao,
  )
  const cam = await pagina.evaluate(() => {
    const p = window.__gestos.palco,
      antes = p.capturarCamera(),
      vista = { posicao: { x: 7, y: 6, z: 9 }, alvo: { x: 1, y: 0, z: -1 }, campoDeVisao: 61 }
    p.restaurarCamera(vista)
    const voltou = p.capturarCamera()
    p.restaurarCamera(antes)
    return { vista, voltou, antes, depois: p.capturarCamera() }
  })
  const mesmaVista = (a, b) =>
    ['posicao', 'alvo'].every(
      (p) => Math.hypot(...['x', 'y', 'z'].map((e) => a[p][e] - b[p][e])) < 1e-9,
    ) && Math.abs(a.campoDeVisao - b.campoDeVisao) < 1e-9
  assert.ok(mesmaVista(cam.voltou, cam.vista))
  assert.ok(mesmaVista(cam.depois, cam.antes))
  const colisao = await pagina.evaluate(async () => {
    const { palco, core, colisoes } = window.__gestos
    const sem = await palco.capturar(640)
    palco.definirColisoesVisiveis(true)
    const com = await palco.capturar(640)
    return {
      estado: colisoes.at(-1),
      retratoLimpo:
        (await core.digestDosBytes(new Uint8Array(await sem.arrayBuffer()))) ===
        (await core.digestDosBytes(new Uint8Array(await com.arrayBuffer()))),
    }
  })
  assert.equal(colisao.estado.erro, null)
  assert.equal(colisao.estado.triangulos, 2)
  assert.equal(colisao.retratoLimpo, true)
  await pagina.screenshot({ path: resolve(saida, 'colisoes.png') })
  const teste = await pagina.evaluate(async () => {
    const { palco, ctl } = window.__gestos,
      autoria = JSON.stringify(ctl.getState().documento),
      vista = palco.capturarCamera()
    await palco.iniciarTeste({ modo: 'primeira' })
    const estado = palco.estadoDoTeste()
    let protegeu = false
    try {
      palco.restaurarCamera(vista)
    } catch {
      protegeu = true
    }
    palco.encerrarTeste()
    return {
      estado,
      protegeu,
      vista,
      retorno: palco.capturarCamera(),
      autoriaPreservada: JSON.stringify(ctl.getState().documento) === autoria,
    }
  })
  assert.ok(Math.abs(teste.estado.posicao.x + 4) < 0.01)
  assert.ok(Math.abs(teste.estado.posicao.z + 3) < 0.01)
  assert.equal(teste.protegeu, true)
  assert.ok(mesmaVista(teste.retorno, teste.vista))
  assert.equal(teste.autoriaPreservada, true)
  await pagina.evaluate(async () => {
    const { palco } = window.__gestos
    await palco.iniciarTeste({ modo: 'primeira' })
    palco.entradaDoTeste({ frente: 1 })
  })
  await pagina.waitForFunction(() => window.__gestos.palco.estadoDoTeste().posicao.x < -4.3)
  const direcaoInicial = await pagina.evaluate(() => {
    const { palco } = window.__gestos,
      posicao = palco.estadoDoTeste().posicao
    palco.entradaDoTeste({ frente: 0 })
    palco.encerrarTeste()
    return posicao
  })
  assert.ok(Math.abs(direcaoInicial.z + 3) < 0.01)
  await pagina.evaluate(() => {
    const { palco } = window.__gestos
    palco.definirColisoesVisiveis(false)
    palco.definirFerramenta('selecionar')
    palco.definirSelecao([])
    palco.restaurarCamera({
      posicao: { x: 0, y: 12, z: 0.001 },
      alvo: { x: 0, y: 0, z: 0 },
      campoDeVisao: 48,
    })
    window.__gestos.definirCaptura(
      {
        pontos: [
          { x: -2, y: 1.5, z: 0 },
          { x: 2, y: 1.5, z: 0 },
        ],
        modo: 'mover',
        minimo: 2,
        maximo: 512,
        fechada: false,
        conservarDistanciaDoChao: true,
      },
      'jogo',
    )
    // Um efeito do painel inativo não pode apagar a captura do Jogo.
    palco.definirCapturaDeCaminho(null, 'caminhos')
  })
  const pixel = (p) =>
    pagina.evaluate(
      async ({ p, three }) => {
        const { PerspectiveCamera, Vector3 } = await import(three),
          v = window.__gestos.palco.capturarCamera(),
          camera = new PerspectiveCamera(v.campoDeVisao, innerWidth / innerHeight, 0.01, 10000)
        camera.position.set(v.posicao.x, v.posicao.y, v.posicao.z)
        camera.lookAt(v.alvo.x, v.alvo.y, v.alvo.z)
        camera.updateMatrixWorld()
        const q = new Vector3(p.x, p.y + 0.05, p.z).project(camera)
        return { x: ((q.x + 1) * innerWidth) / 2, y: ((1 - q.y) * innerHeight) / 2 }
      },
      { p, three: threeModulo },
    )
  await quadro()
  const de = await pixel({ x: -2, y: 1.5, z: 0 })
  await pagina.mouse.move(de.x, de.y)
  await pagina.mouse.down()
  await pagina.mouse.move(de.x + 80, de.y + 40, { steps: 8 })
  await pagina.mouse.up()
  const pontos = await pagina.evaluate(() => window.__gestos.captura().pontos)
  assert.ok(pontos[0].x > -1.5)
  assert.equal(pontos[0].y, 1.5)
  const novo = await pixel(pontos[0])
  await pagina.mouse.move(novo.x, novo.y)
  await pagina.mouse.down()
  await pagina.mouse.move(novo.x + 60, novo.y, { steps: 6 })
  await pagina.keyboard.press('Escape')
  await pagina.mouse.up()
  assert.deepEqual(await pagina.evaluate(() => window.__gestos.captura().pontos), pontos)
  const cdp = await contexto.newCDPSession(pagina),
    toque = (id, p) => ({ id, x: p.x, y: p.y, radiusX: 2, radiusY: 2, force: 1 })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [toque(1, novo)] })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [toque(1, { x: novo.x + 30, y: novo.y })],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [toque(1, novo), toque(2, { x: novo.x + 100, y: novo.y + 60 })],
  })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  assert.deepEqual(await pagina.evaluate(() => window.__gestos.captura().pontos), pontos)
  await pagina.screenshot({ path: resolve(saida, 'pontos-elevados.png') })
  assert.ok(await pagina.evaluate(() => window.__gestos.donos.includes('jogo')))
  await pagina.evaluate(() => window.__gestos.palco.definirCapturaDeCaminho(null, 'jogo'))
  await pagina.evaluate(() =>
    window.__gestos.definirCaptura({
      pontos: [
        { x: -3, y: 2, z: 2 },
        { x: 0, y: 2, z: 5 },
        { x: 3, y: 2, z: 2 },
      ],
      modo: 'adicionar',
      minimo: 3,
      maximo: 128,
      fechada: true,
      alturaFixa: 2,
    }),
  )
  const destino = await pixel({ x: 0, y: 1.95, z: -2 })
  await pagina.mouse.click(destino.x, destino.y)
  const poligono = await pagina.evaluate(() => window.__gestos.captura().pontos)
  assert.equal(poligono.length, 4)
  assert.equal(poligono[3].y, 2)
  assert.ok(Math.abs(poligono[3].z + 2) < 0.02)
  assert.ok(Math.abs(poligono[3].x) < 0.02)
  await pagina.evaluate(() => window.__gestos.palco.definirCapturaDeCaminho(null))
  await pagina.screenshot({ path: resolve(saida, 'retorno.png') })
  assert.deepEqual(erros, [])
  writeFileSync(
    resolve(saida, 'resultado.json'),
    JSON.stringify(
      {
        antes,
        movido,
        escalado,
        cabecaNova,
        cam,
        colisao,
        teste,
        direcaoInicial,
        pontos,
        poligono,
        erros,
      },
      null,
      2,
    ),
  )
  console.log(
    JSON.stringify({
      movimento: true,
      cancelamento: true,
      tamanho: true,
      undo: true,
      camera: true,
      pontosElevados: true,
      cancelamentoPorToque: true,
      colisoes: colisao.estado,
      inicioPrincipal: teste.estado.posicao,
      erros,
    }),
  )
  await pagina.evaluate(() => window.__gestos.palco.destruir())
  await contexto.close()
} finally {
  await navegador.close()
}
