import { mkdir } from 'node:fs/promises'
import manifest from '../package.json'

await mkdir('.cache/tests', { recursive: true })
const built = await Bun.build({
  entrypoints: ['tests-node/sync.node.ts'],
  outdir: '.cache/tests',
  naming: 'sync.cjs',
  target: 'node',
  format: 'cjs',
  // Match production: Node cannot resolve extensionless TS imports in workspace packages.
  external: Object.entries(manifest.dependencies)
    .filter(([, version]) => !version.startsWith('workspace:'))
    .map(([name]) => name),
})
if (!built.success) throw new AggregateError(built.logs, 'Falha ao construir testes SQLite')
const child = Bun.spawn(['node', '--test', '.cache/tests/sync.cjs'], {
  stdout: 'inherit',
  stderr: 'inherit',
})
process.exit(await child.exited)
