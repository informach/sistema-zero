/**
 * Prova da exportação de um cenário 2D real (etapa 8 da régua, 21/11/2026): o exemplo "A Vila e a
 * Floresta", com a cena do Pinta, montado pelo MESMO caminho do clique na galeria
 * (`buildProjectFromKitEntry`), vira a prévia (política `strict`) e o site exportado
 * (`buildClassicFileMap`). O e2e `e2e/scene2d-export.flow.ts` abre os dois e pergunta ao próprio
 * runtime pela cena. No molde de `serve-scene3d-public-proof.ts`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

const NativeResponse = globalThis.Response
GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })

const { buildClassicFileMap } = await import('../src/export/fileMap')
const { identityMinifiers } = await import('../src/export/minify')
const { renderProjectToPreviewDocAsync } = await import('../src/preview/renderProject')
const { gameTwoDExamples } = await import('../src/official-extensions/game-2d/exampleCatalog')
const { buildProjectFromKitEntry } = await import('../src/projects/KitGallery')

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '.cache/mission/scene2d-export-proof')
const port = Number(process.env.SCENE2D_PROOF_PORT ?? 5418)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')

const example = gameTwoDExamples.find((item) => item.assets?.some((asset) => asset.scene))
if (!example) throw Error('A galeria do Jogo 2D não tem mais o exemplo com cena do Pinta.')
const project = buildProjectFromKitEntry({
  key: `game-2d:${example.name}`,
  name: example.name,
  description: example.description ?? '',
  ir: example.ir,
  assets: example.assets,
  emoji: '',
  experience: example.experience,
})
const map = project.assets?.find((asset) => asset.scene?.id === 'vila-e-floresta')?.scene
if (!map) throw Error('O exemplo não traz a cena vila-e-floresta.')
const objects = map.layers.flatMap((layer) => (layer.kind === 'objects' ? layer.objects : []))

await mkdir(output, { recursive: true })
await writeFile(
  resolve(output, 'expected.json'),
  JSON.stringify({
    example: example.name,
    width: map.cols * map.tileSize,
    height: map.rows * map.tileSize,
    objects: objects.map((object) => object.name).sort(),
    layers: map.layers.length,
  }),
)
await writeFile(
  resolve(output, 'preview.html'),
  await renderProjectToPreviewDocAsync(project, { securityProfile: 'strict' }),
)
const exported = await buildClassicFileMap(project, identityMinifiers)
for (const [path, content] of Object.entries(exported.files)) {
  const destination = resolve(output, 'export', path)
  if (!destination.startsWith(resolve(output, 'export') + sep)) throw Error('Caminho inválido')
  await mkdir(resolve(destination, '..'), { recursive: true })
  await writeFile(destination, content)
}

Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname)
    // O ícone vazio evita o pedido do /favicon.ico, que o Chromium completo faz e que viraria um
    // erro de console (404) sem relação com a prova.
    if (path === '/')
      return new NativeResponse(
        '<!doctype html><html><head><link rel="icon" href="data:,"></head><body></body></html>',
        {
          headers: { 'Content-Type': 'text/html' },
        },
      )
    const target = resolve(output, `.${path}`)
    if (!target.startsWith(output + sep)) return new NativeResponse('Forbidden', { status: 403 })
    const file = Bun.file(target)
    return (await file.exists())
      ? new NativeResponse(file)
      : new NativeResponse('Not found', { status: 404 })
  },
})
console.log(`Scene 2D export proof: http://127.0.0.1:${port}`)
