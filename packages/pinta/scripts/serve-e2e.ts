import { resolve } from 'node:path'
import { build, preview } from 'vite'

// Mesmo modo de produção e harness Playwright do Estúdio, sem HMR durante gestos.
const root = resolve(import.meta.dirname, '..')
const configFile = resolve(root, 'playground/vite.config.ts')
const port = Number(process.env.PINTA_E2E_PORT ?? 5294)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida')
const outDir = resolve(root, `.cache/e2e-dist-${port}`)
await build({ configFile, build: { outDir, emptyOutDir: true } })
const server = await preview({
  configFile,
  build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true },
})
server.printUrls()
