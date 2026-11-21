import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const port = Number(process.env.PINTA_MEMORY_PORT ?? 5570)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const directory = resolve(import.meta.dir, `../.cache/memory-regions-${port}`)
const baseline = '52ca47bbd345fb0968bd882aec904da59b735270'
const previousFiles = new Set([
  'src/core/assetMemory.ts',
  'src/core/mapResourceVersions.ts',
  'src/core/project.ts',
  'src/state/editorStore.ts',
  'src/tiles/resourceVersions.ts',
])
const historical: Bun.BunPlugin = {
  name: 'previous-memory-contract',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/](core|state|tiles)[\\/].*\.ts$/ }, (args) => {
      const path = args.path.replaceAll('\\', '/').split('/packages/pinta/')[1]
      if (!path || !previousFiles.has(path)) return undefined
      const result = Bun.spawnSync(['git', 'show', `${baseline}:packages/pinta/${path}`], {
        cwd: resolve(import.meta.dir, '../../..'),
        stdout: 'pipe',
        stderr: 'pipe',
      })
      if (result.exitCode !== 0) throw Error('Fonte histórica ausente')
      return { contents: result.stdout.toString(), loader: 'ts', resolveDir: dirname(args.path) }
    })
  },
}
await mkdir(directory, { recursive: true })
for (const previous of [false, true]) {
  const name = previous ? 'previous' : 'current',
    entry = resolve(directory, `${name}.ts`)
  await writeFile(
    entry,
    `import {runMemoryRegionsProbe} from '../../scripts/memory-regions-probe';Object.assign(window,{memory${previous ? 'Previous' : 'Current'}:runMemoryRegionsProbe});`,
  )
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: directory,
    plugins: previous ? [historical] : [],
  })
  if (!result.success) throw new AggregateError(result.logs, 'Prova de memória não compilou')
}
Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const path = new URL(request.url).pathname
    if (path === '/current.js' || path === '/previous.js')
      return new Response(Bun.file(resolve(directory, `.${path}`)))
    return new Response(
      '<!doctype html><html lang="pt-BR"><title>Histórico por regiões</title><script type="module" src="/current.js"></script><script type="module" src="/previous.js"></script><body>QA do núcleo de memória; formato 8 interno.</body></html>',
      { headers: { 'Content-Type': 'text/html' } },
    )
  },
})
