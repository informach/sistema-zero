import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '../../../..'),
  { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
    'playwright-core',
  ),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/avancado'),
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
      playId = '11111111-1111-4111-8111-111111111114',
      contexto = await browser.newContext({
        viewport: { width: 960, height: 600 },
        recordVideo: { dir: resolve(pasta, 'videos'), size: { width: 960, height: 600 } },
        ...(modo === 'export' ? { serviceWorkers: 'block' } : {}),
      }),
      pagina = await contexto.newPage(),
      erros = [],
      consoleErros = [],
      avisos = [],
      rede = []
    let frame
    const parcial = {}
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('console', (m) => {
      if (m.type() === 'error') consoleErros.push(m.text())
      if (m.type() === 'warning') avisos.push(m.text())
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
    await pagina.route('http://127.0.0.1:5413/avancado-qa', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><body style="margin:0"></body></html>',
      }),
    )
    await pagina.route('http://127.0.0.1:5413/avancado-export/**', (route) => {
      const path = new URL(route.request().url()).pathname.slice('/avancado-export/'.length)
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
        await pagina.goto('http://127.0.0.1:5413/avancado-export/index.html')
        frame = pagina
      } else if (modo === 'jogar') {
        await pagina.goto(`http://127.0.0.1:5413/jogar/${playId}`)
        await pagina.locator('iframe[aria-busy="false"]').waitFor({ timeout: 120000 })
        frame = await (await pagina.locator('iframe').elementHandle()).contentFrame()
      } else {
        await pagina.goto('http://127.0.0.1:5413/avancado-qa')
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
      await frame.locator('[data-szg3k-screen="menu"] button').first().click({ timeout: 60000 })
      console.log(`${etiqueta}: menu iniciado.`)
      await frame.waitForFunction(() => window.__qaAvancado?.pronto(), undefined, {
        timeout: 60000,
      })
      console.log(`${etiqueta}: personagem e câmera prontos.`)
      const ciclos = []
      for (let ciclo = 0; ciclo < 3; ciclo++) {
        const anterior = await frame.evaluate(() => window.__qaAvancado.estado())
        if (ciclo) assert.equal(await frame.evaluate(() => window.__qaAvancado.trocar()), true)
        await frame.waitForFunction(
          ({ q, g }) => {
            const s = window.__qaAvancado.estado()
            return s.quadros > q + 8 && s.geracao === g
          },
          { q: anterior.quadros, g: ciclo + 1 },
        )
        const s = await frame.evaluate(() => window.__qaAvancado.estado())
        assert.equal(s.proprio, true)
        assert.equal(s.cenas.length, ciclo + 1)
        assert.ok(s.grounded, 'A troca deve preservar o apoio físico')
        for (const c of s.cenas.slice(0, -1))
          assert.deepEqual(c, { arvores: 0, pai: false, ativa: false })
        assert.ok(s.cenas.at(-1).ativa)
        if (ciclo) assert.deepEqual(s.recursos, ciclos[0].recursos)
        if (nome === 'completo') {
          assert.equal(s.modelo, true)
          assert.ok(
            Math.abs(s.corpo.maxY - s.corpo.minY - 1.16) < 1e-6,
            'Avatar mantém altura nativa de 1,16 m, sem ser estreitado pelo envelope do molde',
          )
          assert.ok(s.clipes.length > 0)
          assert.ok(s.clipes.every((c) => c.tempo > 0))
        }
        ciclos.push(s)
      }
      const pausa = await frame.evaluate(() => {
        window.SZGameKit3D.setState('pausado')
        return window.__qaAvancado.estado()
      })
      await frame.waitForFunction(
        (f) => window.__qaAvancado.estado().desenhos > f + 8,
        pausa.desenhos,
      )
      const pausado = await frame.evaluate(() => window.__qaAvancado.estado())
      assert.equal(pausado.quadros, pausa.quadros)
      assert.equal(pausado.tempo, pausa.tempo)
      assert.deepEqual(pausado.clipes, pausa.clipes)
      await frame.locator('[data-szg3k-screen="pausa"] button').first().click()
      await frame.waitForFunction(
        (q) => window.__qaAvancado.estado().quadros > q + 5,
        pausa.quadros,
      )
      let comparadas = 0
      if (nome === 'completo') {
        const alturas = await frame.evaluate(
          (p) => window.__qaAvancado.alturas(p),
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
      const inicio = await frame.evaluate(() => window.__qaAvancado.estado()),
        tecla = nome === 'completo' ? 'w' : 's',
        sinal = nome === 'completo' ? -1 : 1
      parcial.inicio = inicio
      await pagina.keyboard.down(tecla)
      await frame.waitForFunction(
        ({ z, sinal }) => (window.__qaAvancado.estado().z - z) * sinal > 2,
        { z: inicio.z, sinal },
        { timeout: 20000 },
      )
      await pagina.keyboard.up(tecla)
      const movimentos = { caminhada: await frame.evaluate(() => window.__qaAvancado.estado()) }
      parcial.movimentos = movimentos
      assert.ok(movimentos.caminhada.y >= -0.001)
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-caminhada.png`) })
      if (nome === 'completo') {
        await pagina.keyboard.down('Shift')
        await pagina.keyboard.down('w')
        await frame.waitForFunction(
          (z) => z - window.__qaAvancado.estado().z > 0.8,
          movimentos.caminhada.z,
        )
        await pagina.keyboard.up('w')
        await pagina.keyboard.up('Shift')
        movimentos.corrida = await frame.evaluate(() => window.__qaAvancado.estado())
        assert.ok(movimentos.corrida.y > 0)
        await frame.waitForFunction(() => window.__qaAvancado.estado().grounded)
        const salto = await frame.evaluate(() => window.__qaAvancado.estado())
        parcial.salto = salto
        await pagina.keyboard.down('Space')
        await frame.waitForFunction((y) => window.__qaAvancado.estado().y > y + 0.25, salto.y)
        movimentos.alto = await frame.evaluate(() => window.__qaAvancado.estado())
        await pagina.keyboard.up('Space')
        await frame.waitForFunction(
          ({ q, y }) => {
            const s = window.__qaAvancado.estado()
            return s.quadros > q + 10 && s.grounded && Math.abs(s.y - y) < 0.03
          },
          { q: movimentos.alto.quadros, y: salto.y },
        )
        movimentos.pouso = await frame.evaluate(() => window.__qaAvancado.estado())
        await pagina.keyboard.down('d')
        await frame.waitForFunction(
          (t) => window.__qaAvancado.estado().tempo > t + 0.15,
          movimentos.pouso.tempo,
        )
        await pagina.keyboard.up('d')
        movimentos.curva = await frame.evaluate(() => window.__qaAvancado.estado())
        assert.ok(movimentos.curva.x > movimentos.pouso.x + 0.04)
        assert.ok(movimentos.curva.y > 0)
        assert.deepEqual(
          new Set(movimentos.curva.estadosTocados),
          new Set(['parado_relaxado', 'andar_frente', 'correr_frente', 'pulo_no_ar']),
        )
      } else {
        await pagina.keyboard.down('s')
        await frame.waitForFunction(() => window.__qaAvancado.estado().y < 0)
        movimentos.inicioQueda = await frame.evaluate(() => window.__qaAvancado.estado())
        assert.ok(movimentos.inicioQueda.y > -10)
        await pagina.keyboard.up('s')
        await frame.waitForFunction(() => window.__qaAvancado.estado().y < -10)
        movimentos.queda = await frame.evaluate(() => window.__qaAvancado.estado())
        assert.ok(movimentos.queda.vy < 0)
      }
      const antesRecomeco = await frame.evaluate(() => {
        const s = window.__qaAvancado.estado()
        window.__qaBasesAnteriores = window.__qaAvancado
        window.SZGameKit3D.endGame('perdeu')
        return s
      })
      await frame.locator('[data-szg3k-screen="fim"] button').first().click()
      console.log(`${etiqueta}: recomeço solicitado.`)
      await frame.waitForFunction(
        (p) => window.__qaAvancado?.pronto() && window.__qaAvancado.estado().partida === p + 1,
        antesRecomeco.partida,
        { timeout: 60000 },
      )
      const recomeco = await frame.evaluate(() => ({
        atual: window.__qaAvancado.estado(),
        anteriores: window.__qaBasesAnteriores.estado().cenas,
      }))
      assert.equal(recomeco.atual.geracao, 1)
      assert.ok(recomeco.atual.grounded)
      assert.deepEqual(recomeco.atual.recursos, ciclos[0].recursos)
      for (const c of recomeco.anteriores)
        assert.deepEqual(c, { arvores: 0, pai: false, ativa: false })
      const final = await frame.evaluate(() => {
        // Preserve this engine's existing policy: even persisted pagehide ends it.
        window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }))
        return window.__qaRenderers.map((r) => ({
          recursos: { ...r.info.memory },
          contextoPerdido: r.getContext().isContextLost(),
        }))
      })
      assert.equal(final.length, 1)
      assert.deepEqual(final.at(-1).recursos, { geometries: 0, textures: 0 })
      // The managed restart reuses the HTML canvas renderer and its CPU model cache.
      // All scene resources and that one GL context are released at definitive teardown.
      for (const r of final) assert.equal(r.contextoPerdido, true)
      assert.deepEqual(erros, [])
      assert.deepEqual(consoleErros, [])
      assert.deepEqual(
        avisos.filter(
          (m) =>
            m !==
              'THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead.' &&
            !(modo === 'export' && m === 'Service Worker registration blocked by Playwright'),
        ),
        [],
      )
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
      recibos.push({
        nome,
        modo,
        ciclos,
        comparadas,
        movimentos,
        pausa: { antes: pausa, depois: pausado },
        recomeco,
        final,
        erros,
        consoleErros,
        avisos,
        rede,
        persistido: 'encerra-conforme-contrato-do-avancado',
      })
      console.log(
        `Avançado ${etiqueta}: três trocas estáveis, movimento, pausa, recomeço e descarte zerado.`,
      )
    } catch (error) {
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-falha.png`) })
      const estado = frame ? await frame.evaluate(() => window.__qaAvancado?.estado()) : null,
        mensagens = await pagina.evaluate(() => window.__mensagens ?? [])
      writeFileSync(
        resolve(pasta, `${etiqueta}-falha.json`),
        JSON.stringify(
          { erro: String(error), erros, consoleErros, avisos, rede, estado, mensagens, parcial },
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
    `${JSON.stringify({ recibos, nota: 'Avançado real via Blockly/IR, partida gerenciada e avatar do catálogo. Posição do início compilado registrada; percurso medido começa num trecho parcial conhecido da ponte, sem simular travessia por teletransporte. Evento pagehide persistido sintético verifica contrato; não é navegação real de bfcache. API de publicação local controlada; staging/conta real e dispositivos físicos não foram validados. Não aprova IK/direção de arte.' }, null, 2)}\n`,
  )
} finally {
  await browser.close()
}
