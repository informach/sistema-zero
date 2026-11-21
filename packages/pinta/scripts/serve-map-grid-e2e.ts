import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const port = Number(process.env.PINTA_MAP_GRID_PORT ?? 5560),
  baseline = process.env.PINTA_MAP_GRID_BASELINE ?? '0e377ac1b25f7fa1073e02dca048f12de4a278a7',
  module = process.env.PINTA_MAP_GRID_MODULE ?? 'canvas',
  directory = resolve(import.meta.dir, `../.cache/map-grid-${port}`)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
if (!/^[a-f0-9]{40}$/.test(baseline) || !['canvas', 'cache'].includes(module))
  throw Error('Fonte anterior inválida')
await mkdir(directory, { recursive: true })
const published: Bun.BunPlugin = {
  name: 'previous-map-canvas',
  setup(build) {
    build.onLoad(
      {
        filter:
          module === 'cache'
            ? /[\\/]src[\\/]tiles[\\/]chunks\.ts$/
            : /[\\/]src[\\/]components[\\/]editor[\\/]mapTools[\\/]mapCanvas\.ts$/,
      },
      (args) => {
        const file = args.path.replaceAll('\\', '/').split('/packages/pinta/')[1],
          result = Bun.spawnSync(['git', 'show', `${baseline}:packages/pinta/${file}`], {
            cwd: resolve(import.meta.dir, '../../..'),
            stdout: 'pipe',
            stderr: 'pipe',
          })
        if (result.exitCode !== 0) throw Error('Fonte histórica ausente')
        return { contents: result.stdout.toString(), loader: 'ts', resolveDir: dirname(args.path) }
      },
    )
  },
}
for (const historical of [false, true]) {
  const name = historical ? 'reference' : 'current',
    entry = resolve(directory, `${name}.ts`)
  await writeFile(
    entry,
    `import * as bench from '../../scripts/map-grid-probe';import {runGridEdgeProbe} from '../../scripts/map-grid-edge-probe';import {runMapGeometryLegacyProbe,runMapGeometryRegionProbe} from '../../scripts/map-geometry-probe';Object.assign(window,{mapGrid${historical ? 'Reference' : 'Current'}:{...bench,runGridEdgeProbe,runMapGeometryLegacyProbe,runMapGeometryRegionProbe}});`,
  )
  const result = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: directory,
    plugins: historical ? [published] : [],
  })
  if (!result.success) throw new AggregateError(result.logs, 'Prova da grade não compilou')
}
Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const path = new URL(request.url).pathname
    return path === '/current.js' || path === '/reference.js'
      ? new Response(Bun.file(resolve(directory, `.${path}`)))
      : new Response(
          '<!doctype html><html><title>QA grade</title><script type="module" src="/current.js"></script><script type="module" src="/reference.js"></script><body>Grade e canvas reais do Pinta</body></html>',
          { headers: { 'Content-Type': 'text/html' } },
        )
  },
})
