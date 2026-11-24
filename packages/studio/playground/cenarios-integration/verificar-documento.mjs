import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '../../../..'),
  { chromium } = createRequire(resolve(raiz, 'packages/molda-cenarios/package.json'))(
    'playwright-core',
  ),
  pasta = resolve(raiz, 'output/cenarios-reforma/lote8-studio-motores/documento'),
  nativo = JSON.parse(
    readFileSync(resolve(raiz, 'output/cenarios-reforma/lote8-raylib/mapa-native.json'), 'utf8'),
  ),
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  recibos = []
mkdirSync(pasta, { recursive: true })
try {
  for (const modo of ['preview', 'export']) {
    // Routing the static ZIP in memory does not emulate a service-worker server.
    const page = await browser.newPage(modo === 'export' ? { serviceWorkers: 'block' } : {}),
      erros = [],
      rede = [],
      csp = []
    page.on('pageerror', (e) => erros.push(e.message))
    page.on('console', (e) => {
      if (e.type() === 'error') csp.push(e.text())
    })
    page.on('request', (r) => {
      if (['fetch', 'xhr'].includes(r.resourceType())) rede.push(r.url())
    })
    await page.route('https://esm.sh/**', (route) => {
      const url = new URL(route.request().url()),
        nome = url.pathname.endsWith('/GLTFLoader.js')
          ? 'GLTFLoader'
          : url.pathname.endsWith('/SkeletonUtils.js')
            ? 'SkeletonUtils'
            : url.pathname === '/three@0.184.0'
              ? 'three'
              : null
      if (!nome) throw Error(`Import não previsto: ${url}`)
      return route.fulfill({
        contentType: 'text/javascript',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: readFileSync(resolve(pasta, `${nome}.js`)),
      })
    })
    await page.route('http://127.0.0.1:5413/documento-qa/**', (route) => {
      const path = new URL(route.request().url()).pathname.slice('/documento-qa/'.length)
      if (!path || path === 'host')
        return route.fulfill({
          contentType: 'text/html',
          body: '<!doctype html><html><body></body></html>',
        })
      if (path.includes('..')) throw Error('Caminho inválido')
      return route.fulfill({ path: resolve(pasta, 'export/public', path) })
    })
    let resultado
    if (modo === 'export') {
      await page.addInitScript(() => {
        window.addEventListener('message', (e) => {
          if (e.source === window && e.data?.tag === 'mcn-documento')
            window.__resultadoDocumento = e.data.resultado
        })
      })
      await page.goto('http://127.0.0.1:5413/documento-qa/index.html')
      await page.waitForFunction(() => window.__resultadoDocumento, { timeout: 90000 })
      resultado = await page.evaluate(() => window.__resultadoDocumento)
    } else {
      await page.goto('http://127.0.0.1:5413/documento-qa/host')
      resultado = await page.evaluate(
        ({ doc }) =>
          new Promise((resolve, reject) => {
            const iframe = document.createElement('iframe'),
              timer = setTimeout(() => reject(Error('Documento não respondeu em 90 s')), 90000)
            iframe.setAttribute('sandbox', 'allow-scripts')
            iframe.width = '660'
            iframe.height = '440'
            window.addEventListener('message', (e) => {
              if (e.source === iframe.contentWindow && e.data?.tag === 'mcn-documento') {
                clearTimeout(timer)
                resolve(e.data.resultado)
              }
            })
            iframe.srcdoc = doc
            document.body.append(iframe)
          }),
        { doc: readFileSync(resolve(pasta, 'preview.html'), 'utf8') },
      )
    }
    writeFileSync(
      resolve(pasta, `${modo}-bruto.json`),
      JSON.stringify({ resultado, erros, rede, csp }),
    )
    assert.equal(resultado.erro, undefined, resultado.stack)
    assert.equal(resultado.origem, modo === 'preview' ? 'null' : 'http://127.0.0.1:5413')
    assert.equal(resultado.aborto, true)
    assert.equal(resultado.abortoDurante, true)
    assert.equal(resultado.adulteracaoRecusada, true)
    assert.equal(resultado.ciclos.length, 3)
    for (const r of resultado.ciclos) {
      assert.equal(r.mesmaThree, true)
      assert.equal(r.nos, 20)
      assert.equal(r.aguas, 2)
      assert.equal(r.caminhos, 3)
      assert.equal(r.arvoresDepois, 0)
      assert.equal(r.filhosDepois, 0)
      assert.deepEqual(r.depois, resultado.ciclos[0].depois)
      assert.ok(r.desenhado.chamadas > 0 && r.desenhado.triangulos > 0)
      assert.equal(r.animacoes.length, 1)
      assert.equal(r.animacoes[0].clipes.length, 4)
      assert.deepEqual(r.animacoes[0].ossos, [44])
      assert.equal(r.animacoes[0].matrizesFinitas, true)
      for (const [i, h] of r.alturas.entries()) {
        const e = nativo.alturas[i]
        assert.equal(h.chao, e.chao)
        if (h.chao) assert.ok(Math.abs(h.altura - e.altura) < 1e-6)
        else assert.equal(h.altura, null)
      }
      writeFileSync(
        resolve(pasta, `${modo}-${r.ciclo}.png`),
        Buffer.from(r.imagem.split(',')[1], 'base64'),
      )
      delete r.imagem
    }
    assert.deepEqual(resultado.recursosFinais, { geometries: 0, textures: 0 })
    assert.deepEqual(erros, [])
    assert.deepEqual(rede, [])
    assert.deepEqual(csp, [])
    recibos.push({ modo, ...resultado, erros, rede, csp })
    await page.close()
    console.log(
      `${modo}: 20 nós, 441 consultas/ciclo, quatro clipes, três descartes e corrupção/cancelamento recusados; sem fetch/XHR.`,
    )
  }
  writeFileSync(
    resolve(pasta, 'recibo.json'),
    `${JSON.stringify({ recibos, vendor: 'Three 0.184.0 instalado, servido nas URLs pinadas; disponibilidade do CDN não simulada como teste de rede real.' }, null, 2)}\n`,
  )
} finally {
  await browser.close()
}
