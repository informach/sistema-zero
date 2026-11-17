import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright-core'

const saida = resolve(process.argv[2] ?? 'output/cenarios-reforma/lote3-espalhamento')
const raiz = resolve(import.meta.dirname, '../../../..')
const modelo = JSON.parse(
  readFileSync(resolve(raiz, 'output/molda-cenarios/acervo/catalogo.json'), 'utf8'),
).modelos.find((m) => m.arquivo === 'morada_banco.a3bf1765ed72.glb')
assert.ok(modelo, 'Banco real ausente do acervo local')
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
          ? { dir: resolve(saida, 'movimento'), size: { width: largura, height: 900 } }
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
    const { id, acervo } = await p.evaluate(async (modelo) => {
      const h = window.__cenarios.host,
        m = await h.criarMundo('conta', 'Pincel de objetos'),
        c = await h.criarCenario(m.id, 'Jardim')
      const d = (await h.abrirCenario(c.id)).documento
      d.formas = [
        { id: 'flor', nome: 'Flor', tipo: 'caixa', largura: 0.4, altura: 0.8, comprimento: 0.4 },
      ]
      d.instancias = [
        {
          id: 'fonte',
          nome: 'Flor de referência',
          modelo: 'flor',
          grupo: null,
          bloqueado: false,
          oculto: false,
          colisao: 'caixa',
          apoio: { tipo: 'absoluto' },
          transformacao: {
            posicao: { x: 0, y: 0.4, z: 0 },
            rotacao: { x: 0, y: 0.3, z: 0 },
            escala: { x: 1.5, y: 0.6, z: 1 },
          },
          espelho: { x: true, y: false, z: false },
          aparencia: { cor: '#df698c' },
        },
      ]
      d.grupos = [{ id: 'jardim', nome: 'Jardim', grupo: null, bloqueado: false, oculto: false }]
      d.camadas = [{ id: 'verde', nome: 'Verde', bloqueado: false, oculto: false }]
      await h.editarCenario(
        c.id,
        0,
        [{ tipo: 'cenario.restaurar', documento: d }],
        crypto.randomUUID(),
      )
      const biblioteca = await h.criarBiblioteca('conta', {
        nome: 'Acervo real',
        licenca: 'propria',
      })
      const foto = document.createElement('canvas')
      foto.width = foto.height = 32
      const miniatura = await new Promise((r) => foto.toBlob(r, 'image/png'))
      await h.importarModelos(biblioteca.id, [
        {
          nome: 'Banco do acervo',
          pasta: '',
          etiquetas: [],
          conteudo: new Uint8Array(await (await fetch(`/acervo/${modelo.arquivo}`)).arrayBuffer()),
          digest: modelo.digest,
          miniatura,
          min: modelo.min,
          max: modelo.max,
          triangulos: modelo.triangulos,
        },
      ])
      await h.editarMundo(m.id, { bibliotecas: [biblioteca.id] })
      const acervo = await h.criarCenario(m.id, 'Acervo')
      return { id: c.id, acervo: acervo.id }
    }, modelo)
    const espaco = p.getByRole('combobox', { name: 'De quem são', exact: true })
    await espaco.selectOption('equipe')
    await espaco.selectOption('conta')
    await p.getByRole('button', { name: 'Abrir Pincel de objetos', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Jardim', exact: true }).click()
    const salvo = () => p.getByText('Guardado', { exact: true }).waitFor()
    const ler = () => p.evaluate((id) => window.__cenarios.host.abrirCenario(id), id)
    await salvo()
    await p.getByRole('button', { name: 'Objetos e camadas', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher objeto Flor de referência', exact: true }).click()
    const fechar = p.getByRole('button', { name: 'Recolher o painel', exact: true })
    if (largura < 900 && (await fechar.count())) await fechar.click()
    await p.getByRole('button', { name: 'Espalhar', exact: true }).click()
    await p.getByRole('list', { name: 'Modelos do pincel', exact: true }).waitFor()
    assert.equal(await p.getByRole('list', { name: 'Modelos do pincel' }).locator('li').count(), 1)
    await p.getByLabel('Pasta do plantio', { exact: true }).selectOption('jardim')
    await p.getByLabel('Camada do plantio', { exact: true }).selectOption('verde')
    await p.screenshot({ path: resolve(saida, `${tema}-${largura}-painel.png`) })
    await p.getByRole('button', { name: 'Começar a pintar', exact: true }).click()
    const canvas = p.locator('canvas'),
      b = await canvas.boundingBox()
    assert.ok(b)
    const inicio = { x: b.x + b.width * 0.44, y: b.y + b.height * 0.62 }
    const fim = { x: inicio.x + Math.min(80, b.width * 0.12), y: inicio.y + 20 }
    await p.mouse.move(inicio.x, inicio.y)
    const antes = await ler()
    await p.mouse.down()
    await p
      .locator('.mcn-dica')
      .filter({ hasText: /\d+ peças/ })
      .waitFor()
    await p.mouse.move(fim.x, fim.y, { steps: 12 })
    await p.screenshot({ path: resolve(saida, `${tema}-${largura}-previa.png`) })
    assert.deepEqual(await ler(), antes, 'Prévia não grava cenário')
    await p.mouse.up()
    await p.evaluate(async (id) => {
      const limite = performance.now() + 15000
      while ((await window.__cenarios.host.abrirCenario(id)).documento.instancias.length <= 1) {
        if (performance.now() > limite) throw Error('Traço não criou objetos')
        await new Promise(requestAnimationFrame)
      }
    }, id)
    await salvo()
    const depois = await ler(),
      novas = depois.documento.instancias.slice(1)
    assert.equal(depois.revisao, antes.revisao + 1)
    assert.equal(depois.historico.desfazer, antes.historico.desfazer + 1)
    for (const o of novas) {
      assert.equal(o.grupo, 'jardim')
      assert.equal(o.camada, 'verde')
      assert.deepEqual(o.aparencia, antes.documento.instancias[0].aparencia)
      assert.deepEqual(o.espelho, antes.documento.instancias[0].espelho)
      assert.ok(Math.abs(o.transformacao.escala.x / o.transformacao.escala.z - 1.5) < 1e-8)
      assert.ok(Math.abs(o.transformacao.escala.y / o.transformacao.escala.z - 0.6) < 1e-8)
      assert.equal(o.apoio.tipo, 'terreno')
    }
    await p.screenshot({ path: resolve(saida, `${tema}-${largura}-aplicado.png`) })
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).documento, antes.documento)
    await p.getByRole('button', { name: 'Refazer', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).documento, depois.documento)
    await p.mouse.move(inicio.x, inicio.y)
    await p.mouse.down()
    await p.mouse.move(fim.x, fim.y, { steps: 6 })
    await p.keyboard.press('Escape')
    await p.mouse.up()
    assert.deepEqual((await ler()).documento, depois.documento, 'Escape descarta traço')
    await canvas.focus()
    await p.keyboard.press('e')
    if (await p.getByRole('button', { name: 'Começar a pintar', exact: true }).isVisible())
      await p.getByRole('button', { name: 'Começar a pintar', exact: true }).click()
    await p.mouse.move(inicio.x, inicio.y)
    await p.mouse.down()
    await p.mouse.move(fim.x, fim.y, { steps: 6 })
    await p.evaluate(() => window.dispatchEvent(new Event('blur')))
    await p.mouse.up()
    assert.deepEqual((await ler()).documento, depois.documento, 'Perda de foco descarta traço')
    if (largura === 390) {
      const cdp = await contexto.newCDPSession(p)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ id: 1, x: inicio.x, y: inicio.y }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ id: 1, x: fim.x, y: fim.y }],
      })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [
          { id: 1, x: fim.x, y: fim.y },
          { id: 2, x: fim.x + 30, y: fim.y + 30 },
        ],
      })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      assert.deepEqual((await ler()).documento, depois.documento, 'Segundo dedo descarta traço')
      await cdp.detach()
    }
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Jardim', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).documento, depois.documento)
    await p.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await salvo()
    assert.deepEqual((await ler()).documento, antes.documento)
    // A mesma gaveta prepara um protótipo real, sem colocar automaticamente a peça.
    await p.getByRole('button', { name: 'Voltar ao mundo', exact: true }).click()
    await p.getByRole('button', { name: 'Abrir Acervo', exact: true }).click()
    await salvo()
    await p.getByRole('button', { name: 'Espalhar', exact: true }).click()
    await p.getByRole('button', { name: 'Escolher na biblioteca', exact: true }).click()
    await p.getByRole('button', { name: 'Usar Banco do acervo no pincel', exact: true }).click()
    if (largura < 900) await p.getByRole('button', { name: 'Abrir o painel', exact: true }).click()
    await p.getByRole('list', { name: 'Modelos do pincel', exact: true }).locator('li').waitFor()
    const lerAcervo = () => p.evaluate((id) => window.__cenarios.host.abrirCenario(id), acervo)
    assert.equal((await lerAcervo()).revisao, 0)
    assert.deepEqual((await lerAcervo()).documento.modelos, [])
    await p.getByRole('button', { name: 'Começar a pintar', exact: true }).click()
    const palcoAcervo = await canvas.boundingBox()
    await p.mouse.move(
      palcoAcervo.x + palcoAcervo.width * 0.45,
      palcoAcervo.y + palcoAcervo.height * 0.6,
    )
    await p.mouse.down()
    await p
      .locator('.mcn-dica')
      .filter({ hasText: /\d+ peças/ })
      .waitFor()
    await p.mouse.up()
    await p.evaluate(async (id) => {
      const limite = performance.now() + 15000
      while ((await window.__cenarios.host.abrirCenario(id)).documento.instancias.length === 0) {
        if (performance.now() > limite) throw Error('Pincel da biblioteca não criou objetos')
        await new Promise(requestAnimationFrame)
      }
    }, acervo)
    await salvo()
    const acervoSalvo = await lerAcervo()
    assert.equal(acervoSalvo.revisao, 1)
    assert.equal(acervoSalvo.documento.modelos.length, 1)
    assert.equal(acervoSalvo.documento.modelos[0].digest, modelo.digest)
    await p.screenshot({ path: resolve(saida, `${tema}-${largura}-biblioteca.png`) })
    assert.deepEqual(erros, [])
    resultados.push({
      tema,
      largura,
      quantidade: novas.length,
      revisao: depois.revisao,
      previaSemGravar: true,
      cancelamento: true,
      retomada: true,
      erros,
    })
    await contexto.close()
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultados, null, 2))
  console.log(JSON.stringify(resultados, null, 2))
} catch (e) {
  if (pagina && !pagina.isClosed()) {
    await pagina.screenshot({ path: resolve(saida, 'falha.png') })
    writeFileSync(
      resolve(saida, 'falha.txt'),
      (await pagina.locator('body').innerText()).slice(0, 18000),
    )
  }
  throw e
} finally {
  await browser.close()
}
