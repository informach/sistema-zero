// Organiza os blocos de projetos do Estúdio num navegador de verdade, com o mesmo "Organizar blocos" do
// Estúdio e do Admin (packages/studio/src/blockly/organize.ts), que mede cada pilha desenhada.
// Uso (quem chama é organizar-projetos.ts): node organizar-projetos-navegador.mjs <pedido.json> <resposta.json>
//   pedido:   [{ chave, blocksState, extensoes: ["game-3d", ...] }]
//   resposta: { [chave]: [{ x, y }, ...] }  (uma posição por pilha do topo, na ordem do blocksState)
// Node controla o navegador também no Windows; o Bun só monta a página (como no teste do palco).
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const [arquivoPedido, arquivoResposta] = process.argv.slice(2)
assert.ok(
  arquivoPedido && arquivoResposta,
  'uso: organizar-projetos-navegador.mjs <pedido.json> <resposta.json>',
)
const pedido = JSON.parse(readFileSync(arquivoPedido, 'utf8'))
const raiz = fileURLToPath(new URL('../../../', import.meta.url))
const studio = createRequire(join(raiz, 'packages/studio/package.json'))
const { chromium } = studio('playwright-core')
const fonte = (pacote, arquivo) =>
  join(dirname(studio.resolve(`${pacote}/package.json`)), 'files', arquivo)
const FONTES = {
  '/fontes/baloo-2-500.woff2': fonte('@fontsource/baloo-2', 'baloo-2-latin-500-normal.woff2'),
  '/fontes/nunito-500.woff2': fonte('@fontsource/nunito', 'nunito-latin-500-normal.woff2'),
}
const src = (p) => join(raiz, 'packages/studio/src', p).replaceAll('\\', '/')
const pasta = mkdtempSync(join(tmpdir(), 'sz-organizar-projetos-'))
const entrada = join(pasta, 'entrada.ts')
const pacote = join(pasta, 'pagina.js')
writeFileSync(
  entrada,
  // O Blockly vem do setup do Estúdio, resolvido para o navegador (o caminho do Node puxa o jsdom).
  `import { Blockly, ensureBlocklyInitialized } from ${JSON.stringify(src('blockly/setup.ts'))};
import { registerExtensionBlocks } from ${JSON.stringify(src('blockly/blocks/index.ts'))};
import { loadWorkspaceState } from ${JSON.stringify(src('blockly/loadWorkspaceState.ts'))};
import { organizeBlocks } from ${JSON.stringify(src('blockly/organize.ts'))};
import { szTheme } from ${JSON.stringify(src('blockly/theme.ts'))};
import { findExtension } from ${JSON.stringify(src('official-extensions/index.ts'))};
Object.assign(window, { organizador: { Blockly, ensureBlocklyInitialized, registerExtensionBlocks, loadWorkspaceState, organizeBlocks, szTheme, findExtension } });`,
)
let navegador
let servidor
try {
  execFileSync(
    'bun',
    ['build', entrada, '--target', 'browser', '--format', 'esm', '--outfile', pacote],
    {
      cwd: raiz,
      stdio: 'pipe',
      timeout: 120_000,
    },
  )
  const script = readFileSync(pacote)
  servidor = createServer((req, res) => {
    if (req.url === '/pagina.js') {
      res.writeHead(200, { 'content-type': 'application/javascript' })
      res.end(script)
    } else if (FONTES[req.url]) {
      res.writeHead(200, { 'content-type': 'font/woff2' })
      res.end(readFileSync(FONTES[req.url]))
    } else {
      res.writeHead(200, { 'content-type': 'text/html' })
      res.end(`<!doctype html><html><head><style>
@font-face{font-family:'Baloo 2';font-weight:500;src:url(/fontes/baloo-2-500.woff2) format('woff2')}
@font-face{font-family:'Nunito';font-weight:500;src:url(/fontes/nunito-500.woff2) format('woff2')}
</style></head><body style="margin:0"><div id="area" style="width:4000px;height:3000px"></div>
<script type="module" src="/pagina.js"></script></body></html>`)
    }
  })
  await new Promise((ok) => servidor.listen(0, '127.0.0.1', ok))
  navegador = await chromium.launch({
    headless: true,
    timeout: 30_000,
    ...(process.env.SZ_CHECK_CHROMIUM
      ? { executablePath: process.env.SZ_CHECK_CHROMIUM }
      : process.platform === 'win32'
        ? { channel: 'chrome' }
        : {}),
  })
  const pagina = await navegador.newPage({ viewport: { width: 1600, height: 1000 } })
  const erros = []
  pagina.on('pageerror', (e) => erros.push(e.message))
  await pagina.goto(`http://127.0.0.1:${servidor.address().port}`)
  await pagina.waitForFunction(() => Boolean(window.organizador), null, { timeout: 60_000 })
  const resposta = await pagina.evaluate(async (itens) => {
    const o = window.organizador
    o.ensureBlocklyInitialized()
    await document.fonts.load('500 13px "Baloo 2"')
    await document.fonts.load('500 13px Nunito')
    const registradas = new Set()
    const saida = {}
    for (const item of itens) {
      for (const id of item.extensoes) {
        if (registradas.has(id)) continue
        const extensao = o.findExtension(id)
        if (!extensao) throw new Error(`Extensão não instalada: ${id}`)
        o.registerExtensionBlocks(extensao.blockly.blocks)
        registradas.add(id)
      }
      const area = document.querySelector('#area')
      const ws = o.Blockly.inject(area, {
        renderer: 'zelos',
        theme: o.szTheme,
        sounds: false,
        scrollbars: false,
      })
      try {
        const estado = structuredClone(item.blocksState)
        const topo = estado.blocks.blocks
        topo.forEach((b, i) => {
          b.id = `__topo_${i}`
        })
        o.loadWorkspaceState(estado, ws)
        o.Blockly.svgResize(ws)
        ws.render()
        o.organizeBlocks(ws)
        saida[item.chave] = topo.map((_, i) => {
          const xy = ws.getBlockById(`__topo_${i}`).getRelativeToSurfaceXY()
          return { x: Math.round(xy.x), y: Math.round(xy.y) }
        })
      } finally {
        ws.dispose()
      }
    }
    return saida
  }, pedido)
  assert.deepEqual(erros, [], `erros na página: ${erros.join(' | ')}`)
  writeFileSync(arquivoResposta, JSON.stringify(resposta))
  // Para conferir com os olhos: SZ_ORGANIZAR_FOTOS=<pasta> fotografa cada projeto já organizado.
  const fotos = process.env.SZ_ORGANIZAR_FOTOS
  if (fotos) {
    for (const [k, item] of pedido.entries()) {
      await pagina.evaluate(
        ({ item, posicoes }) => {
          const o = window.organizador
          const area = document.querySelector('#area')
          area.innerHTML = ''
          const ws = o.Blockly.inject(area, {
            renderer: 'zelos',
            theme: o.szTheme,
            sounds: false,
            scrollbars: false,
          })
          const estado = structuredClone(item.blocksState)
          estado.blocks.blocks.forEach((b, i) => Object.assign(b, posicoes[i]))
          o.loadWorkspaceState(estado, ws)
          o.Blockly.svgResize(ws)
          ws.scroll(0, 0)
        },
        { item, posicoes: resposta[item.chave] },
      )
      await pagina.screenshot({
        path: join(fotos, `${String(k).padStart(2, '0')}-${item.chave.slice(0, 8)}.png`),
        fullPage: false,
      })
    }
  }
} finally {
  await navegador?.close()
  servidor?.close()
  rmSync(pasta, { recursive: true, force: true })
}
