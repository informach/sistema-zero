import { resolve } from 'node:path'

const output = resolve(import.meta.dirname, '../../.cache/studio-python-l0/pinta-bundle')
const build = await Bun.build({
  entrypoints: [
    resolve(import.meta.dirname, 'pinta-browser.ts'),
    resolve(import.meta.dirname, 'pinta-composite.mjs'),
  ],
  target: 'browser',
  outdir: output,
  splitting: true,
  minify: true,
  metafile: true,
})
if (!build.success) throw new AggregateError(build.logs, 'Pinta probe build failed')
if (!build.metafile) throw new Error('Pinta build did not produce dependency evidence')
const inputs = Object.keys(build.metafile.inputs)
if (inputs.some((path) => /(?:molda|three|react|components)\//i.test(path)))
  throw new Error('Pinta conversion pulled an editor/3D dependency')
await Bun.write(resolve(output, 'metafile.json'), JSON.stringify(build.metafile, null, 2))
const files = new Map(build.outputs.map((file) => [`/${file.path.split(/[\\/]/).at(-1)}`, file]))
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/')
      return new Response(
        '<!doctype html><title>Pinta materialization L0</title><script type="module" src="/pinta-browser.js"></script>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    const file = files.get(path)
    return file
      ? new Response(file, { headers: { 'Content-Type': 'text/javascript' } })
      : new Response('Not found', { status: 404 })
  },
})
console.log(
  JSON.stringify({
    url: server.url.origin,
    inputs: inputs.length,
    bytes: build.outputs.reduce((total, file) => total + file.size, 0),
  }),
)
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    server.stop(true)
    process.exit(0)
  })
