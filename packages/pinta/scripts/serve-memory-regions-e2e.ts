import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const port = Number(process.env.PINTA_MEMORY_PORT ?? 5570)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const directory = resolve(import.meta.dir, `../.cache/memory-regions-${port}`)
const probe = process.env.PINTA_MEMORY_PROBE ?? 'memory'
if (probe !== 'memory' && probe !== 'layers' && probe !== 'queries' && probe !== 'metadata')
  throw Error('Laboratório inválido')
const selected =
  probe === 'metadata'
    ? {
        baseline: '36c3ab7a826d8f5150ed73e41120e859613548af',
        entry: 'metadata-regions-probe',
        fn: 'runMetadataRegionsProbe',
        global: 'metadata',
        files: ['src/core/project.ts', 'src/state/editorStore.ts'],
      }
    : probe === 'queries'
      ? {
          baseline: 'dd34e6f99b00a7e219c67e63e4535312d0a2a2da',
          entry: 'queries-regions-probe',
          fn: 'runQueriesRegionsProbe',
          global: 'queries',
          files: ['src/tiles/tilemapOps.ts'],
        }
      : probe === 'layers'
        ? {
            baseline: 'ed3b3a24bb8a225ed7aafafc3f7dca232706fc28',
            entry: 'layers-regions-probe',
            fn: 'runLayerRegionsProbe',
            global: 'layers',
            files: ['src/core/project.ts', 'src/tiles/layerTree.ts', 'src/tiles/tilemapOps.ts'],
          }
        : {
            baseline: '52ca47bbd345fb0968bd882aec904da59b735270',
            entry: 'memory-regions-probe',
            fn: 'runMemoryRegionsProbe',
            global: 'memory',
            files: [
              'src/core/assetMemory.ts',
              'src/core/mapResourceVersions.ts',
              'src/core/project.ts',
              'src/state/editorStore.ts',
              'src/tiles/resourceVersions.ts',
            ],
          }
const baseline = selected.baseline,
  previousFiles = new Set(selected.files)
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
    `import {${selected.fn}} from '../../scripts/${selected.entry}';Object.assign(window,{${selected.global}${previous ? 'Previous' : 'Current'}:${selected.fn}});`,
  )
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: directory,
    plugins: previous ? [historical] : [],
  })
  if (!result.success) throw new AggregateError(result.logs, 'Laboratório de regiões não compilou')
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
