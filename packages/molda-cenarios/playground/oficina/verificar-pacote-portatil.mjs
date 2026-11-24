import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { chromium } from 'playwright-core'

const raiz = resolve(import.meta.dirname, '../../../..'),
  saida = resolve(raiz, process.env.CENARIOS_QA_PACOTE ?? 'output/cenarios-reforma/lote8-portatil'),
  pasta = resolve(saida, 'extraido'),
  consultas = [],
  tipos = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.glb': 'model/gltf-binary',
  },
  servidor = createServer((r, s) => {
    const caminho = new URL(r.url, 'http://local').pathname
    consultas.push({
      caminho,
      cookie: !!r.headers.cookie,
      authorization: !!r.headers.authorization,
    })
    s.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'none'; base-uri 'none'; object-src 'none'",
    )
    try {
      if (caminho === '/ensaio.html') {
        s.setHeader('content-type', 'text/html')
        s.end(
          '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="explorar.css"><link rel="icon" href="data:,"></head><body><main><canvas tabindex="0"></canvas></main></body></html>',
        )
        return
      }
      const destino = resolve(pasta, `.${caminho === '/' ? '/index.html' : caminho}`)
      if (!destino.startsWith(`${pasta}\\`) && !destino.startsWith(`${pasta}/`)) throw Error('fora')
      const dados = readFileSync(destino)
      s.setHeader('content-type', tipos[extname(destino)] ?? 'application/octet-stream')
      s.end(dados)
    } catch {
      s.statusCode = 404
      s.end('ausente')
    }
  })
if (!saida.startsWith(`${resolve(raiz, 'output/cenarios-reforma')}${sep}`))
  throw Error('O ensaio portátil só escreve dentro de output/cenarios-reforma.')
await new Promise((r) => servidor.listen(0, '127.0.0.1', r))
const origem = `http://127.0.0.1:${servidor.address().port}`,
  browser = await chromium.launch({ channel: 'chrome', headless: true }),
  erros = [],
  externos = [],
  contexto = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: resolve(saida, 'videos'), size: { width: 1280, height: 720 } },
  })
await contexto.addCookies([
  { name: 'ensaio-sem-sessao', value: 'nao-enviar-recursos', url: origem },
])
await contexto.route('**/*', (route) => {
  const url = new URL(route.request().url())
  if (url.protocol === 'http:' && url.origin === origem) return route.continue()
  externos.push(url.origin)
  return route.abort()
})
contexto.on('page', (p) => {
  p.on('pageerror', (e) => erros.push(e.message))
  p.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text())
  })
})
try {
  const pagina = await contexto.newPage()
  await pagina.goto(origem)
  await pagina.getByRole('button', { name: 'Pausar', exact: true }).waitFor({ state: 'visible' })
  await pagina.waitForFunction(() => !document.querySelector('#pausar').disabled)
  await pagina.screenshot({ path: resolve(saida, 'exemplo-desktop.png') })
  await pagina.getByRole('button', { name: 'Pausar', exact: true }).click()
  await pagina.getByText('Exploração pausada', { exact: true }).waitFor()
  await pagina.getByRole('button', { name: 'Continuar', exact: true }).click()
  await pagina.keyboard.down('KeyW')
  await pagina.waitForTimeout(900)
  await pagina.keyboard.up('KeyW')
  await pagina.keyboard.press('Escape')
  await pagina.getByRole('button', { name: 'Continuar', exact: true }).waitFor()
  await pagina.getByRole('button', { name: 'Voltar ao início' }).click()
  await pagina.getByRole('button', { name: 'Pausar', exact: true }).waitFor()
  await pagina.goto(`${origem}/ensaio.html`)
  const movimento = await pagina.evaluate(async () => {
    const { iniciarExploracaoDoCenario } = await import('./carregar-cenario.js'),
      c = new AbortController(),
      falhas = [],
      e = await iniciarExploracaoDoCenario({
        canvas: document.querySelector('canvas'),
        endereco: new URL('/cenario.json', location.href),
        sinal: c.signal,
        aoErro: (erro) => falhas.push(String(erro)),
      })
    try {
      await new Promise((r) => setTimeout(r, 200))
      const antes = e.estado()
      e.entrada({ frente: 1 })
      await new Promise((r) => setTimeout(r, 1200))
      e.entrada({ frente: 0 })
      const depois = e.estado()
      e.comandar({ pausado: true })
      const pausado = e.estado().pausado
      e.comandar({ retomarInicio: true, pausado: false })
      await new Promise((r) => setTimeout(r, 100))
      return {
        antes,
        depois,
        pausado,
        retomado: e.estado(),
        falhas,
        distancia: Math.hypot(
          depois.posicao.x - antes.posicao.x,
          depois.posicao.z - antes.posicao.z,
        ),
      }
    } finally {
      c.abort()
      e.descartar()
      e.descartar()
    }
  })
  assert.ok(movimento.distancia > 0.7, 'O personagem se moveu pela física existente')
  assert.equal(movimento.depois.caiu, false)
  assert.equal(movimento.pausado, true)
  assert.deepEqual(movimento.falhas, [])
  await pagina.setViewportSize({ width: 390, height: 844 })
  await pagina.emulateMedia({ reducedMotion: 'reduce' })
  await pagina.goto(origem)
  await pagina.waitForFunction(() => !document.querySelector('#pausar').disabled)
  const botao = pagina.getByRole('button', { name: 'Avançar', exact: true }),
    caixa = await botao.boundingBox()
  await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2)
  await pagina.mouse.down()
  await pagina.waitForTimeout(650)
  await pagina.mouse.up()
  await pagina.screenshot({ path: resolve(saida, 'exemplo-movel.png') })
  assert.ok(!/saiu|carregar|consegui/i.test(await pagina.locator('#estado').innerText()))
  await contexto.close()
  const manifesto = JSON.parse(readFileSync(resolve(pasta, 'cenario.json'), 'utf8')),
    dados = new Set(['/cenario.json', ...manifesto.arquivos.map((a) => `/${a.caminho}`)]),
    recursos = consultas.filter((c) => dados.has(c.caminho))
  assert.ok(recursos.length > 0)
  assert.ok(
    recursos.every((c) => !c.cookie && !c.authorization),
    'Recursos baixados sem sessão/cookies',
  )
  assert.deepEqual(externos, [])
  assert.deepEqual(erros, [])
  const resultado = {
    movimento,
    recursosSemSessao: recursos.length,
    origensExternas: externos,
    erros,
    pacote: JSON.parse(readFileSync(resolve(saida, 'pacote.json'), 'utf8')),
  }
  writeFileSync(resolve(saida, 'resultado.json'), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado, null, 2))
} finally {
  await contexto.close()
  await browser.close()
  await new Promise((r) => servidor.close(r))
}
