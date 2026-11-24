import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const port = Number(process.env.PINTA_MAP_GEOMETRY_PORT ?? 5543),
  baseline = '27d4e81534efd32f0a246ce708c02513039506a4',
  directory = resolve(import.meta.dir, `../.cache/map-geometry-${port}`)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
await mkdir(directory, { recursive: true })
const published: Bun.BunPlugin = {
  name: 'actual-historical-map-geometry',
  setup(build) {
    build.onLoad(
      {
        filter:
          /[\\/]src[\\/](?:components[\\/]editor[\\/]mapTools[\\/](?:mapCanvas|mapViewport)|tiles[\\/](?:libraryPlacement|cellGeometry))\.ts$/,
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
    `import { runMapGeometryLegacyProbe, runMapGeometryRegionProbe } from '../../scripts/map-geometry-probe'; Object.assign(window, { ${historical ? 'referenceMapGeometryLegacyProbe: runMapGeometryLegacyProbe' : 'runMapGeometryLegacyProbe, runMapGeometryRegionProbe'} });`,
  )
  const built = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: directory,
    plugins: historical ? [published] : [],
  })
  if (!built.success) throw new AggregateError(built.logs, 'A prova de geometria não compilou')
}
Bun.serve({
  hostname: '127.0.0.1',
  port,
  fetch(request) {
    const path = new URL(request.url).pathname
    return path === '/current.js' || path === '/reference.js'
      ? new Response(Bun.file(resolve(directory, `.${path}`)))
      : new Response(
          '<!doctype html><html lang="pt-BR"><title>QA de geometria</title><script type="module" src="/current.js"></script><script type="module" src="/reference.js"></script><body>Canvas e geometria do Pinta</body></html>',
          { headers: { 'Content-Type': 'text/html' } },
        )
  },
})
