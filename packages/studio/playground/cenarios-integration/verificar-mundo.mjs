import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '../../../..'),
  { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
    'playwright-core',
  ),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/mundo'),
  nativo = JSON.parse(
    readFileSync(resolve(raiz, 'output/cenarios-reforma/lote8-raylib/mapa-native.json'), 'utf8'),
  ),
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  recibos = []
mkdirSync(resolve(pasta, 'videos'), { recursive: true })
try {
  for (const { nome, modo } of [
    { nome: 'completo', modo: 'preview' },
    { nome: 'buraco', modo: 'preview' },
    { nome: 'completo', modo: 'export' },
    { nome: 'completo', modo: 'jogar' },
  ]) {
    const etiqueta = `${nome}-${modo}`,
      playId = '11111111-1111-4111-8111-111111111112'
    const contexto = await browser.newContext({
        viewport: { width: 960, height: 600 },
        recordVideo: { dir: resolve(pasta, 'videos'), size: { width: 960, height: 600 } },
        ...(modo === 'export' ? { serviceWorkers: 'block' } : {}),
      }),
      pagina = await contexto.newPage(),
      erros = [],
      rede = [],
      consoleErros = []
    pagina.on('pageerror', (e) => erros.push(e.message))
    pagina.on('console', (m) => {
      if (m.type() === 'error') consoleErros.push(m.text())
    })
    pagina.on('request', (r) => {
      if (['fetch', 'xhr'].includes(r.resourceType())) rede.push(r.url())
    })
    await pagina.route('https://esm.sh/**', (route) => {
      const p = new URL(route.request().url()).pathname,
        nome = p.endsWith('/GLTFLoader.js')
          ? 'GLTFLoader'
          : p.endsWith('/HDRLoader.js')
            ? 'HDRLoader'
            : p.endsWith('/SkeletonUtils.js')
              ? 'SkeletonUtils'
              : p === '/three@0.184.0'
                ? 'three'
                : null
      if (!nome) throw Error(`Import não previsto: ${p}`)
      return route.fulfill({
        contentType: 'text/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: readFileSync(resolve(pasta, `${nome}.js`)),
      })
    })
    await pagina.route('http://127.0.0.1:5413/mundo-qa', (r) =>
      r.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><html><body style="margin:0"></body></html>',
      }),
    )
    await pagina.route('http://127.0.0.1:5413/mundo-export/**', (route) => {
      const path = new URL(route.request().url()).pathname.slice('/mundo-export/'.length)
      if (path.includes('..')) throw Error('Caminho inválido no export')
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
      let frame
      if (modo === 'export') {
        await pagina.goto('http://127.0.0.1:5413/mundo-export/index.html')
        frame = pagina
      } else if (modo === 'jogar') {
        await pagina.goto(`http://127.0.0.1:5413/jogar/${playId}`)
        await pagina.locator('iframe[aria-busy="false"]').waitFor({ timeout: 120000 })
        frame = await (await pagina.locator('iframe').elementHandle()).contentFrame()
      } else {
        await pagina.goto('http://127.0.0.1:5413/mundo-qa')
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
            iframe.name = 'mundo'
            iframe.setAttribute('sandbox', 'allow-scripts')
            iframe.width = '960'
            iframe.height = '600'
            iframe.style.border = '0'
            iframe.srcdoc = doc
            document.body.append(iframe)
          },
          readFileSync(resolve(pasta, `${nome}.html`), 'utf8'),
        )
        // The existing storage bridge owns window.name; resolve the actual iframe element.
        const elemento = await pagina.locator('iframe').elementHandle()
        frame = await elemento.contentFrame()
      }
      assert.ok(frame)
      await frame.getByRole('button', { name: 'Começar o passeio', exact: true }).click()
      await frame.waitForFunction(() => window.__qaWorld?.pronto(), undefined, { timeout: 60000 })
      const ciclos = []
      for (let ciclo = 0; ciclo < 3; ciclo++) {
        const antes = await frame.evaluate(() => window.__qaWorld.estado().quadros)
        if (ciclo) assert.equal(await frame.evaluate(() => window.__qaWorld.trocar()), true)
        await frame.waitForFunction((q) => window.__qaWorld.estado().quadros > q + 8, antes)
        const estado = await frame.evaluate(() => window.__qaWorld.estado())
        ciclos.push(estado)
        if (nome === 'completo') {
          assert.ok(
            estado.y > -0.05,
            `O personagem perdeu o apoio inicial: ${JSON.stringify(estado)}`,
          )
        }
        assert.equal(estado.cenas.length, ciclo + 1)
        for (const c of estado.cenas.slice(0, -1)) {
          assert.equal(c.arvores, 0)
          assert.equal(c.filhos, 0)
          assert.equal(c.pai, false)
        }
        assert.equal(estado.cenas.at(-1).pai, true)
        if (ciclo) assert.deepEqual(estado.recursos, ciclos[0].recursos)
      }
      if (nome === 'completo') {
        const alturas = await frame.evaluate(
          (p) => window.__qaWorld.alturas(p),
          nativo.alturas.map(({ x, z }) => ({ x, z })),
        )
        for (const [i, h] of alturas.entries()) {
          const esperado = nativo.alturas[i]
          assert.equal(h.chao, esperado.chao)
          if (h.chao) {
            assert.ok(Math.abs(h.altura - esperado.altura) < 1e-6)
            assert.ok(Math.abs(h.mundo - esperado.altura) < 1e-6)
          }
        }
        writeFileSync(resolve(pasta, 'alturas.json'), JSON.stringify(alturas, null, 2))
      }
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-inicio.png`) })
      const inicio = await frame.evaluate(() => window.__qaWorld.estado())
      await frame
        .locator('canvas')
        .first()
        .click({ position: { x: 450, y: 280 } })
      await pagina.keyboard.down('w')
      await frame.waitForFunction((z) => window.__qaWorld.estado().z > z + 2, inicio.z, {
        timeout: 20000,
      })
      await pagina.keyboard.up('w')
      const depois = await frame.evaluate(() => window.__qaWorld.estado())
      if (nome === 'completo')
        assert.ok(
          depois.y > -0.05,
          'A caminhada precisa acontecer sobre a ponte, sem queda pelo tabuleiro.',
        )
      assert.ok(depois.z > inicio.z + 2)
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-andando.png`) })
      const movimentos = { caminhada: depois }
      if (nome === 'completo') {
        await pagina.keyboard.down('Shift')
        await pagina.keyboard.down('w')
        await frame.waitForFunction((z) => window.__qaWorld.estado().z > z + 0.8, depois.z)
        await pagina.keyboard.up('w')
        await pagina.keyboard.up('Shift')
        movimentos.corrida = await frame.evaluate(() => window.__qaWorld.estado())
        assert.ok(movimentos.corrida.y > -0.05, 'A corrida deve preservar o apoio real da ponte.')
        const salto = movimentos.corrida
        await pagina.keyboard.down('Space')
        await frame.waitForFunction((y) => window.__qaWorld.estado().y > y + 0.25, salto.y)
        movimentos.alto = await frame.evaluate(() => window.__qaWorld.estado())
        await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-salto.png`) })
        await pagina.keyboard.up('Space')
        await frame.waitForFunction(
          ({ quadro, piso }) => {
            const s = window.__qaWorld.estado()
            return s.quadros > quadro + 10 && Math.abs(s.y - piso) < 0.02
          },
          { quadro: movimentos.alto.quadros, piso: salto.y },
        )
        movimentos.pouso = await frame.evaluate(() => window.__qaWorld.estado())
        await pagina.keyboard.down('a')
        await frame.waitForFunction(
          (t) => window.__qaWorld.estado().tempo > t + 0.12,
          movimentos.pouso.tempo,
        )
        await pagina.keyboard.up('a')
        const curva = await frame.evaluate(() => window.__qaWorld.estado())
        await pagina.keyboard.down('w')
        await frame.waitForFunction((t) => window.__qaWorld.estado().tempo > t + 0.3, curva.tempo)
        await pagina.keyboard.up('w')
        movimentos.curva = await frame.evaluate(() => window.__qaWorld.estado())
        assert.ok(
          Math.abs(movimentos.curva.x - curva.x) > 0.08,
          'A curva precisa alterar o percurso com o teclado real.',
        )
        assert.ok(movimentos.curva.y > -0.05, 'A curva deve continuar sobre o piso físico.')
      } else {
        await pagina.keyboard.down('w')
        await frame.waitForFunction(() => window.__qaWorld.estado().y < -0.2)
        await pagina.keyboard.up('w')
        movimentos.queda = await frame.evaluate(() => window.__qaWorld.estado())
        assert.ok(
          movimentos.queda.y > -10,
          'O recorte deve provocar queda física, sem teletransporte.',
        )
      }
      const final = await frame.evaluate(() => window.__qaWorld.descartar())
      assert.deepEqual(final, { geometries: 0, textures: 0 })
      assert.deepEqual(erros, [])
      assert.deepEqual(
        rede.filter(
          (url) =>
            modo !== 'jogar' || !url.startsWith(`http://127.0.0.1:5413/api/studio/play/${playId}?`),
        ),
        [],
      )
      assert.deepEqual(consoleErros, [])
      const video = pagina.video()
      await contexto.close()
      await video.saveAs(resolve(pasta, `${etiqueta}.webm`))
      recibos.push({
        nome,
        modo,
        ciclos,
        inicio,
        depois,
        movimentos,
        final,
        erros,
        rede,
        consoleErros,
      })
      console.log(
        `Mundo ${etiqueta}: três trocas sem crescimento, movimento real, descarte final zerado.`,
      )
    } catch (e) {
      await pagina.screenshot({ path: resolve(pasta, `${etiqueta}-falha.png`) })
      const mensagens = await pagina.evaluate(() => window.__mensagens ?? [])
      const filho = modo === 'export' ? pagina : pagina.frames().find((f) => f.parentFrame())
      const estado = filho
        ? await filho.evaluate(() => ({
            ...window.__qaWorld?.estado(),
            tecla: window.SZWorld3D?.keyDown('KeyW'),
            foco: document.activeElement?.tagName,
          }))
        : null
      writeFileSync(
        resolve(pasta, `${etiqueta}-falha.json`),
        JSON.stringify({ erro: String(e), erros, rede, consoleErros, mensagens, estado }, null, 2),
      )
      throw e
    } finally {
      await contexto.close()
    }
  }
  writeFileSync(
    resolve(pasta, 'recibo.json'),
    `${JSON.stringify({ recibos, nota: 'Reabertura canônica, preview, export e PublicPlayer real na rota local /jogar. API de publicação controlada no ensaio, sem conta/gravação de publicação real; não substitui Next/gateway e staging no encerramento global. SDK/renderer WebGL reais, subclass só observa info.memory. CDN instalado servido nas URLs pinadas; service worker bloqueado. Não é teste de aparelho físico nem aceite artístico/IK.' }, null, 2)}\n`,
  )
} finally {
  await browser.close()
}
