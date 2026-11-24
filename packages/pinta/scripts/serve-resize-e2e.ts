import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const port = Number(process.env.PINTA_RESIZE_PORT ?? 5578),
  baseline = '85f8dc4a718886da3f888464108ca91e79bc9549'
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const directory = resolve(import.meta.dir, `../.cache/resize-${port}`)
await mkdir(directory, { recursive: true })
const files = new Set([
  'src/core/assetResize.ts',
  'src/tiles/tilemapOps.ts',
  'src/components/editor/mapTools/mapLevels.ts',
  'src/components/editor/ResizeAssetDialog.tsx',
  'src/components/editor/EditorScreen.tsx',
])
const old: Bun.BunPlugin = {
  name: 'previous-resize',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/].*\.tsx?$/ }, (args) => {
      const path = args.path.replaceAll('\\', '/').split('/packages/pinta/')[1]
      if (!path || !files.has(path)) return undefined
      const result = Bun.spawnSync(['git', 'show', `${baseline}:packages/pinta/${path}`], {
        cwd: resolve(import.meta.dir, '../../..'),
        stdout: 'pipe',
        stderr: 'pipe',
      })
      if (result.exitCode !== 0) throw Error('Fonte histórica ausente')
      return {
        contents: result.stdout.toString(),
        loader: path.endsWith('tsx') ? 'tsx' : 'ts',
        resolveDir: dirname(args.path),
      }
    })
  },
}
for (const previous of [false, true]) {
  const name = previous ? 'previous' : 'current',
    entry = resolve(directory, `${name}.tsx`)
  await writeFile(entry, "import '../../scripts/resize-entry';")
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: directory,
    define: { 'process.env.NODE_ENV': '"production"' },
    plugins: previous ? [old] : [],
  })
  if (!result.success) throw new AggregateError(result.logs, 'O editor não compilou')
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
      `<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>QA de tamanho</title><style>button{min-width:44px;min-height:44px}body{font:16px system-ui}</style></head><body><main id="root"></main><script type="module" src="/${name}.js"></script></body></html>`,
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
