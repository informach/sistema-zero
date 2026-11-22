import {
  sceneIntersectsBox,
  sceneMoveBox,
  sceneObjectIntersectsBox,
  scenePlatformLanding,
  sceneVisitColliders,
} from '../src/studio/pinta-scene-geometry'
import {
  sceneArtFrame,
  sceneLayerState,
  transformSceneSetObject,
} from '../src/studio/pinta-scene-runtime'

// Capture authoritative functions before bundling. Only this controlled build
// shortens local identifiers; explicit aliases preserve the portable API names.
// No imports/editor dependency may enter the generated closure.
const file = new URL('../src/studio/pinta-scene-transform.generated.ts', import.meta.url)
const functions = [
  transformSceneSetObject,
  sceneArtFrame,
  sceneLayerState,
  sceneObjectIntersectsBox,
  sceneVisitColliders,
  sceneIntersectsBox,
  scenePlatformLanding,
  sceneMoveBox,
]
const contents =
  functions.map((fn) => `var ${fn.name}=(${fn.toString()});`).join('') +
  `__pintaSceneExports={${functions.map((fn) => fn.name).join(',')}};`
const built = await Bun.build({
  entrypoints: ['pinta-scene-virtual'],
  format: 'iife',
  target: 'browser',
  minify: { whitespace: true, identifiers: true, syntax: false },
  plugins: [
    {
      name: 'pinta-scene-source',
      setup(build) {
        build.onResolve({ filter: /^pinta-scene-virtual$/ }, () => ({
          path: 'pinta-scene-virtual',
          namespace: 'pinta-scene',
        }))
        build.onLoad({ filter: /.*/, namespace: 'pinta-scene' }, () => ({ contents, loader: 'js' }))
      },
    },
  ],
})
if (!built.success || built.outputs.length !== 1)
  throw new Error('Falha ao compor geometria portátil.', { cause: built.logs })
const source =
  'var __pintaSceneExports;' +
  (await built.outputs[0]!.text()).trim() +
  functions.map((fn) => `var ${fn.name}=__pintaSceneExports.${fn.name};`).join('') +
  '__pintaSceneExports=undefined;'
if (source.includes('`')) throw new Error('O compositor portátil exige fonte sem templates.')
// Match the repository formatter at generation time. JSON escapes embedded double
// quotes; the single-quoted TS literal only needs those escapes removed and its
// own apostrophes escaped. The exported runtime string remains byte-identical.
const literal = `'${JSON.stringify(source).slice(1, -1).replaceAll('\\"', '"').replaceAll("'", "\\'")}'`
if (process.argv.includes('--check')) {
  const saved = await import(file.href)
  if (saved.sceneObjectTransformSource !== source) {
    console.error('Rode bun packages/core/scripts/gen-pinta-scene-transform.ts')
    process.exit(1)
  }
} else {
  await Bun.write(
    file,
    `// Gerado por scripts/gen-pinta-scene-transform.ts. Não editar.\nexport const sceneObjectTransformSource =\n  ${literal}\n`,
  )
}
