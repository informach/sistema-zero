import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-selecao-area')
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
    const contexto = await navegador.newContext({
      viewport: { width: largura, height: 900 },
      hasTouch: largura === 390,
      ...(largura === 1440 && tema === 'light'
        ? { recordVideo: { dir: resolve(saida, 'movimento'), size: { width: 1280, height: 800 } } }
        : {}),
    })
    const p = await contexto.newPage()
    paginaAtual = p
    const erros = []
    p.on('pageerror', (e) => erros.push(e.message))
    p.on('console', (m) => {
      if (m.type() === 'error') erros.push(m.text())
    })
    await p.goto(`http://127.0.0.1:4541/?vazio=1&tema=${tema}`)
    await p.waitForFunction(() => window.__cenarios)
    const id = await p.evaluate(async () => {
      const host = window.__cenarios.host,
        mundo = await host.criarMundo('conta', 'Seleção por área')
      const c = await host.criarCenario(mundo.id, 'Retângulo e laço')
      const documento = (await host.abrirCenario(c.id)).documento
      documento.formas = [
        { id: 'f', nome: 'Caixa', tipo: 'caixa', largura: 1.2, altura: 1.2, comprimento: 1.2 },
      ]
      documento.camadas = [
        { id: 'fechada', nome: 'Trancados', bloqueado: true, oculto: false },
        { id: 'oculta', nome: 'Ocultos', bloqueado: false, oculto: true },
      ]
      documento.instancias = [
        ['A', -4, 0, null],
        ['B', 4, 0, null],
        ['C', 0, 4, 'oculta'],
        ['D', 0, -4, 'fechada'],
      ].map(([id, x, z, camada]) => ({
        id,
        nome: id,
        modelo: 'f',
        camada,
        grupo: null,
        bloqueado: false,
        oculto: false,
        colisao: 'caixa',
        apoio: { tipo: 'absoluto' },
        transformacao: {
          posicao: { x, y: 0, z },
          rotacao: { x: 0, y: 0, z: 0 },
          escala: { x: 1, y: 1, z: 1 },
        },
      }))
      await host.editarCenario(
        c.id,
        0,
        [{ tipo: 'cenario.restaurar', documento }],
        crypto.randomUUID(),
      )
      return c.id
    })
    const ler = () => p.evaluate(async (id) => window.__cenarios.host.abrirCenario(id), id)
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Seleção por área', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Retângulo e laço', exact: true }).click()
    const original = await ler()
    const fecharPainel = async () => {
      const botao = p.getByRole('button', { name: 'Recolher o painel', exact: true })
      if (await botao.count()) await botao.click()
    }
    await fecharPainel()
    await p.getByRole('button', { name: 'De cima', exact: true }).click()
    await p.keyboard.press('f')
    const conferir = async (esperados) => {
      await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
      const ids = []
      for (const id of ['A', 'B', 'C', 'D']) {
        const linha = p.getByRole('button', { name: `Escolher objeto ${id}`, exact: true })
        if ((await linha.getAttribute('aria-pressed')) === 'true') ids.push(id)
      }
      assert.deepEqual(ids, esperados)
      await fecharPainel()
      assert.equal((await ler()).revisao, original.revisao)
      assert.deepEqual((await ler()).documento, original.documento)
    }
    const tela = () => p.locator('canvas.mcn-palco-tela').boundingBox()
    const arrastar = async (pontos, { shift = false, cancelar = false, toque = false } = {}) => {
      const caixa = await tela()
      const pontosTela = pontos.map(([x, y]) => ({
        x: caixa.x + x * caixa.width,
        y: caixa.y + y * caixa.height,
      }))
      if (toque) {
        const cdp = await contexto.newCDPSession(p)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ ...pontosTela[0], id: 1 }],
        })
        for (const ponto of pontosTela.slice(1))
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [{ ...ponto, id: 1 }],
          })
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
        await cdp.detach()
      } else {
        if (shift) await p.keyboard.down('Shift')
        await p.mouse.move(pontosTela[0].x, pontosTela[0].y)
        await p.mouse.down()
        for (const ponto of pontosTela.slice(1)) await p.mouse.move(ponto.x, ponto.y, { steps: 12 })
        if (cancelar) await p.keyboard.press('Escape')
        else {
          assert.ok(
            (await p.locator('.mcn-selecao-area polygon').getAttribute('points')).length > 0,
          )
          await p.screenshot({
            path: resolve(
              saida,
              `${pontos.length > 2 ? 'laco' : 'retangulo'}-${tema}-${largura}.png`,
            ),
          })
        }
        await p.mouse.up()
        if (shift) await p.keyboard.up('Shift')
      }
      assert.equal(await p.locator('.mcn-selecao-area polygon').getAttribute('points'), '')
    }
    await p.getByRole('button', { name: 'Retângulo', exact: true }).click()
    await arrastar(
      [
        [0.08, 0.3],
        [0.49, 0.88],
      ],
      { toque: largura === 390 },
    )
    await conferir(['A'])
    if (largura === 390)
      await p.getByRole('button', { name: 'Somar à escolha', exact: true }).click()
    await arrastar(
      [
        [0.51, 0.3],
        [0.92, 0.88],
      ],
      { shift: largura !== 390, toque: largura === 390 },
    )
    await conferir(['A', 'B'])
    if (largura === 390)
      await p.getByRole('button', { name: 'Somar à escolha', exact: true }).click()
    await p.keyboard.press('Escape')
    await p.getByRole('button', { name: 'Laço', exact: true }).click()
    await arrastar(
      [
        [0.08, 0.4],
        [0.45, 0.3],
        [0.88, 0.4],
        [0.94, 0.8],
        [0.6, 0.88],
        [0.08, 0.75],
        [0.08, 0.4],
      ],
      { toque: largura === 390 },
    )
    await conferir(['A', 'B'])
    await p.keyboard.press('Escape')
    await p.getByRole('button', { name: 'Retângulo', exact: true }).click()
    await arrastar(
      [
        [0.08, 0.3],
        [0.92, 0.88],
      ],
      { cancelar: true },
    )
    await conferir([])
    if (largura === 390) {
      await p.getByRole('button', { name: 'Retângulo', exact: true }).click()
      const cdp = await contexto.newCDPSession(p),
        caixa = await tela()
      const primeiro = { x: caixa.x + caixa.width * 0.1, y: caixa.y + caixa.height * 0.35, id: 1 }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [primeiro] })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ ...primeiro, x: primeiro.x + 20 }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          primeiro,
          { x: caixa.x + caixa.width * 0.8, y: caixa.y + caixa.height * 0.65, id: 2 },
        ],
      })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await cdp.detach()
      assert.equal(await p.locator('.mcn-selecao-area polygon').getAttribute('points'), '')
      await conferir([])
    }
    await p.getByRole('button', { name: 'Retângulo', exact: true }).click()
    await arrastar(
      [
        [0.08, 0.3],
        [0.92, 0.88],
      ],
      { toque: largura === 390 },
    )
    await conferir(['A', 'B'])
    await p.screenshot({ path: resolve(saida, `selecao-${tema}-${largura}.png`) })
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      retangulo: true,
      laco: true,
      soma: true,
      ocultosIgnorados: true,
      trancadosIgnorados: true,
      cancelamento: true,
      semRevisaoAutoral: true,
      toqueEmulado: largura === 390,
      cancelamentoPorSegundoToque: largura === 390,
      erros,
    })
    await contexto.close()
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
