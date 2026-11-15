/**
 * Prévia local do "Meu avatar" com o pack (componentes e CSS reais, servidor de mentira), só no
 * próprio computador:
 *
 *   AVATAR_QA_DIR=<pasta com os arquivos do pack> bun packages/member-shell/qa/avatar-pack-serve.ts
 *
 * ⚠️ Os arquivos do pack são pagos e NÃO entram no repositório: a pasta é uma cópia fora do git.
 * `/__reset?filtro=boy|girl|all|nenhum&moedas=N` recomeça o avatar de mentira; `/__chamadas` mostra
 * o que a tela gravou.
 */
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'
import { AVATAR_CATALOG as C, drawAvatar, equipPart } from '@sistemazero/core/avatar'

const pasta = process.env.AVATAR_QA_DIR
if (!pasta) throw new Error('Defina AVATAR_QA_DIR (a pasta com os arquivos do pack).')
const root = resolve(import.meta.dir, '../../..')
const tailwindPath = Bun.resolveSync(
  '@tailwindcss/postcss',
  resolve(root, 'packages/community-kids'),
)
const { default: tailwind } = await import(tailwindPath)
const postcss = createRequire(tailwindPath)('postcss')
const styles = new Map<string, string>()
for (const [skin, name] of [
  ['adult', 'community'],
  ['kids', 'community-kids'],
] as const) {
  const path = resolve(root, `packages/${name}/src/app/globals.css`)
  styles.set(
    skin,
    (
      await postcss([tailwind({ base: resolve(root, `packages/${name}`) })]).process(
        await Bun.file(path).text(),
        { from: path },
      )
    ).css,
  )
}
const bundle = await Bun.build({
  entrypoints: [
    resolve(import.meta.dir, 'avatar-pack-client.tsx'),
    resolve(import.meta.dir, 'avatar-banco-client.tsx'),
  ],
  target: 'browser',
  define: { 'process.env.NODE_ENV': JSON.stringify('production'), 'process.env': '{}' },
})
if (!bundle.success) throw new AggregateError(bundle.logs, 'build falhou')
const script = await bundle.outputs.find((o) => o.path.includes('avatar-pack-client'))?.text()
const scriptDoBanco = await bundle.outputs
  .find((o) => o.path.includes('avatar-banco-client'))
  ?.text()
/** Onde o banco de fotos da troca é gravado (`/banco`). */
const BANCO_DIR = process.env.BANCO_DIR

