import { execFileSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build, type Plugin, preview } from 'vite'

const root = resolve(import.meta.dirname, '..'),
  port = Number(process.env.PINTA_BRUSH_PORT ?? 5533)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const lab = resolve(root, `.cache/brush-host-${port}`),
  configFile = resolve(root, 'playground/vite.config.ts'),
  outDir = resolve(root, `.cache/brush-dist-${port}`)
await mkdir(lab, { recursive: true })
await writeFile(
  resolve(lab, 'index.html'),
  '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA de pincéis</title><div id="root"></div><script type="module" src="../../scripts/homologacao/brushGestures.tsx"></script></html>',
)
const baseline = process.env.PINTA_BRUSH_BASELINE,
  plugins: Plugin[] = []
if (baseline) {
  if (!/^[a-f0-9]{40}$/.test(baseline)) throw Error('Baseline deve ser SHA completo')
  const source = execFileSync(
    'git',
    ['show', `${baseline}:packages/pinta/src/components/editor/mapTools/tileGestures.ts`],
    { cwd: resolve(root, '../..'), encoding: 'utf8' },
  )
  plugins.push({
    name: 'historical-gesture-controller',
    enforce: 'pre',
    load(id) {
      return id.replaceAll('\\', '/').endsWith('/src/components/editor/mapTools/tileGestures.ts')
        ? source
        : null
    },
  })
}
await build({ configFile, root: lab, plugins, build: { outDir, emptyOutDir: true } })
const server = await preview({
  configFile,
  root: lab,
  build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true },
})
server.printUrls()
