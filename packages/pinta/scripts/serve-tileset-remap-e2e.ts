import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const port = Number(process.env.PINTA_REMAP_PORT ?? 5574),
  baseline = '30b108a9ddb69f18930fda4d7cff4d2211bd71e4'
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const directory = resolve(import.meta.dir, `../.cache/tileset-remap-${port}`)
await mkdir(directory, { recursive: true })
const oldWidget: Bun.BunPlugin = {
  name: 'previous-real-tiles-widget',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]components[\\/]editor[\\/]TileStrip\.tsx$/ }, (args) => {
      const result = Bun.spawnSync(
        ['git', 'show', `${baseline}:packages/pinta/src/components/editor/TileStrip.tsx`],
        { cwd: resolve(import.meta.dir, '../../..'), stdout: 'pipe', stderr: 'pipe' },
      )
      if (result.exitCode !== 0) throw Error('Componente histórico ausente')
      return { contents: result.stdout.toString(), loader: 'tsx', resolveDir: dirname(args.path) }
    })
  },
}
for (const previous of [false, true]) {
  const name = previous ? 'previous' : 'current',
    entry = resolve(directory, `${name}.tsx`)
  await writeFile(entry, "import '../../scripts/tileset-remap-entry';")
  const result = await Bun.build({
    entrypoints: [entry],
    outdir: directory,
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: previous ? [oldWidget] : [],
  })
  if (!result.success) throw new AggregateError(result.logs, 'A tira de peças não compilou')
}
Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/current.js' || path === '/previous.js')
      return new Response(Bun.file(resolve(directory, `.${path}`)))
    const name = path === '/previous.html' ? 'previous' : 'current'
    return new Response(
      `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>QA da coleção de peças</title><style>body{margin:16px;font:16px system-ui}button{min-width:44px;min-height:44px}canvas{image-rendering:pixelated}</style></head><body><main id="root"></main><script type="module" src="/${name}.js"></script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
