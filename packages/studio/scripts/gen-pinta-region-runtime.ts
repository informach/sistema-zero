import { fileURLToPath } from 'node:url'
import { sceneObjectTransformSource } from '@sistemazero/core/studio/pinta-scene-runtime'
import { sharedRegionGeometry } from '../src/official-extensions/map-2d/regionHostSource'

const output = new URL(
  '../src/official-extensions/map-2d/regionRuntime.generated.ts',
  import.meta.url,
)
const runtime = fileURLToPath(
  new URL('../src/official-extensions/map-2d/regionRuntime.ts', import.meta.url),
)
for (const name of sharedRegionGeometry)
  if (!sceneObjectTransformSource.includes(`var ${name}=`))
    throw new Error(`O Core não forneceu a função portátil ${name}.`)
let linkedGeometry = false
const built = await Bun.build({
  entrypoints: ['pinta-region-runtime'],
  format: 'iife',
  target: 'browser',
  minify: true,
  plugins: [
    {
      name: 'pinta-region-factory',
      setup(build) {
        build.onResolve({ filter: /^\.\/pinta-scene-geometry$/ }, () => ({
          path: 'pinta-scene-geometry',
          namespace: 'pinta-region-shared',
        }))
        build.onLoad({ filter: /.*/, namespace: 'pinta-region-shared' }, () => {
          linkedGeometry = true
          return {
            contents: sharedRegionGeometry
              .map((key) => `export const ${key}=_pintaSharedSceneGeometry.${key};`)
              .join(''),
            loader: 'js',
          }
        })
        build.onResolve({ filter: /^pinta-region-runtime$/ }, () => ({
          path: 'pinta-region-runtime',
          namespace: 'pinta-region-factory',
        }))
        build.onLoad({ filter: /.*/, namespace: 'pinta-region-factory' }, () => ({
          contents: `import {createRegionMap2D} from ${JSON.stringify(runtime.replaceAll('\\', '/'))};_pintaRegionFactory=createRegionMap2D;`,
          loader: 'js',
        }))
      },
    },
  ],
})
if (!built.success || built.outputs.length !== 1 || !linkedGeometry)
  throw new Error('Falha ao compor o runtime regional dos jogos 2D.', { cause: built.logs })
const source = `var _pintaRegionFactory;${(await built.outputs[0]!.text()).trim()}`
const literal = `'${JSON.stringify(source)
  .slice(1, -1)
  .replaceAll('\\"', '"')
  .replaceAll("'", "\\'")
  // Preserve the bundled template syntax inside the outer TS string literal.
  .replaceAll('${', '\\u0024{')}'`
const content = `// Gerado por scripts/gen-pinta-region-runtime.ts. Não editar.\nexport const regionMap2DRuntime =\n  ${literal}\n`
if (process.argv.includes('--check')) {
  if ((await Bun.file(output).text()) !== content)
    throw new Error('Rode bun packages/studio/scripts/gen-pinta-region-runtime.ts')
} else await Bun.write(output, content)
