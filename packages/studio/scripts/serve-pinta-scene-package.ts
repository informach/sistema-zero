import { resolve, sep } from 'node:path'
import { generateHomologation } from '../../pinta/scripts/homologacao/generate'
import { generateResourcePackages } from '../../pinta/scripts/homologacao/resources'

const output = resolve(import.meta.dirname, '../../../.tmp/pinta-phaser-e2e')
await generateHomologation(output)
await generateResourcePackages(resolve(output, 'resources'))
const root = resolve(output, 'phaser')
const resourceRoot = resolve(output, 'resources/phaser')
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 5293,
  async fetch(request) {
    const url = new URL(request.url)
    const isResource = url.pathname.startsWith('/resources/')
    const selectedRoot = isResource ? resourceRoot : root
    const pathname = isResource ? url.pathname.slice('/resources'.length) : url.pathname
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
