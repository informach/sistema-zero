import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const directory = resolve(import.meta.dir, '../.cache/map-images-regions'),
  baseline = '79ee6613091988b271d026b6923124ef9cb9dd74'
await mkdir(directory, { recursive: true })
const published: Bun.BunPlugin = {
  name: 'actual-historical-map-images',
  setup(build) {
    build.onLoad({ filter: /[\\/]src[\\/]tiles[\\/]render(?:Vector)?Tilemap\.ts$/ }, (args) => {
      const file = args.path.replaceAll('\\', '/').split('/packages/pinta/')[1]
      const result = Bun.spawnSync(['git', 'show', `${baseline}:packages/pinta/${file}`], {
        cwd: resolve(import.meta.dir, '../../..'),
        stdout: 'pipe',
        stderr: 'pipe',
      })
      if (result.exitCode !== 0) throw Error('Fonte histórica ausente')
      return { contents: result.stdout.toString(), loader: 'ts', resolveDir: dirname(args.path) }
    })
  },
}
for (const reference of [false, true]) {
  const entry = resolve(directory, `${reference ? 'reference' : 'current'}.ts`)
  await writeFile(
    entry,
    `import { runMapImageProbe, runWorldMapImageProbe } from '../../scripts/map-images-regions-probe'; Object.assign(window, { ${reference ? 'referenceMapImageProbe' : 'runMapImageProbe'}: runMapImageProbe${reference ? '' : ', runWorldMapImageProbe'} });`,
  )
  const built = await Bun.build({
    entrypoints: [entry],
    target: 'browser',
    outdir: directory,
    plugins: reference ? [published] : [],
  })
  if (!built.success) throw new AggregateError(built.logs, 'A prova de imagens não compilou')
}
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PINTA_MAP_IMAGES_PORT ?? 5530),
  fetch(request) {
    const path = new URL(request.url).pathname
    return path === '/current.js' || path === '/reference.js'
      ? new Response(Bun.file(resolve(directory, `.${path}`)))
      : new Response(
          '<!doctype html><html lang="pt-BR"><title>QA imagens de regiões</title><script type="module" src="/current.js"></script><script type="module" src="/reference.js"></script><body>Prova de imagens do Pinta</body></html>',
          { headers: { 'Content-Type': 'text/html' } },
        )
  },
})
