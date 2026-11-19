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

// Capturar a função ANTES do bundler: a minificação pode introduzir templates e
// renomear símbolos. O texto portátil deve ser estável em dev e produção.
const file = new URL('../src/studio/pinta-scene-transform.generated.ts', import.meta.url)
const source = new Bun.Transpiler({
  loader: 'js',
  minifyWhitespace: true,
  minifySyntax: false,
  minifyIdentifiers: false,
})
  .transformSync(
    [
      transformSceneSetObject,
      sceneArtFrame,
      sceneLayerState,
      sceneObjectIntersectsBox,
      sceneVisitColliders,
      sceneIntersectsBox,
      scenePlatformLanding,
      sceneMoveBox,
    ]
      .map((fn) => `var ${fn.name}=(${fn.toString()});`)
      .join(''),
  )
  .trim()
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
