import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const baseline = process.env.PINTA_RENDER_BASELINE
const proveRender = process.env.PINTA_RENDER_PROOF === '1'
function rendererAt(revision: string): Bun.BunPlugin {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error('Baseline deve ser SHA completo')
  const result = Bun.spawnSync(['git', 'show', `${revision}:packages/pinta/src/tiles/chunks.ts`], {
    cwd: resolve(import.meta.dir, '../../..'),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (result.exitCode !== 0) throw new Error('Renderer publicado ausente no histórico')
  const source = result.stdout.toString()
  return {
    name: 'actual-published-renderer',
    setup(build) {
      build.onLoad({ filter: /[\\/]src[\\/]tiles[\\/]chunks\.ts$/ }, (args) => ({
        contents: source,
        loader: 'ts',
        resolveDir: dirname(args.path),
      }))
    },
  }
}

const directory = resolve(import.meta.dir, '../.cache/map-budget')
await mkdir(directory, { recursive: true })
const entry = resolve(directory, 'probe.ts')
await writeFile(
  entry,
  `import { runMapBudgetProbe } from '../../scripts/map-budget-probe';
${proveRender ? "import { runMapRenderProbe } from '../../scripts/map-render-probe';" : ''}
${proveRender ? "import { runRegionRenderProbe, runDensePressureRenderProbe } from '../../scripts/region-render-probe';" : ''}
Object.assign(window, { runMapBudgetProbe${proveRender ? ', runMapRenderProbe, runRegionRenderProbe, runDensePressureRenderProbe' : ''} });`,
)
const built = await Bun.build({
  entrypoints: [entry],
  target: 'browser',
  outdir: directory,
  plugins: baseline ? [rendererAt(baseline)] : [],
})
if (!built.success) throw new AggregateError(built.logs, 'A prova não compilou')
if (proveRender) {
  const reference = resolve(directory, 'reference.ts')
  await writeFile(
    reference,
    "import { runMapRenderProbe } from '../../scripts/map-render-probe'; Object.assign(window, { referenceMapRenderProbe: runMapRenderProbe });",
  )
  const result = await Bun.build({
    entrypoints: [reference],
    target: 'browser',
    outdir: directory,
    plugins: [rendererAt('0ebb89a63c4dc0d2e078023dbcaa3cb6a42a336d')],
  })
  if (!result.success) throw new AggregateError(result.logs, 'A referência não compilou')
}
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PINTA_BUDGET_PORT ?? 5403),
  fetch(request) {
    const file = new URL(request.url).pathname
    return file === '/probe.js' || (proveRender && file === '/reference.js')
      ? new Response(Bun.file(resolve(directory, `.${file}`)))
      : new Response(
          `<!doctype html><html lang="pt-BR"><title>Orçamento do Pinta</title><script type="module" src="/probe.js"></script>${proveRender ? '<script type="module" src="/reference.js"></script>' : ''}<body>Prova de mapa grande</body></html>`,
          { headers: { 'Content-Type': 'text/html' } },
        )
  },
})
