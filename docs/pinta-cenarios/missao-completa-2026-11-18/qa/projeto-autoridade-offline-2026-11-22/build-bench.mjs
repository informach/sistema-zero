import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const build = await Bun.build({
  entrypoints: [fileURLToPath(new URL('bench-scene.mjs', import.meta.url))],
  target: 'browser',
  format: 'esm',
  plugins: [
    {
      name: 'workspace-core',
      setup(b) {
        b.onResolve({ filter: /^@sistemazero\/core\/studio\// }, ({ path }) => ({
          path: resolve(root, 'packages/core/src/studio', path.split('/').at(-1) + '.ts'),
        }))
      },
    },
  ],
})
if (!build.success) throw new AggregateError(build.logs, 'Falha ao compilar a sonda')
await Bun.write(process.argv[2], build.outputs[0])
