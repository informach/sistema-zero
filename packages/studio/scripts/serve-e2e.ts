import { resolve } from 'node:path'
import { build, preview } from 'vite'

const packageRoot = resolve(import.meta.dir, '..')
const configFile = resolve(packageRoot, 'playground/vite.config.ts')
const port = Number(process.env.E2E_PORT ?? 5195)
const outDir = resolve(packageRoot, process.env.E2E_OUT_DIR ?? `.cache/e2e-dist-${port}`)

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`E2E_PORT inválida: ${process.env.E2E_PORT ?? ''}`)
}

await build({ configFile, build: { outDir, emptyOutDir: true } })
const server = await preview({
  configFile,
  build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true },
})
server.printUrls()
