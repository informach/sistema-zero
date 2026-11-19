import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = resolve(import.meta.dirname, '../../../..'),
  require = createRequire(resolve(raiz, 'packages/studio/package.json'))
const { createServer, build, preview } = await import(pathToFileURL(require.resolve('vite')).href)
const { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
  'playwright-core',
)
const three = dirname(dirname(require.resolve('three'))),
  base = resolve(raiz, 'output/cenarios-reforma/lote8-studio-pro'),
  pasta = resolve(base, JSON.parse(readFileSync(resolve(base, 'execucao.json'), 'utf8')).pasta)
assert.ok(dirname(pasta) === base && /^ensaio-[a-zA-Z0-9]+$/.test(basename(pasta)))
const nativo = JSON.parse(
  readFileSync(resolve(raiz, 'output/cenarios-reforma/lote8-raylib/mapa-native.json'), 'utf8'),
)
const browser = await chromium.launch({ channel: 'chrome', headless: true }),
  recibos = []
mkdirSync(resolve(pasta, 'videos'), { recursive: true })
let server
try {
  for (const [nome, modo] of [
    ['completo', 'source'],
    ['buraco', 'source'],
    ['completo', 'export'],
    ['buraco', 'export'],
  ]) {
    const etiqueta = `${nome}-${modo}`,
      root = resolve(pasta, nome, modo),
      outDir = resolve(pasta, nome, `dist-${Date.now()}`)
    if (process.env.PRO_CASO && process.env.PRO_CASO !== etiqueta) continue
    assert.ok(outDir.startsWith(`${pasta}/`) || outDir.startsWith(`${pasta}\\`))
    const observar = (server) => {
      server.middlewares.use((req, res, next) => {
        res.on('finish', () => {
          if (res.statusCode >= 400) console.log(`HTTP ${res.statusCode}: ${req.url}`)
        })
        next()
      })
    }
    const config = {
      configFile: false,
      root,
      logLevel: 'error',
      plugins: [
        { name: 'qa-http-status', configureServer: observar, configurePreviewServer: observar },
      ],
      resolve: {
        alias: [
          { find: /^three$/, replacement: resolve(three, 'build/three.module.js') },
          { find: /^three\/addons\//, replacement: `${resolve(three, 'examples/jsm')}/` },
        ],
      },
      server: { host: '127.0.0.1', port: 5414, strictPort: true, fs: { allow: [raiz] } },
      build: { outDir, emptyOutDir: false },
      preview: { host: '127.0.0.1', port: 5414, strictPort: true },
    }
    if (modo === 'export') {
      await build(config)
      server = await preview(config)
    } else {
      server = await createServer(config)
      await server.listen()
    }
    const context = await browser.newContext({
      viewport: { width: 960, height: 600 },
      recordVideo: { dir: resolve(pasta, 'videos'), size: { width: 960, height: 600 } },
    })
    await context.addInitScript(() =>
      Object.defineProperty(window, 'SZScene3D', {
        value: Object.freeze({ sentinela: true }),
        writable: false,
        configurable: false,
      }),
    )
    const page = await context.newPage(),
      erros = [],
      consoleErros = [],
      parcial = {},
      respostasComErro = []
    page.on('response', (r) => {
      if (r.status() >= 400) respostasComErro.push({ url: r.url(), status: r.status() })
    })
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErros.push(m.text())
    })
    try {
      await page.goto('http://127.0.0.1:5414')
      await page.waitForFunction(() => window.__qaCanvas?.pronto(), undefined, { timeout: 60000 })
      assert.equal(await page.evaluate(() => window.SZScene3D.sentinela), true)
      assert.equal(await page.evaluate(() => window.__qaPro.mesmaThree()), true)
      const ciclos = []
      parcial.ciclos = ciclos
      for (let i = 0; i < 3; i++) {
        const antes = await page.evaluate(() => window.__qaCanvas.estado())
        if (i) await page.evaluate(() => window.__qaCanvas.trocar())
        await page.waitForFunction(
          ({ g, q }) => {
            const s = window.__qaCanvas.estado()
            return s.geracao === g && s.quadros > q + 8
          },
          { g: i + 1, q: antes.quadros },
        )
        const s = await page.evaluate(() => window.__qaCanvas.estado())
        assert.equal(s.falha, null)
        assert.ok(s.proprio)
        assert.ok(s.grounded)
        if (i) {
          assert.deepEqual(s.recursos, ciclos[0].recursos)
          assert.ok(Math.hypot(s.x - ciclos[0].x, s.z - ciclos[0].z) < 0.01)
        }
        for (const c of s.cenas.slice(0, -1))
          assert.deepEqual(c, { arvores: 0, pai: false, ativa: false })
        if (nome === 'completo') assert.ok(s.clipes.length && s.clipes.every((c) => c.tempo > 0))
        ciclos.push(s)
      }
      let comparadas = 0
      if (nome === 'completo') {
        const alturas = await page.evaluate(
          (p) => window.__qaCanvas.alturas(p),
          nativo.alturas.map(({ x, z }) => ({ x, z })),
        )
        for (const [i, h] of alturas.entries()) {
          assert.equal(h.chao, nativo.alturas[i].chao)
          if (h.chao) assert.ok(Math.abs(h.altura - nativo.alturas[i].altura) < 1e-6)
        }
        comparadas = alturas.length
      }
      const falha = await page.evaluate(() => window.__qaPro.falhar()),
        abortado = await page.evaluate(() => window.__qaPro.abortar())
      assert.ok(falha.conservou && falha.ativa)
      assert.deepEqual(abortado, { erro: 'AbortError', conservou: true, ativa: true })
      await page.screenshot({ path: resolve(pasta, `${etiqueta}-inicio.png`) })
      await page.locator('canvas').click({ position: { x: 450, y: 280 } })
      const movimentos = {}
      parcial.movimentos = movimentos
      if (nome === 'completo') {
        await page.keyboard.down('w')
        await page.waitForFunction(() => window.__qaCanvas.estado().z > 8.65)
        const tempo = await page.evaluate(() => window.__qaCanvas.estado().tempo)
        await page.waitForFunction((t) => window.__qaCanvas.estado().tempo > t + 1, tempo)
        await page.keyboard.up('w')
        movimentos.obstaculo = await page.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.obstaculo.z <= 8.7501 && movimentos.obstaculo.grounded)
        await page.keyboard.down('s')
        await page.waitForFunction(
          (z) => z - window.__qaCanvas.estado().z > 2,
          movimentos.obstaculo.z,
        )
        await page.keyboard.up('s')
        movimentos.caminhada = await page.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.caminhada.y > 0)
        await page.keyboard.down('Shift')
        await page.keyboard.down('s')
        await page.waitForFunction(
          (z) => z - window.__qaCanvas.estado().z > 0.8,
          movimentos.caminhada.z,
        )
        await page.keyboard.up('s')
        await page.keyboard.up('Shift')
        movimentos.corrida = await page.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.corrida.y > 0)
        await page.waitForFunction(() => window.__qaCanvas.estado().grounded)
        const salto = await page.evaluate(() => window.__qaCanvas.estado())
        await page.keyboard.down('Space')
        await page.waitForFunction((y) => window.__qaCanvas.estado().y > y + 0.25, salto.y)
        movimentos.alto = await page.evaluate(() => window.__qaCanvas.estado())
        await page.keyboard.up('Space')
        await page.waitForFunction(
          ({ y, q }) => {
            const s = window.__qaCanvas.estado()
            return s.grounded && s.quadros > q + 10 && Math.abs(s.y - y) < 0.03
          },
          { y: salto.y, q: movimentos.alto.quadros },
        )
        movimentos.pouso = await page.evaluate(() => window.__qaCanvas.estado())
        await page.keyboard.down('d')
        await page.waitForFunction(
          (t) => window.__qaCanvas.estado().tempo > t + 0.15,
          movimentos.pouso.tempo,
        )
        await page.keyboard.up('d')
        movimentos.curva = await page.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.curva.x > movimentos.pouso.x + 0.04 && movimentos.curva.y > 0)
      } else {
        await page.keyboard.down('w')
        await page.waitForFunction(() => window.__qaCanvas.estado().y < 0)
        movimentos.inicioQueda = await page.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.inicioQueda.y > -10)
        await page.keyboard.up('w')
        await page.waitForFunction(() => window.__qaCanvas.estado().y < -10)
        movimentos.queda = await page.evaluate(() => window.__qaCanvas.estado())
        assert.ok(movimentos.queda.vy < 0)
      }
      await page.screenshot({ path: resolve(pasta, `${etiqueta}-movimento.png`) })
      const final = await page.evaluate(() => {
        const memoria = window.__qaCanvas.descartar()
        window.__qaPro.encerrar()
        return memoria
      })
      assert.deepEqual(final, { geometries: 0, textures: 0 })
      assert.deepEqual(erros, [])
      assert.deepEqual(consoleErros, [])
      const video = page.video()
      await context.close()
      await video.saveAs(resolve(pasta, `${etiqueta}.webm`))
      recibos.push({
        nome,
        modo,
        ciclos,
        comparadas,
        movimentos,
        falha,
        abortado,
        final,
        mesmaThree: true,
        sdkGlobalPreservado: true,
        erros,
        consoleErros,
      })
      console.log(`Pro ${etiqueta}: Vite real, três ciclos, física, movimento e descarte zerado.`)
    } catch (error) {
      await page.screenshot({ path: resolve(pasta, `${etiqueta}-falha.png`) })
      const estado = await page.evaluate(() => window.__qaCanvas?.estado())
      writeFileSync(
        resolve(pasta, `${etiqueta}-falha.json`),
        JSON.stringify(
          { erro: String(error), estado, erros, consoleErros, respostasComErro, parcial },
          null,
          2,
        ),
      )
      throw error
    } finally {
      await context.close()
      if (server.close) await server.close()
      else await new Promise((r) => server.httpServer.close(r))
      server = null
    }
  }
  writeFileSync(
    resolve(pasta, 'recibo.json'),
    JSON.stringify(
      {
        recibos,
        nota: 'Pro criado diretamente, sem conversão. Mesma receita do painel, coordenador local, reabertura, revisão e export de fontes. Dev-server e build Vite reais usam o npm Three instalado por alias de ensaio, sem alterar o package.json autoral. Não valida conta, implantação, sandbox do host remoto, PWA, IK, arte ou aparelhos físicos.',
      },
      null,
      2,
    ),
  )
} finally {
  if (server?.close) await server.close()
  else if (server?.httpServer) await new Promise((r) => server.httpServer.close(r))
  await browser.close()
}