type Filtro = 'girl' | 'boy' | 'all' | null
function novoEstado(filtro: Filtro, moedas: number) {
  return {
    style: 'cute-v1',
    equipped: vestir(drawAvatar(C, 'qa-avatar', { filter: filtro ?? 'all' }), filtro),
    filter: filtro,
    customized: false,
    owned: [] as string[],
    photoUrl: null as string | null,
    balance: moedas,
  }
}
/** O sorteado de mentira com um cabelo grátis e a cor de pele média (para as regras aparecerem). */
function vestir(slots: Record<string, string>, filtro: Filtro) {
  const cabelo = (C.rules.groups.cabelo?.parts ?? []).find(
    (id) =>
      C.parts[id]?.tier === 'free' &&
      C.parts[id]?.audience === (filtro === 'girl' ? 'girl' : 'boy'),
  )
  const comCabelo = cabelo ? equipPart(C, slots, cabelo) : slots
  return equipPart(C, comCabelo, 'corpo_pele_media_pacote')
}
let estado = novoEstado('boy', 180)
const chamadas: string[] = []
const pagina = (skin: string) =>
  `<!doctype html><html lang="pt-BR" data-sz-palette="blue"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Meu avatar · prévia</title><link rel="stylesheet" href="/${skin}.css"><link rel="stylesheet" href="/preview-fonts.css"><style>:root{--font-atkinson:"Atkinson Hyperlegible Next",sans-serif;--font-bricolage:"Bricolage Grotesque",sans-serif;--font-baloo:"Baloo 2",sans-serif;--font-nunito:Nunito,sans-serif}body{margin:0}</style></head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/app.js"></script></body></html>`

Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 5282),
  async fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname
    if (p === '/')
      return new Response(pagina(url.searchParams.get('skin') === 'adult' ? 'adult' : 'kids'), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    if (p === '/banco')
      return new Response(pagina('kids').replace('/app.js', '/banco.js'), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    if (p === '/banco.js')
      return new Response(scriptDoBanco, { headers: { 'content-type': 'text/javascript' } })
    const foto = p.match(/^\/__banco\/(\d{1,3})(\/falhou)?$/)
    if (foto && req.method === 'POST') {
      if (!BANCO_DIR) return new Response('sem BANCO_DIR', { status: 500 })
      if (foto[2]) console.log(`banco: ${foto[1]} falhou`)
      else await Bun.write(resolve(BANCO_DIR, `${foto[1]}.png`), await req.arrayBuffer())
      return new Response('ok')
    }
    if (p === '/app.js')
      return new Response(script, { headers: { 'content-type': 'text/javascript' } })
    if (p === '/kids.css' || p === '/adult.css')
      return new Response(styles.get(p.slice(1, -4)), { headers: { 'content-type': 'text/css' } })
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
    if (/^\/zappy\/[a-z0-9-]+\.(webp|png|svg)$/.test(p)) {
      const f = Bun.file(resolve(root, `packages/community-kids/public${p}`))
      return (await f.exists()) ? new Response(f) : new Response('', { status: 404 })
    }
    if (/^\/edisvg\/[a-z0-9.-]+\.(webp|json)$/.test(p)) {
      const f = Bun.file(resolve(root, `packages/community-kids/public${p}`))
      return (await f.exists()) ? new Response(f) : new Response('', { status: 404 })
    }
    if (p.startsWith('/api/avatar3d/')) {
      const alvo = resolve(pasta, decodeURIComponent(p.slice('/api/avatar3d/'.length)))
      if (!alvo.startsWith(resolve(pasta) + sep)) return new Response('fora', { status: 403 })
      const f = Bun.file(alvo)
      return (await f.exists()) ? new Response(f) : new Response('não baixado', { status: 404 })
    }
    if (p === '/__reset') {
      const f = url.searchParams.get('filtro')
      estado = novoEstado(
        f === 'nenhum' ? null : ((f as Filtro) ?? 'boy'),
        Number(url.searchParams.get('moedas') ?? 180),
      )
      chamadas.length = 0
      return Response.json({ ok: true })
    }
    if (p === '/__chamadas') return Response.json({ chamadas, estado })
    if (p === '/api/members/avatar' && req.method === 'GET') return Response.json(estado)
    if (p === '/api/members/avatar' && req.method === 'PUT') {
      const body = (await req.json()) as { slots: Record<string, string>; filter?: Filtro }
      chamadas.push(`PUT ${Object.keys(body.slots).length} peças filtro=${body.filter ?? '-'}`)
      estado = {
        ...estado,
        equipped: body.slots,
        filter: body.filter ?? estado.filter,
        customized: true,
      }
      return Response.json({ equipped: body.slots, style: 'cute-v1', filter: estado.filter })
    }
    const compra = p.match(/^\/api\/members\/avatar\/parts\/([^/]+)\/buy$/)
    if (compra && req.method === 'POST') {
      const id = decodeURIComponent(compra[1] ?? '')
      const preco = C.sets[id]?.price ?? C.parts[id]?.price ?? 0
      chamadas.push(`COMPRA ${id} ${preco}`)
      if (estado.balance < preco)
        return Response.json({ error: { code: 'INSUFFICIENT_COINS' } }, { status: 402 })
      estado = { ...estado, balance: estado.balance - preco, owned: [...estado.owned, id] }
      return Response.json({ alreadyOwned: false, balance: estado.balance })
    }
    if (p === '/api/members/avatar/snapshot' && req.method === 'POST') {
      chamadas.push('FOTO')
      return Response.json({ url: '/foto.png' })
    }
    return new Response('não', { status: 404 })
  },
})
console.log('http://127.0.0.1:5282/')
