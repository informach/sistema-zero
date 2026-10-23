import { mkdir } from 'node:fs/promises'
import { nativeExternals } from './node-externals'

await mkdir('.cache/tests', { recursive: true })
const built = await Bun.build({
  entrypoints: ['tests-node/sync.node.ts'],
  outdir: '.cache/tests',
  naming: 'sync.cjs',
  target: 'node',
  format: 'cjs',
  external: nativeExternals,
})
if (!built.success) throw new AggregateError(built.logs, 'Falha ao construir testes SQLite')
const child = Bun.spawn(['node', '--test', '.cache/tests/sync.cjs'], {
  stdout: 'inherit',
  stderr: 'inherit',
})
process.exit(await child.exited)
