import { resolve } from 'node:path'
import { startProbeServers } from './server'

// The kit contains the exact browser outputs built on the development machine;
// it does not require the repository or build tools on the reference computer.
const directory = resolve(import.meta.dirname, '../../.cache/studio-python-l0/pinta-bundle')
const names: string[] = await Bun.file(resolve(directory, 'files.json')).json()
if (names.some((name) => !/^[a-zA-Z0-9_-]+\.js$/.test(name)))
  throw new Error('Invalid reference bundle manifest')
const allowed = new Set(names)
const runtime = startProbeServers()
const pinta = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/')
      return new Response(
        '<!doctype html><meta charset="utf-8"><title>Teste Pinta</title><p>Conversão Pinta em andamento. Mantenha esta janela visível.</p><script type="module" src="/pinta-browser.js"></script>',
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      )
    const name = path.slice(1)
    if (!allowed.has(name)) return new Response('Not found', { status: 404 })
    return new Response(Bun.file(resolve(directory, name)), {
      headers: { 'Content-Type': 'text/javascript', 'X-Content-Type-Options': 'nosniff' },
    })
  },
})
console.log(JSON.stringify({ runtime: runtime.url, pinta: pinta.url.origin }))
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    runtime.stop()
    pinta.stop(true)
    process.exit(0)
  })
