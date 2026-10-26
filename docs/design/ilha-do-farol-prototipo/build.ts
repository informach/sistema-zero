import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gameThreeDRuntimeWithoutPlatform } from '../../../packages/studio/src/official-extensions/game-3d/runtime'
import { buildPrototype } from '../farol-antes-depois/build'

const root = resolve(import.meta.dirname, '../../..')
await mkdir(resolve(root, '.cache/ilha-do-farol'), { recursive: true })
await writeFile(resolve(root, '.cache/ilha-do-farol/runtime.js'), gameThreeDRuntimeWithoutPlatform)
const bundle = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'world.ts')],
  target: 'browser',
  minify: true,
  plugins: [
    {
      name: 'offline-three',
      setup(build) {
        build.onResolve({ filter: /^three(?:\/.*)?$/ }, (args) => ({
          path: Bun.resolveSync(args.path, resolve(root, 'packages/studio')),
        }))
      },
    },
  ],
})
if (!bundle.success) throw Error(bundle.logs.join('\n'))
const script = await bundle.outputs[0].text()
await writeFile(
  resolve(root, '.cache/ilha-do-farol/source.ts'),
  `export default ${JSON.stringify(script)}\n`,
)
await buildPrototype({
  directory: import.meta.dirname,
  title: 'A Ilha do Farol · Protótipo',
  filename: 'a-ilha-do-farol-prototipo.html',
  baseStyles: await readFile(
    resolve(import.meta.dirname, '../farol-antes-depois/styles.css'),
    'utf8',
  ),
})
