import { resolve } from 'node:path'
import { build, preview } from 'vite'

const root = resolve(import.meta.dirname, '..')
const configFile = resolve(root, 'playground/pinta-integration/vite.config.ts')
const port = Number(process.env.PINTA_INTEGRATION_PORT ?? 5403)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port')
const outDir = resolve(root, `.cache/pinta-integration-${port}`)
await build({ configFile, build: { outDir, emptyOutDir: true } })
const server = await preview({
  configFile,
  build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true },
})
server.printUrls()
