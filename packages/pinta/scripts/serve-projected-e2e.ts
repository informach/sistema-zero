import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { build, preview } from 'vite'
import { pintaWorkshopBackup } from '../src/export/workshopDocument'
import { nativeNineGallery } from '../src/testing/nativeNineFixtures'

const root = resolve(import.meta.dirname, '..')
const port = Number(process.env.PINTA_PROJECTED_PORT ?? 5586)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')
const lab = resolve(root, `.cache/projected-host-${port}`)
const outDir = resolve(root, `.cache/projected-dist-${port}`)
const configFile = resolve(root, 'playground/vite.config.ts')
await mkdir(resolve(lab, 'public'), { recursive: true })
const { sheet, authored, hex, iso } = await nativeNineGallery()
const backup = await pintaWorkshopBackup([sheet, authored, hex, iso])
if (!backup) throw Error('Fixture nativa recusada')
await writeFile(resolve(lab, 'public/fixture.json'), backup)
await writeFile(
  resolve(lab, 'index.html'),
  '<!doctype html><html lang="pt-BR"><meta name="viewport" content="width=device-width,initial-scale=1"><title>QA de projeções</title><div id="root"></div><script type="module" src="../../scripts/homologacao/projectedWorkshop.tsx"></script></html>',
)
await build({
  configFile,
  root: lab,
  publicDir: resolve(lab, 'public'),
  build: { outDir, emptyOutDir: true },
})
const server = await preview({
  configFile,
  root: lab,
  build: { outDir },
  preview: { host: '127.0.0.1', port, strictPort: true },
})
server.printUrls()
