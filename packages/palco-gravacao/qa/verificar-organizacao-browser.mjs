import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Node controla o navegador também no Windows. Bun só compila a fixture.
const studio = createRequire(new URL('../../studio/package.json', import.meta.url))
const { chromium } = studio('playwright-core')
const blockly = dirname(studio.resolve('blockly/core'))
const pasta = mkdtempSync(join(tmpdir(), 'sz-palco-organizar-'))
assert.equal(dirname(pasta), tmpdir())
const caminho = (url) => fileURLToPath(url).replaceAll('\\', '/')
const entrada = join(pasta, 'entrada.ts')
const bundle = join(pasta, 'fixture.js')
writeFileSync(
  entrada,
  `import * as Blockly from ${JSON.stringify(join(blockly, 'core.js').replaceAll('\\', '/'))};
import ${JSON.stringify(studio.resolve('blockly/blocks').replaceAll('\\', '/'))};
import * as ptBR from ${JSON.stringify(studio.resolve('blockly/msg/pt-br').replaceAll('\\', '/'))};
import {paginaDe} from ${JSON.stringify(caminho(new URL('../src/lib/pagina.ts', import.meta.url)))};
import {organizeBlocks} from ${JSON.stringify(caminho(new URL('../../studio/src/blockly/organize.ts', import.meta.url)))};
Blockly.setLocale(ptBR);Object.assign(window,{fixture:{Blockly,paginaDe,organizeBlocks}});`,
)
let browser
let server
try {
  execFileSync(
    'bun',
    ['build', entrada, '--target', 'browser', '--format', 'esm', '--outfile', bundle],
    {
      cwd: dirname(fileURLToPath(new URL('../../../package.json', import.meta.url))),
      stdio: 'pipe',
      timeout: 30_000,
    },
  )
  const script = readFileSync(bundle)
  server = createServer((req, res) => {
    if (req.url === '/fixture.js') {
      res.writeHead(200, { 'content-type': 'application/javascript' })
      res.end(script)
    } else {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(
        '<!doctype html><html><body style="margin:0"><div id="studio" style="height:700px;width:1000px"></div><script type="module" src="/fixture.js"></script></body></html>',
      )
    }
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  browser = await chromium.launch({
    headless: true,
    timeout: 20_000,
    ...(process.env.SZ_CHECK_CHROMIUM ? { executablePath: process.env.SZ_CHECK_CHROMIUM } : {}),
  })
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  page.setDefaultTimeout(10_000)
  const erros = []
  page.on('pageerror', (error) => erros.push(error.message))
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  await page.waitForFunction(() => Boolean(window.fixture))
  const resultado = await page.evaluate(async () => {
    const { Blockly, paginaDe, organizeBlocks } = window.fixture
    const workspace = Blockly.inject(document.querySelector('#studio'), {
      toolbox: { kind: 'flyoutToolbox', contents: [] },
    })
    let organizacoes = 0
    Blockly.ContextMenuRegistry.registry.register({
      id: 'sz_organize',
      weight: 6,
      scopeType: Blockly.ContextMenuRegistry.ScopeType.WORKSPACE,
      displayText: () => 'Organizar blocos',
      preconditionFn: () => 'enabled',
      callback: () => {
        organizeBlocks(workspace)
        organizacoes++
      },
    })
    for (let i = 0; i < 2; i++) {
      const bloco = workspace.newBlock('math_number')
      bloco.initSvg()
      bloco.render()
      bloco.moveBy(100, 100)
    }
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const pagina = paginaDe(document)
    const primeira = {
      ok: await pagina.organizar(),
      organizacoes,
      posicoes: workspace
        .getTopBlocks(false)
        .map((bloco) => ({ ...bloco.getRelativeToSurfaceXY() })),
    }
    const segunda = { ok: await pagina.organizar(), organizacoes }
    // Uma aba sem frames novos não pode ficar pendurada nem declarar sucesso.
    const original = window.requestAnimationFrame
    window.requestAnimationFrame = () => 0
    let semFrames
    try {
      semFrames = { ok: await pagina.organizar(), organizacoes }
    } finally {
      window.requestAnimationFrame = original
      workspace.dispose()
    }
    return { primeira, segunda, semFrames }
  })
  assert.deepEqual(erros, [])
  assert.equal(resultado.primeira.ok, true)
  assert.equal(resultado.primeira.organizacoes, 1)
  assert.deepEqual(resultado.primeira.posicoes, [
    { x: 32, y: 32 },
    { x: 32, y: 82 },
  ])
  assert.deepEqual(resultado.segunda, { ok: true, organizacoes: 2 })
  assert.deepEqual(resultado.semFrames, { ok: false, organizacoes: 2 })
  console.log(JSON.stringify({ resultado: 'PASS', navegador: browser.version(), casos: resultado }))
} finally {
  await browser?.close()
  if (server) await new Promise((resolve) => server.close(resolve))
  // Pasta exclusiva criada acima, sem caminhos recebidos de fora.
  rmSync(pasta, { recursive: true, force: true })
}
