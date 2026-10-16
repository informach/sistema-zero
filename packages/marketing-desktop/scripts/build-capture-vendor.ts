import { createRequire } from 'node:module'
import path from 'node:path'

const studioRequire = createRequire(path.resolve('../studio/package.json'))
const options = {
  outdir: 'dist/capture/vendor',
  target: 'browser' as const,
  format: 'esm' as const,
  minify: true,
}
const core = await Bun.build({
  ...options,
  entrypoints: [path.join(path.dirname(studioRequire.resolve('three')), 'three.module.js')],
  naming: 'three.js',
})
if (!core.success) throw new AggregateError(core.logs, 'Falha ao incorporar Three')
const addons = await Bun.build({
  ...options,
  entrypoints: ['GLTFLoader', 'HDRLoader'].map((name) =>
    studioRequire.resolve(`three/addons/loaders/${name}.js`),
  ),
  naming: '[name].js',
  external: ['three'],
  splitting: true,
})
if (!addons.success)
  throw new AggregateError(addons.logs, 'Falha ao incorporar os loaders do Studio')
