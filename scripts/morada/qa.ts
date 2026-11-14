/** Conferência local do editor real com arquivos privados e persistência em memória. */
import { createRequire } from 'node:module'
import { resolve, sep } from 'node:path'
import {
  createMoradaHouse,
  isMoradaFile,
  MORADA_CATALOG,
  validateMoradaHouse,
} from '../../packages/core/src/morada'
import { MoradaHouseSchema } from '../../packages/core/src/morada/schema'

const root = resolve(import.meta.dirname, '../..')
const assets = resolve(process.env.MORADA_QA_DIR ?? resolve(root, 'output/morada-assets/morada'))
const tailwindPath = Bun.resolveSync(
  '@tailwindcss/postcss',
  resolve(root, 'packages/community-kids'),
)
const { default: tailwind } = await import(tailwindPath)
const postcss = createRequire(tailwindPath)('postcss')
const styles = new Map<string, string>()
for (const [skin, app] of [
  ['kids', 'community-kids'],
  ['adult', 'community'],
] as const) {
  const cssPath = resolve(root, `packages/${app}/src/app/globals.css`)
  styles.set(
    skin,
    (
      await postcss([tailwind({ base: resolve(root, `packages/${app}`) })]).process(
        await Bun.file(cssPath).text(),
        { from: cssPath },
      )
    ).css,
  )
}
const build = await Bun.build({
  entrypoints: [resolve(root, 'packages/member-shell/tests/fixtures/morada-editor.fixture.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': '"development"', 'process.env': '{}' },
})
if (!build.success) throw new AggregateError(build.logs, 'Editor não compilou')
const script = build.outputs.find((o) => o.kind === 'entry-point')
if (!script) throw new Error('Sem entrada do editor')
let house = createMoradaHouse(),
  revision = 0
const owned = Object.keys(MORADA_CATALOG.pieces).filter((id) => id.startsWith('trophy/'))
const envelope = () => ({ house, revision, owned })
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORT ?? 5284),
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/app.js')
      return new Response(script, { headers: { 'content-type': 'text/javascript' } })
    if (url.pathname === '/style.css')
      return new Response(styles.get(url.searchParams.get('skin') === 'adult' ? 'adult' : 'kids'), {
        headers: { 'content-type': 'text/css' },
      })
    if (url.pathname === '/api/members/room')
      return Response.json({ balance: 250, balanceUnlimited: false })
    if (url.pathname === '/api/members/house') {
      if (req.method === 'GET') return Response.json(envelope())
      if (req.method === 'PUT') {
        const body = await req.json()
        const parsed = MoradaHouseSchema.safeParse(body.house)
        if (!parsed.success) return Response.json({ message: 'Casa inválida' }, { status: 400 })
        if (body.revision !== revision)
          return Response.json({ current: envelope() }, { status: 409 })
        const errors = validateMoradaHouse(parsed.data)
        if (errors.length) return Response.json({ errors }, { status: 400 })
        house = parsed.data
        revision++
        return Response.json(envelope())
      }
    }
    if (url.pathname === '/__state') return Response.json(envelope())
    if (url.pathname === '/__conflict' && req.method === 'POST') {
      revision++
      return Response.json(envelope())
    }
    if (url.pathname.startsWith('/api/morada3d/')) {
      const file = decodeURIComponent(url.pathname.slice('/api/morada3d/'.length))
      if (!isMoradaFile(file)) return new Response('Fora do catálogo', { status: 404 })
      const path = resolve(assets, file)
      if (!path.startsWith(assets + sep)) return new Response('Fora da pasta', { status: 403 })
      const blob = Bun.file(path)
      return (await blob.exists())
        ? new Response(blob)
        : new Response('Arquivo ausente', { status: 404 })
    }
    return new Response(
      `<!doctype html><html lang="pt-BR" ${url.searchParams.get('adulto') === '1' ? 'style="font-size:18px"' : ''}><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css?skin=${url.searchParams.get('adulto') === '1' ? 'adult' : 'kids'}"><title>Morada · conferência</title></head><body class="bg-background text-foreground"><div id="root"></div><script type="module" src="/app.js"></script></body></html>`,
      { headers: { 'content-type': 'text/html;charset=utf-8' } },
    )
  },
})
console.log(`Conferência Morada: ${server.url}`)
