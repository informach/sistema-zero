import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { build } from 'vite'

await mkdir('dist', { recursive: true })
for (const entry of ['main', 'preload', 'render-worker']) {
  const built = await Bun.build({
    entrypoints: [`src/main/${entry}.ts`],
    outdir: 'dist',
    naming: `${entry}.cjs`,
    target: 'node',
    format: 'cjs',
    packages: 'external',
    sourcemap: 'linked',
  })
  if (!built.success) throw new AggregateError(built.logs, `Falha ao construir ${entry}`)
}
await build()
await bundle({
  entryPoint: path.resolve('../marketing-production/src/entry.tsx'),
  outDir: path.resolve('dist/remotion'),
  publicDir: null,
})
console.log('Desktop e composição construídos.')
