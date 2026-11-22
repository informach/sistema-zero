/**
 * Prova do jogo D no navegador (lote 8 da conclusão do plano do Estúdio, 22/11/2026). O exemplo
 * "Mundo das Portas", montado pelo MESMO caminho do clique na galeria (`buildProjectFromKitEntry`),
 * vira a prévia (política `strict`) e o site exportado (`buildClassicFileMap`), mais uma variante
 * com uma porta para um desenho que não existe e o `.szproject.json` que a prova do editor importa
 * no Estúdio do playground. O e2e `e2e/jogo-d.flow.ts` abre os quatro.
 *
 * O programa da prova ganha UMA linha a mais no fim do "Ao iniciar", só de leitura: a sonda que
 * deixa o robô saber onde o herói está (`window.__jogoD`). O resto é o jogo como a criança o abre.
 * No molde de `serve-scene2d-export-proof.ts`.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

const NativeResponse = globalThis.Response
GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })

const { buildClassicFileMap } = await import('../src/export/fileMap')
const { identityMinifiers } = await import('../src/export/minify')
const { renderProjectToPreviewDocAsync } = await import('../src/preview/renderProject')
const { jogoDExample } = await import('../src/examples/jogoDExample')
const { buildProjectFromKitEntry } = await import('../src/projects/KitGallery')

const root = resolve(import.meta.dirname, '..')
const output = resolve(root, '.cache/mission/jogo-d-proof')
const port = Number(process.env.JOGO_D_PROOF_PORT ?? 5421)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw Error('Porta inválida')

const SONDA =
  'window.__jogoD = { jogador, lugar: () => lugar, regiao: () => regiao, pontos: () => pontos, pegos: () => pegos.length, vivas: () => moedas.items.length + inimigos.items.length + baus.items.length, moedas: () => moedas.items.map((m) => [m.x + m.w / 2, m.y + m.h / 2]) };'

function projeto(assets = jogoDExample.assets ?? [], comSonda = true) {
  const ir = structuredClone(jogoDExample.ir)
  if (comSonda) ir.behavior.start.push({ type: 'rawJS', advanced: true, code: SONDA })
  return buildProjectFromKitEntry({
    key: `game-2d:${jogoDExample.name}`,
    name: jogoDExample.name,
    description: jogoDExample.description ?? '',
    ir,
    assets,
    emoji: '',
    experience: jogoDExample.experience,
  })
}

async function exportar(destino: string, project: ReturnType<typeof projeto>) {
  const exported = await buildClassicFileMap(project, identityMinifiers)
  for (const [path, content] of Object.entries(exported.files)) {
    const arquivo = resolve(destino, path)
    if (!arquivo.startsWith(destino + sep)) throw Error('Caminho inválido')
    await mkdir(resolve(arquivo, '..'), { recursive: true })
    await writeFile(arquivo, content)
  }
}

await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
const normal = projeto()
const cenas = (normal.assets ?? []).flatMap((a) => (a.scene ? [a.scene] : []))
const objetos = cenas.flatMap((s) =>
  s.layers.flatMap((l) =>
    l.kind === 'objects' ? l.objects.map((o) => ({ ...o, cena: s.id })) : [],
  ),
)
await writeFile(
  resolve(output, 'expected.json'),
  JSON.stringify({
    example: jogoDExample.name,
    cenas: cenas.map((s) => ({
      id: s.id,
      largura: s.cols * s.tileSize,
      altura: s.rows * s.tileSize,
    })),
    // O que o robô visita: as seis regiões e as portas de cada lugar (com a chegada).
    regioes: objetos
      .filter((o) => o.role === 'region')
      .map((o) => ({ nome: o.name, x: o.x + o.width / 2, y: o.y + o.height / 2 })),
    portas: objetos
      .filter((o) => o.role === 'door')
      .map((o) => ({
        id: o.id,
        cena: o.cena,
        x: o.x + o.width / 2,
        y: o.y + o.height / 2,
        destino: o.properties.destino,
      })),
    camas: objetos
      .filter((o) => o.type === 'cama')
      .map((o) => ({ cena: o.cena, x: o.x + o.width / 2, y: o.y + o.height / 2 })),
  }),
)
await writeFile(
  resolve(output, 'preview.html'),
  await renderProjectToPreviewDocAsync(normal, { securityProfile: 'strict' }),
)
await exportar(resolve(output, 'export'), normal)
// O projeto que a criança leva para o Estúdio (sem a sonda): a prova do editor o importa.
await writeFile(
  resolve(output, 'jogo-d.szproject.json'),
  JSON.stringify(projeto(jogoDExample.assets ?? [], false)),
)
// A variante quebrada: a porta da casa 4 leva a um desenho que não existe.
const quebrados = structuredClone(normal.assets ?? [])
for (const a of quebrados)
  for (const l of a.scene?.layers ?? [])
    if (l.kind === 'objects')
      for (const o of l.objects)
        if (o.id === 'porta-casa-4') o.properties = { ...o.properties, destino: 'jogo-d-sumida' }
await exportar(resolve(output, 'quebrado'), projeto(quebrados))

Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(request) {
    const path = decodeURIComponent(new URL(request.url).pathname)
    // O ícone vazio evita o pedido do /favicon.ico (um 404 no console sem relação com a prova).
    if (path === '/')
      return new NativeResponse(
        '<!doctype html><html><head><link rel="icon" href="data:,"></head><body></body></html>',
        { headers: { 'Content-Type': 'text/html' } },
      )
    const target = resolve(output, `.${path}`)
    if (!target.startsWith(output + sep)) return new NativeResponse('Forbidden', { status: 403 })
    const file = Bun.file(target)
    return (await file.exists())
      ? new NativeResponse(file)
      : new NativeResponse('Not found', { status: 404 })
  },
})
console.log(`Prova do jogo D: http://127.0.0.1:${port}`)
