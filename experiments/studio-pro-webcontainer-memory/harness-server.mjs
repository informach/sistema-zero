// Servidor estático do harness mínimo de WebContainer (mesmos cabeçalhos do playground).
// Uso: node harness-server.mjs <port> <fixture.szproject.json>
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const [portArg, fixturePath] = process.argv.slice(2)
const dist = fileURLToPath(
  new URL('../../packages/studio/node_modules/@webcontainer/api/dist', import.meta.url),
)
const tree = JSON.parse(readFileSync(fixturePath, 'utf8')).tree
const files = Object.fromEntries(
  Object.entries(tree)
    .filter(([, v]) => v.kind === 'file')
    .map(([k, v]) => [k, v.content]),
)

const page = `<!doctype html><meta charset="utf-8"><title>wc harness</title>
<pre id="log"></pre><iframe id="preview" style="width:800px;height:400px"></iframe>
<script type="module">
import { WebContainer } from '/wc/index.js'
const log = (m) => { console.log('[harness] ' + m); document.getElementById('log').textContent += m + '\\n' }
const params = new URLSearchParams(location.search)
const vite = params.get('vite')
const files = ${JSON.stringify(files).replaceAll('<', String.fromCharCode(92) + 'u003c')}
const pkg = JSON.parse(files['package.json'])
pkg.devDependencies.vite = vite
files['package.json'] = JSON.stringify(pkg, null, 2) + '\\n'
const fsTree = {}
for (const [path, contents] of Object.entries(files)) {
  const parts = path.split('/'); let node = fsTree
  for (const dir of parts.slice(0, -1)) node = (node[dir] ??= { directory: {} }).directory
  node[parts.at(-1)] = { file: { contents } }
}
try {
  log('phase: booting')
  const wc = await WebContainer.boot({ coep: 'credentialless', forwardPreviewErrors: 'exceptions-only' })
  await wc.mount(fsTree)
  log('phase: installing')
  const install = await wc.spawn('npm', ['install'])
  install.output.pipeTo(new WritableStream({ write() {} }))
  const code = await install.exit
  if (code !== 0) { log('phase: error'); throw new Error('install ' + code) }
  const lock = JSON.parse(await wc.fs.readFile('package-lock.json', 'utf8'))
  log('installed vite=' + lock.packages['node_modules/vite']?.version + ' rolldown=' + lock.packages['node_modules/rolldown']?.version)
  log('phase: starting')
  wc.on('server-ready', (port, url) => { document.getElementById('preview').src = url; log('phase: ready') })
  const dev = await wc.spawn('npm', ['run', 'dev'])
  dev.output.pipeTo(new WritableStream({ write() {} }))
} catch (e) { log('error: ' + e.message); log('phase: error') }
</script>`

const types = { '.js': 'text/javascript', '.html': 'text/html' }
createServer((req, res) => {
  const headers = {
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Opener-Policy': 'same-origin',
  }
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/') {
    res.writeHead(200, { ...headers, 'Content-Type': 'text/html' })
    return res.end(page)
  }
  if (url.pathname.startsWith('/wc/')) {
    const file = normalize(join(dist, url.pathname.slice(4)))
    if (!file.startsWith(normalize(dist))) return res.writeHead(403).end()
    try {
      const body = readFileSync(file)
      res.writeHead(200, {
        ...headers,
        'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      })
      return res.end(body)
    } catch {}
  }
  res.writeHead(404, headers).end()
}).listen(Number(portArg), '127.0.0.1', () => console.log('harness on', portArg))
