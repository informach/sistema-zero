import { createHash } from 'node:crypto'
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { bundle } from '@remotion/bundler'
import { build } from 'vite'
import manifest from '../package.json'
import { bundleHash } from '../src/main/media/render-identity'
import { nativeExternals } from './node-externals'

await mkdir('dist', { recursive: true })
await mkdir('dist/licenses', { recursive: true })
for (const font of ['nunito', 'baloo-2'])
  await copyFile(
    path.resolve(`node_modules/@fontsource/${font}/LICENSE`),
    path.resolve(`dist/licenses/${font}-OFL.txt`),
  )
for (const file of await readdir('../studio/src/official-extensions/fonts')) {
  if (/license|ofl/i.test(file))
    await copyFile(
      path.resolve('../studio/src/official-extensions/fonts', file),
      path.resolve('dist/licenses', `studio-${file}`),
    )
}
for (const entry of ['main', 'preload', 'render-worker']) {
  const built = await Bun.build({
    entrypoints: [`src/main/${entry}.ts`],
    outdir: 'dist',
    naming: `${entry}.cjs`,
    target: 'node',
    format: 'cjs',
    external: nativeExternals,
    sourcemap: 'linked',
  })
  if (!built.success) throw new AggregateError(built.logs, `Falha ao construir ${entry}`)
}
await build()
await build({ configFile: 'vite.capture.config.ts' })
await import('./build-capture-vendor')
await bundle({
  entryPoint: path.resolve('../marketing-production/src/entry.tsx'),
  outDir: path.resolve('dist/remotion'),
  publicDir: null,
})
console.log('Desktop e composição construídos.')
await writeFile(
  'dist/render-engine.json',
  JSON.stringify({
    name: 'remotion',
    version: manifest.dependencies.remotion,
    bundleSha256: await bundleHash(path.resolve('dist/remotion')),
    workerSha256: createHash('sha256')
      .update(await readFile('dist/render-worker.cjs'))
      .digest('hex'),
    platform: process.platform,
    architecture: process.arch,
  }),
)
