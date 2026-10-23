import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

const bytes = new TextEncoder().encode('public immutable bytes')
const sha256 = createHash('sha256').update(bytes).digest('hex')
const manifest = {
  version: 1,
  runtimeManifestSha256: 'a'.repeat(64),
  files: [
    { name: 'pyodide.asm.wasm', bytes: bytes.length, sha256, mime: 'application/wasm' },
    { name: 'python_stdlib.zip', bytes: bytes.length, sha256, mime: 'application/zip' },
    { name: 'pyodide-lock.json', bytes: bytes.length, sha256, mime: 'application/json' },
  ],
}
const resource = Bun.serve({
  hostname: '127.0.0.1',
  port: 5312,
  fetch(request) {
    const name = new URL(request.url).pathname.slice('/runtime/'.length)
    const file = manifest.files.find((file) => file.name === name)
    if (!file) return new Response('Not found', { status: 404 })
    const gzip = file.name.endsWith('.json')
    const body = gzip ? gzipSync(bytes) : bytes
    return new Response(body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': file.mime,
        'Content-Length': String(body.length),
        ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
      },
    })
  },
})
const build = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'bootStoreHost.ts')],
  target: 'browser',
  format: 'esm',
  minify: false,
})
if (!build.success || build.outputs.length !== 1)
  throw new AggregateError(build.logs, 'Boot store browser proof build failed')
const source = await build.outputs[0]!.text()
Bun.serve({
  hostname: '127.0.0.1',
  port: 5311,
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/configuration')
      return Response.json({ directory: `${resource.url.origin}/runtime/`, manifest })
    if (path === '/host.mjs')
      return new Response(source, { headers: { 'Content-Type': 'text/javascript' } })
    return new Response(
      '<!doctype html><title>Owned boot resource store proof</title><script type="module" src="/host.mjs"></script>',
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
