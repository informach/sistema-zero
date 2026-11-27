// Fotografa as peças na luz do Jogo 3D (Chromium + three.js do Estúdio).
//
//   node previa/previa.mjs <pasta-dos-glb> <pasta-de-saida> giro nave-falcao-azul[:3] ...
//   node previa/previa.mjs <pasta-dos-glb> <pasta-de-saida> jogo cenario nave asteroide laser [nome]
//
// O three.js é o mesmo do Estúdio (packages/studio, 0.184.0).
import { createReadStream, existsSync, mkdirSync } from 'node:fs'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repo = resolve(here, '../../../..')
const requireStudio = createRequire(join(repo, 'packages/studio/package.json'))
const threeDir = dirname(dirname(requireStudio.resolve('three')))
const { chromium } = createRequire(import.meta.url)('playwright')

const [glbDir, outDir, modo, ...resto] = process.argv.slice(2)
if (!glbDir || !outDir || !modo) {
  console.error('uso: previa.mjs <glb> <saida> giro|jogo ...')
  process.exit(2)
}
mkdirSync(outDir, { recursive: true })
const tipos = { '.html': 'text/html', '.js': 'text/javascript', '.glb': 'model/gltf-binary' }
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://x')
  let file
  if (url.pathname === '/') file = join(here, 'previa.html')
  else if (url.pathname.startsWith('/three/')) file = join(threeDir, url.pathname.slice(7))
  else if (url.pathname.startsWith('/glb/')) file = join(resolve(glbDir), url.pathname.slice(5))
  if (!file || !existsSync(file)) {
    res.writeHead(404)
    res.end()
    return
  }
  res.writeHead(200, { 'content-type': tipos[extname(file)] ?? 'application/octet-stream' })
  createReadStream(file).pipe(res)
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

async function foto(params, arquivo, w = 1280, h = 720) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const erros = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(m.text()) })
  await page.goto(`http://127.0.0.1:${port}/?${new URLSearchParams({ ...params, w, h })}`)
  await page.waitForFunction(() => window.__pronto || window.__erro, null, { timeout: 120000 })
  const erro = await page.evaluate(() => window.__erro)
  if (erro) throw new Error(erro)
  await page.locator('canvas').screenshot({ path: join(outDir, arquivo) })
  await page.close()
  if (erros.length) console.warn(arquivo, erros.join('\n'))
  console.log('foto', join(outDir, arquivo))
}

try {
  if (modo === 'giro') {
    for (const item of resto) {
      const [peca, size = '3', fundo] = item.split(':')
      await foto({ modo: 'giro', peca, size, ...(fundo ? { fundo: `#${fundo}` } : {}) }, `${peca}.png`, 1200, 800)
    }
  } else if (modo === 'mini') {
    for (const item of resto) {
      const [peca, size = '3'] = item.split(':')
      await foto({ modo: 'mini', peca, size, fundo: '#1b2140' }, `${peca}.png`, peca.startsWith('cenario-') ? 640 : 480, peca.startsWith('cenario-') ? 360 : 480)
    }
  } else if (modo === 'jogo') {
    const [cenario, nave, asteroide, laser, nome = 'jogo'] = resto
    await foto({ modo: 'jogo', cenario, nave, asteroide, laser }, `${nome}.png`)
  }
} finally {
  await browser.close()
  server.close()
}
