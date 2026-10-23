import { createHash } from 'node:crypto'
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const packageDirectory = dirname(fileURLToPath(new URL('../package.json', import.meta.url)))
const publicDirectory = resolve(process.cwd(), 'public')
const target = resolve(process.cwd(), process.argv[2] ?? 'public/live-camera')
const withinPublic = relative(publicDirectory, target)
if (!withinPublic || withinPublic.startsWith('..') || isAbsolute(withinPublic))
  throw new Error(
    'Live camera assets must be written to a directory inside this app public directory',
  )

const source = dirname(require.resolve('@mediapipe/tasks-vision'))
const metadata = JSON.parse(await readFile(join(source, 'package.json'), 'utf8'))
if (metadata.version !== '1.1.0')
  throw new Error('Review live camera assets before upgrading MediaPipe')
const model = join(packageDirectory, 'assets/live-camera/selfie_segmenter_landscape.tflite')
const checksum = createHash('sha256')
  .update(await readFile(model))
  .digest('hex')
if (checksum !== '490e9ea734313e0de10fa0cd9e3c6133e36ea4db2b7a49bde9ef019f72796b8e')
  throw new Error('The approved live camera model checksum does not match')

await mkdir(target, { recursive: true })
const names = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]
for (const name of names)
  await copyFile(require.resolve(`@mediapipe/tasks-vision/${name}`), join(target, name))
await copyFile(model, join(target, 'selfie_segmenter_landscape.tflite'))
for (const name of ['LICENSE-2.0.txt', 'NOTICE.md'])
  await copyFile(join(packageDirectory, 'assets/live-camera', name), join(target, name))
console.log('Live camera: synchronized MediaPipe 1.1.0, approved model and license notices.')
