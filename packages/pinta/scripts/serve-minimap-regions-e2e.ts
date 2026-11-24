import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build, preview } from 'vite'

const root = resolve(import.meta.dirname, '..'),
  port = Number(process.env.PINTA_MINIMAP_REGIONS_PORT ?? 5528)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const lab = resolve(root, '.cache/minimap-regions-host'),
  configFile = resolve(root, 'playground/vite.config.ts'),
  outDir = resolve(root, `.cache/minimap-regions-dist-${port}`)
await mkdir(lab, { recursive: true })
await writeFile(
  resolve(lab, 'index.html'),
  '<!doctype html><html lang="pt-BR"><title>QA minimapa</title><div id="root"></div><script type="module" src="../../scripts/homologacao/minimapRegions.tsx"></script></html>',
)
await build({ configFile, root: lab, build: { outDir, emptyOutDir: true } })
const server = await preview({
  configFile,
  root: lab,
  build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true },
})
server.printUrls()
