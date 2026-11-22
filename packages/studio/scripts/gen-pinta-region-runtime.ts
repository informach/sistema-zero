import { fileURLToPath } from 'node:url'
import { sceneObjectTransformSource } from '@sistemazero/core/studio/pinta-scene-runtime'
import { minify } from 'terser'
import { sharedRegionGeometry } from '../src/official-extensions/map-2d/regionHostSource'

const output = new URL(
  '../src/official-extensions/map-2d/regionRuntime.generated.ts',
  import.meta.url,
)
const runtime = fileURLToPath(
  new URL('../src/official-extensions/map-2d/regionRuntime.ts', import.meta.url),
)
// Check the published functions, independently of the generator's declaration syntax.
const provided: unknown = new Function(
  `${sceneObjectTransformSource};return [${sharedRegionGeometry.join(',')}];`,
)()
for (const [index, name] of sharedRegionGeometry.entries())
  if (!Array.isArray(provided) || typeof provided[index] !== 'function')
    throw new Error(`O Core não forneceu a função portátil ${name}.`)
let linkedGeometry = false
const built = await Bun.build({
  entrypoints: ['pinta-region-runtime'],
  format: 'iife',
  target: 'browser',
  // Bun assigns minified names differently across checkouts of the same sources.
  minify: { syntax: true, whitespace: true, identifiers: false },
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
const { code } = await minify(await built.outputs[0]!.text(), { compress: false, mangle: true })
if (!code) throw new Error('Falha ao compactar o runtime regional dos jogos 2D.')
const source = `var _pintaRegionFactory;${code}`
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
