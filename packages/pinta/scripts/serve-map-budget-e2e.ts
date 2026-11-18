import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const directory = resolve(import.meta.dir, '../.cache/map-budget')
await mkdir(directory, { recursive: true })
const entry = resolve(directory, 'probe.ts')
await writeFile(
  entry,
  `import { runMapBudgetProbe } from '../../scripts/map-budget-probe';
Object.assign(window, { runMapBudgetProbe });`,
)
const built = await Bun.build({ entrypoints: [entry], target: 'browser', outdir: directory })
if (!built.success) throw new AggregateError(built.logs, 'A prova não compilou')
Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PINTA_BUDGET_PORT ?? 5403),
  fetch(request) {
    return new URL(request.url).pathname === '/probe.js'
      ? new Response(Bun.file(resolve(directory, 'probe.js')))
      : new Response(
          '<!doctype html><html lang="pt-BR"><title>Orçamento do Pinta</title><script type="module" src="/probe.js"></script><body>Prova de mapa grande</body></html>',
          { headers: { 'Content-Type': 'text/html' } },
        )
  },
})
