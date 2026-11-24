import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '../../../..'),
  { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
    'playwright-core',
  ),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/canvas'),
  nativo = JSON.parse(
    readFileSync(resolve(raiz, 'output/cenarios-reforma/lote8-raylib/mapa-native.json'), 'utf8'),
  ),
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  recibos = []
mkdirSync(resolve(pasta, 'videos'), { recursive: true })
try {
  for (const [nome, modo] of [
    ['completo', 'preview'],
    ['buraco', 'preview'],
    ['completo', 'export'],
    ['completo', 'jogar'],
  ]) {
    const etiqueta = `${nome}-${modo}`,
      playId = '11111111-1111-4111-8111-111111111113',
      contexto = await browser.newContext({
        viewport: { width: 960, height: 600 },
        recordVideo: { dir: resolve(pasta, 'videos'), size: { width: 960, height: 600 } },
        ...(modo === 'export' ? { serviceWorkers: 'block' } : {}),
      }),
      pagina = await contexto.newPage(),
      erros = [],
      consoleErros = [],
      rede = []
    let frame
    const parcial = {}
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('console', (m) => {
      if (m.type() === 'error') consoleErros.push(m.text())
    })
    pagina.on('request', (r) => {
      if (['fetch', 'xhr'].includes(r.resourceType())) rede.push(r.url())
    })
    await pagina.route('https://esm.sh/**', (route) => {
      const path = new URL(route.request().url()).pathname,
        vendor =
          path === '/three@0.184.0'
            ? 'three'
            : path.endsWith('/GLTFLoader.js')
              ? 'GLTFLoader'
              : path.endsWith('/HDRLoader.js')
                ? 'HDRLoader'
                : path.endsWith('/SkeletonUtils.js')
                  ? 'SkeletonUtils'
                  : null
      assert.ok(vendor, `Import inesperado: ${path}`)
      return route.fulfill({
        contentType: 'text/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: readFileSync(resolve(pasta, `${vendor}.js`)),
      })
    })
    await pagina.route('http://127.0.0.1:5413/canvas-qa', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><body style="margin:0"></body></html>',
      }),
    )
    await pagina.route('http://127.0.0.1:5413/canvas-export/**', (route) => {
      const path = new URL(route.request().url()).pathname.slice('/canvas-export/'.length)
      assert.ok(!path.includes('..'))
      return route.fulfill({ path: resolve(pasta, 'export/public', path || 'index.html') })
    })
    await pagina.route(`http://127.0.0.1:5413/api/studio/play/${playId}*`, (route) =>
      route.fulfill({
        contentType: 'application/json',
        headers: { 'X-Author-Name': 'Equipe' },
        body: readFileSync(resolve(pasta, 'completo.project.json')),
      }),
    )
    try {
      if (modo === 'export') {
        await pagina.goto('http://127.0.0.1:5413/canvas-export/index.html')
        frame = pagina
      } else if (modo === 'jogar') {
        await pagina.goto(`http://127.0.0.1:5413/jogar/${playId}`)
        await pagina.locator('iframe[aria-busy="false"]').waitFor({ timeout: 120000 })
        frame = await (await pagina.locator('iframe').elementHandle()).contentFrame()
      } else {
        await pagina.goto('http://127.0.0.1:5413/canvas-qa')
        await pagina.evaluate(
          (doc) => {
            window.__mensagens = []
            window.addEventListener('message', (e) => {
              window.__mensagens.push({
                type: e.data?.type,
                kind: e.data?.kind,
                text: e.data?.text,
              })
              if (window.__mensagens.length > 50) window.__mensagens.shift()
            })
            const iframe = document.createElement('iframe')
            iframe.setAttribute('sandbox', 'allow-scripts')
            iframe.width = '960'
            iframe.height = '600'
            iframe.style.border = '0'
            iframe.srcdoc = doc
            document.body.append(iframe)
          },
          readFileSync(resolve(pasta, `${nome}.html`), 'utf8'),
        )
        frame = await (await pagina.locator('iframe').elementHandle()).contentFrame()
      }
      assert.ok(frame)
      await frame.waitForFunction(() => window.__qaCanvas?.pronto(), undefined, { timeout: 60000 })
      const ciclos = []
      for (let ciclo = 0; ciclo < 3; ciclo++) {
        const anterior = await frame.evaluate(() => window.__qaCanvas.estado())
        if (ciclo) await frame.evaluate(() => window.__qaCanvas.trocar())
        await frame.waitForFunction(
          ({ g, q }) => {
            const s = window.__qaCanvas.estado()
            return s.geracao === g && s.quadros > q + 8
          },
          { g: ciclo + 1, q: anterior.quadros },
        )
        const s = await frame.evaluate(() => window.__qaCanvas.estado())
        assert.equal(s.falha, null)
        assert.equal(s.proprio, true)
        assert.equal(s.fisica.bodies, 1)
        assert.equal(s.fisica.statics, 1)
        assert.ok(s.grounded, 'O corpo precisa manter apoio físico durante a troca')
        assert.equal(s.cenas.length, ciclo + 1)
        for (const c of s.cenas.slice(0, -1))
          assert.deepEqual(c, { arvores: 0, pai: false, ativa: false })
        assert.ok(s.cenas.at(-1).arvores > 0)
        assert.ok(s.cenas.at(-1).pai)
        if (nome === 'completo') {
          assert.ok(s.clipes.length > 0, 'O cenário precisa conservar seu ator animável')
          assert.ok(
            s.clipes.every((c) => c.tempo > 0),
            'O loop autoral precisa avançar os clipes reais',
          )
        }
        if (ciclo) assert.deepEqual(s.recursos, ciclos[0].recursos)
        if (ciclo)
          assert.ok(
            Math.hypot(s.x - ciclos[0].x, s.z - ciclos[0].z) < 0.01,
            'O personagem parado não deve deslizar na ponte entre trocas',
          )
        ciclos.push(s)
      }
      let comparadas = 0
      if (nome === 'completo') {
        const alturas = await frame.evaluate(
          (p) => window.__qaCanvas.alturas(p),
          nativo.alturas.map(({ x, z }) => ({ x, z })),
        )
        for (const [i, h] of alturas.entries()) {
          const esperado = nativo.alturas[i]
          assert.equal(h.chao, esperado.chao)
          if (h.chao) assert.ok(Math.abs(h.altura - esperado.altura) < 1e-6)
        }
        comparadas = alturas.length
      }
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-inicio.png`) })
      await frame
        .locator('canvas')
        .first()
        .click({ position: { x: 450, y: 280 } })
      let obstaculo = null
      if (nome === 'completo') {
        const antes = await frame.evaluate(() => window.__qaCanvas.estado())
        await pagina.keyboard.down('w')
        await frame.waitForFunction(() => window.__qaCanvas.estado().z > 8.65)
        const junto = await frame.evaluate(() => window.__qaCanvas.estado().tempo)
        await frame.waitForFunction((t) => window.__qaCanvas.estado().tempo > t + 1.4, junto)
        await pagina.keyboard.up('w')
        obstaculo = await frame.evaluate(() => window.__qaCanvas.estado())
        assert.ok(
          obstaculo.z > antes.z + 0.2,
          'O controle precisa se aproximar do bloco sobre a ponte',
        )
        assert.ok(obstaculo.z <= 8.7501, 'O bloco físico em z=9 deve impedir atravessamento')
        assert.ok(obstaculo.grounded)
      }
      // The complete scene has a solid crate ahead. Validate it, then walk back
      // along the unblocked bridge. The hole fixture keeps its forward route.
      const inicio = await frame.evaluate(() => window.__qaCanvas.estado()),
        tecla = nome === 'completo' ? 's' : 'w',
        sinal = nome === 'completo' ? -1 : 1
      parcial.inicio = inicio
      await pagina.keyboard.down(tecla)
      await frame.waitForFunction(
        ({ z, sinal }) => (window.__qaCanvas.estado().z - z) * sinal > 2,
        { z: inicio.z, sinal },
        { timeout: 20000 },
      )
      await pagina.keyboard.up(tecla)
      const movimentos = {
        caminhada: await frame.evaluate(() => window.__qaCanvas.estado()),
        obstaculo,
      }
      parcial.movimentos = movimentos
      assert.ok(movimentos.caminhada.y > 0, 'A caminhada inicial precisa ter apoio')
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-caminhada.png`) })
      if (nome === 'completo') {
        await pagina.keyboard.down('Shift')
        await pagina.keyboard.down(tecla)
        await frame.waitForFunction(
          (z) => z - window.__qaCanvas.estado().z > 0.8,
          movimentos.caminhada.z,
        )
        await pagina.keyboard.up(tecla)
        await pagina.keyboard.up('Shift')
        movimentos.corrida = await frame.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.corrida.y > 0)
        await frame.waitForFunction(() => window.__qaCanvas.estado().grounded)
        const salto = await frame.evaluate(() => window.__qaCanvas.estado())
        parcial.salto = salto
        await pagina.keyboard.down('Space')
        await frame.waitForFunction((y) => window.__qaCanvas.estado().y > y + 0.25, salto.y)
        movimentos.alto = await frame.evaluate(() => window.__qaCanvas.estado())
        await pagina.keyboard.up('Space')
        await frame.waitForFunction(
          ({ q, y }) => {
            const s = window.__qaCanvas.estado()
            return s.quadros > q + 10 && s.grounded && Math.abs(s.y - y) < 0.03
          },
          { q: movimentos.alto.quadros, y: salto.y },
        )
        movimentos.pouso = await frame.evaluate(() => window.__qaCanvas.estado())
        await pagina.keyboard.down('d')
        await frame.waitForFunction(
          (t) => window.__qaCanvas.estado().tempo > t + 0.15,
          movimentos.pouso.tempo,
        )
        await pagina.keyboard.up('d')
        movimentos.curva = await frame.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.curva.x > movimentos.pouso.x + 0.04)
        assert.ok(movimentos.curva.y > 0)
      } else {
        await pagina.keyboard.down('w')
        await frame.waitForFunction(() => window.__qaCanvas.estado().y < 0)
        movimentos.inicioQueda = await frame.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.inicioQueda.y > -10)
        await pagina.keyboard.up('w')
        await frame.waitForFunction(() => window.__qaCanvas.estado().y < -10)
        movimentos.queda = await frame.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.queda.vy < 0)
      }
      const final = await frame.evaluate(() => window.__qaCanvas.descartar())
      assert.deepEqual(final, { geometries: 0, textures: 0 })
      assert.deepEqual(erros, [])
      assert.deepEqual(consoleErros, [])
      assert.deepEqual(
        rede.filter(
          (url) =>
            modo !== 'jogar' || !url.startsWith(`http://127.0.0.1:5413/api/studio/play/${playId}?`),
        ),
        [],
      )
      const video = pagina.video()
      await contexto.close()
      await video.saveAs(resolve(pasta, `${etiqueta}.webm`))
      recibos.push({ nome, modo, ciclos, comparadas, movimentos, final, erros, consoleErros, rede })
      console.log(
        `Canvas ${etiqueta}: três ciclos estáveis, física e movimento reais, descarte zerado.`,
      )
    } catch (error) {
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-falha.png`) })
      const estado = frame ? await frame.evaluate(() => window.__qaCanvas?.estado()) : null,
        mensagens = await pagina.evaluate(() => window.__mensagens ?? [])
      writeFileSync(
        resolve(pasta, `${etiqueta}-falha.json`),
        JSON.stringify(
          { erro: String(error), erros, consoleErros, rede, estado, mensagens, parcial },
          null,
          2,
        ),
      )
      throw error
    } finally {
      await contexto.close()
    }
  }
  writeFileSync(
    resolve(pasta, 'recibo.json'),
    `${JSON.stringify(
      {
        recibos,
        nota: 'Canvas via Blockly/IR e reabertura canônica. Renderer, câmera e RAF do programa preservados. PublicPlayer local usa API controlada; staging/conta real só no fechamento global. WebGL real, contadores sem reset artificial. Não comprova dispositivos físicos, IK ou aprovação artística.',
      },
      null,
      2,
    )}\n`,
  )
} finally {
  await browser.close()
}
