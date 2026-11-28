import { resolve, sep } from 'node:path'
import { generateHomologation } from '../../pinta/scripts/homologacao/generate'
import { generateResourcePackages } from '../../pinta/scripts/homologacao/resources'

const output = resolve(import.meta.dirname, '../../../.tmp/pinta-phaser-e2e')
await generateHomologation(output)
await generateResourcePackages(resolve(output, 'resources'))
const physics = Bun.spawn(
  [
    process.execPath,
    resolve(import.meta.dirname, '../../pinta/scripts/homologacao/physics.ts'),
    resolve(output, 'physics'),
    '--objects',
  ],
  { stdout: 'inherit', stderr: 'inherit' },
)
if ((await physics.exited) !== 0) throw new Error('A geração do cenário físico falhou.')
const platforms = Bun.spawn(
  [
    process.execPath,
    resolve(import.meta.dirname, '../../pinta/scripts/homologacao/platforms.ts'),
    resolve(output, 'platforms'),
  ],
  { stdout: 'inherit', stderr: 'inherit' },
)
if ((await platforms.exited) !== 0) throw new Error('A geração das plataformas falhou.')
const qa = await Bun.build({
  entrypoints: [
    resolve(import.meta.dirname, '../../pinta/scripts/homologacao/regionalGeometryFixture.ts'),
  ],
  target: 'browser',
  format: 'esm',
  minify: true,
})
if (!qa.success || qa.outputs.length !== 1)
  throw new Error('O módulo de consultas da homologação não compilou.')
const root = resolve(output, 'phaser')
const resourceRoot = resolve(output, 'resources/phaser')
const physicsRoot = resolve(output, 'physics/phaser')
const platformRoot = resolve(output, 'platforms/phaser')
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 5293,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/qa-scene.js')
      return new Response(qa.outputs[0], { headers: { 'content-type': 'text/javascript' } })
    const isResource = url.pathname.startsWith('/resources/')
    const isPhysics = url.pathname.startsWith('/physics/')
    const isPlatform = url.pathname.startsWith('/platforms/')
    const selectedRoot = isPlatform
      ? platformRoot
      : isPhysics
        ? physicsRoot
        : isResource
          ? resourceRoot
          : root
    const pathname = isPlatform
      ? url.pathname.slice('/platforms'.length)
      : isPhysics
        ? url.pathname.slice('/physics'.length)
        : isResource
          ? url.pathname.slice('/resources'.length)
          : url.pathname
    if (url.pathname === '/physics-probes.json')
      return new Response(Bun.file(resolve(output, 'physics/physics-probes.json')))
    const path = resolve(
      selectedRoot,
      `.${decodeURIComponent(pathname === '/' ? '/index.html' : pathname)}`,
    )
    if (!path.startsWith(selectedRoot + sep))
      return new Response('Caminho inválido', { status: 400 })
    const file = Bun.file(path)
    return (await file.exists())
      ? new Response(file)
      : new Response('Não encontrado', { status: 404 })
  },
})
console.log(`Pacote Phaser real: ${server.url}`)
