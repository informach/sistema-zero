import { resolve, sep } from 'node:path'
import { generateHomologation } from '../../pinta/scripts/homologacao/generate'

const output = resolve(import.meta.dirname, '../../../.tmp/pinta-phaser-e2e')
await generateHomologation(output)
const root = resolve(output, 'phaser')
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 5293,
  async fetch(request) {
    const url = new URL(request.url)
    const path = resolve(
      root,
      `.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`,
    )
    if (!path.startsWith(root + sep)) return new Response('Caminho inválido', { status: 400 })
    const file = Bun.file(path)
    return (await file.exists())
      ? new Response(file)
      : new Response('Não encontrado', { status: 404 })
  },
})
console.log(`Pacote Phaser real: ${server.url}`)
