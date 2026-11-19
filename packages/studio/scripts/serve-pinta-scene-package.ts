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
const root = resolve(output, 'phaser')
const resourceRoot = resolve(output, 'resources/phaser')
const physicsRoot = resolve(output, 'physics/phaser')
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 5293,
  async fetch(request) {
    const url = new URL(request.url)
    const isResource = url.pathname.startsWith('/resources/')
    const isPhysics = url.pathname.startsWith('/physics/')
    const selectedRoot = isPhysics ? physicsRoot : isResource ? resourceRoot : root
    const pathname = isPhysics
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
