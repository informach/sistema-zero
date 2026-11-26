/**
 * Prévia local do "Meu quarto" Kids (componentes e CSS reais, servidor de mentira), só no próprio
 * computador:
 *
 *   MORADA_QA_DIR=<pasta morada com models/ thumbs/ textures/> \
 *   ROOM_QA_AVATAR=<png da foto do avatar> bun packages/member-shell/qa/room-serve.ts
 *
 * ⚠️ As peças da Morada são pagas e NÃO entram no repositório: a pasta é uma cópia fora do git
 * (por padrão `output/morada-assets/morada`, a mesma do playground do Arquipélago).
 * `?avatar=0` abre sem a foto do avatar.
 */
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'
import {
  createMoradaHouse,
  isMoradaFile,
  MORADA_CATALOG,
  type MoradaHouse,
} from '@sistemazero/core/morada'

const root = resolve(import.meta.dir, '../../..')
const MORADA = resolve(process.env.MORADA_QA_DIR ?? resolve(root, 'output/morada-assets/morada'))
const tailwindPath = Bun.resolveSync(
  '@tailwindcss/postcss',
  resolve(root, 'packages/community-kids'),
)
const { default: tailwind } = await import(tailwindPath)
const postcss = createRequire(tailwindPath)('postcss')
const cssPath = resolve(root, 'packages/community-kids/src/app/globals.css')
const css = (
  await postcss([tailwind({ base: resolve(root, 'packages/community-kids') })]).process(
    await Bun.file(cssPath).text(),
    { from: cssPath },
  )
).css
const bundle = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'room-client.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
})
if (!bundle.success) throw new AggregateError(bundle.logs, 'build falhou')
const outputs = new Map<string, string>()
for (const o of bundle.outputs) outputs.set(`/${o.path.split(/[\\/]/).at(-1)}`, await o.text())
const entry = [...outputs.keys()].find((k) => k.startsWith('/room-client'))

/** A casa inicial com algumas peças a mais, para o quarto da prévia não ficar vazio. */
function casaDaPrevia(): MoradaHouse {
  const house = createMoradaHouse()
  const place = (id: string, pieceId: string, x: number, z: number, rotation = 0) => {
    const piece = MORADA_CATALOG.pieces[pieceId]
    if (!piece) return
    const cx = (piece.min[0] + piece.max[0]) / 2
    const cz = (piece.min[2] + piece.max[2]) / 2
    house.instances.push({
      id,
      pieceId,
      roomId: house.roomId,
      position: [x - cx, -piece.min[1], z - cz],
      rotation,
    })
  }
  place('qa-tapete', 'moveis/tapetes/tapete_listrado_laranja', 0.3, 1)
  place('qa-luminaria', 'moveis/luminarias/luminaria_chao_cupula', -3.5, -2.5)
  place('qa-mesa', 'moveis/mesas/mesa_centro_redonda_cinza_pacote', -1.6, 1.3)
  place('qa-estante', 'moveis/estantes/estante_modular_cubo', -2.6, -2.7)
  place('qa-abajur', 'moveis/luminarias/abajur_classico', 1.2, 2)
  return house
}
let state = { house: casaDaPrevia(), revision: 1, owned: [] as string[] }
let balance = 240

const pagina = `<!doctype html><html lang="pt-BR" data-sz-palette="blue"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meu quarto · prévia</title><link rel="stylesheet" href="/kids.css"><link rel="stylesheet" href="/preview-fonts.css"><style>:root{--font-atkinson:"Atkinson Hyperlegible Next",sans-serif;--font-bricolage:"Bricolage Grotesque",sans-serif;--font-baloo:"Baloo 2",sans-serif;--font-nunito:Nunito,sans-serif}body{margin:0}</style></head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="${entry}"></script></body></html>`

const port = Number(process.env.PORT ?? 5284)
Bun.serve({
  hostname: '127.0.0.1',
  port,
  async fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname
    if (p === '/') return new Response(pagina, { headers: { 'content-type': 'text/html' } })
    const js = outputs.get(p)
    if (js) return new Response(js, { headers: { 'content-type': 'text/javascript' } })
    if (p === '/kids.css') return new Response(css, { headers: { 'content-type': 'text/css' } })
    if (p === '/avatar.png' && process.env.ROOM_QA_AVATAR)
      return new Response(Bun.file(process.env.ROOM_QA_AVATAR))
    if (p === '/preview-fonts.css') {
      const f = Bun.file(resolve(root, 'packages/community/.cache/creator-preview-fonts/fonts.css'))
      return new Response((await f.exists()) ? await f.text() : '', {
        headers: { 'content-type': 'text/css' },
      })
    }
    if (/^\/preview-fonts\/[a-f0-9]{24}\.woff2$/.test(p))
      return new Response(
        Bun.file(
          resolve(
            root,
            'packages/community/.cache/creator-preview-fonts',
            p.split('/').at(-1) ?? '',
          ),
        ),
      )
    if (/^\/(zappy|edisvg)\/[a-z0-9.-]+\.(webp|png|svg|json)$/.test(p)) {
      const f = Bun.file(resolve(root, `packages/community-kids/public${p}`))
      return (await f.exists()) ? new Response(f) : new Response('', { status: 404 })
    }
    if (p.startsWith('/api/morada3d/')) {
      const file = decodeURIComponent(p.slice('/api/morada3d/'.length))
      if (!isMoradaFile(file)) return new Response('fora do catálogo', { status: 404 })
      const path = resolve(MORADA, file)
      if (!path.startsWith(MORADA + sep)) return new Response('fora', { status: 403 })
      const f = Bun.file(path)
      return (await f.exists()) ? new Response(f) : new Response('não baixado', { status: 404 })
    }
    if (p === '/api/members/house' && req.method === 'GET') return Response.json(state)
    if (p === '/api/members/house' && req.method === 'PUT') {
      const body = (await req.json()) as { house: MoradaHouse }
      state = { ...state, house: body.house, revision: state.revision + 1 }
      return Response.json(state)
    }
    if (p === '/api/members/room') return Response.json({ balance })
    if (p === '/api/members/house/buy' && req.method === 'POST') {
      const { pieceId } = (await req.json()) as { pieceId: string }
      balance = Math.max(0, balance - 50)
      state = { ...state, owned: [...state.owned, pieceId] }
      return Response.json({ balance })
    }
    return new Response('não', { status: 404 })
  },
})
console.log(`http://127.0.0.1:${port}/`)
