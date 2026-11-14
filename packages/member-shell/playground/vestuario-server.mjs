/**
 * QA local do configurador real e CSS das comunidades. Sem rede de serviços ou banco. As peças do
 * pack são pagas e não estão no repositório: `AVATAR_QA_DIR` aponta para uma cópia local (fora do
 * git) servida em `/api/avatar3d/`.
 */

import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { avatarProblems, AVATAR_CATALOG as C, drawAvatar } from '../../core/src/avatar/index.ts'
import { avatarUnownedWorn } from '../src/lib/avatar-pack.ts'

const pacote = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packages = resolve(pacote, '..')
const saida = resolve(pacote, '.cache/vestuario-browser-dist')
await mkdir(saida, { recursive: true })
const build = await Bun.build({
  entrypoints: [resolve(pacote, 'playground/vestuario-entry.tsx')],
  target: 'browser',
  outdir: saida,
  splitting: true,
  define: { 'process.env.NODE_ENV': '"production"' },
})
if (!build.success) throw new AggregateError(build.logs, 'Bundle da conferência falhou')
const twPath = Bun.resolveSync('@tailwindcss/postcss', resolve(packages, 'community-kids'))
const require = createRequire(twPath)
const postcss = require('postcss')
const tailwind = (await import(twPath)).default
for (const [publico, app] of [
  ['kids', 'community-kids'],
  ['adulto', 'community'],
]) {
  const fonte = resolve(packages, app, 'src/app/globals.css')
  const resultado = await postcss([tailwind({ base: resolve(packages, app) })]).process(
    await Bun.file(fonte).text(),
    { from: fonte },
  )
  await Bun.write(resolve(saida, `${publico}.css`), resultado.css)
}

const casos = new Map()
function estado(id) {
  if (!casos.has(id))
    casos.set(id, {
      style: 'cute-v1',
      equipped: drawAvatar(C, `vestuario-${id}`, { filter: 'boy' }),
      filter: 'boy',
      customized: false,
      owned: [],
      photoUrl: null,
      balance: 80,
      compras: 0,
      saves: 0,
    })
  return casos.get(id)
}
const responder = (body, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: Number(process.env.PORTA ?? 0),
  async fetch(req) {
    const u = new URL(req.url)
    if (u.pathname === '/favicon.ico') return new Response(null, { status: 204 })
    if (u.pathname === '/') {
      const publico = u.searchParams.get('publico') === 'adulto' ? 'adulto' : 'kids'
      const id = u.searchParams.get('caso')
      if (!id || !/^[a-z0-9-]{1,80}$/.test(id)) return responder({}, 400)
      estado(id)
      return new Response(
        `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/${publico}.css"></head><body><div id="root"></div><script type="module" src="/dist/vestuario-entry.js"></script></body></html>`,
        {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'set-cookie': `vestuario-qa=${id}; Path=/; HttpOnly; SameSite=Strict`,
          },
        },
      )
    }
    if (u.pathname.startsWith('/api/') || u.pathname === '/qa/estado') {
      const id = req.headers.get('cookie')?.match(/(?:^|; )vestuario-qa=([a-z0-9-]+)/)?.[1]
      if (!id || !casos.has(id)) return responder({}, 401)
      const s = estado(id)
      if (u.pathname === '/qa/estado') return responder(s)
      if (u.pathname === '/api/members/avatar') {
        if (req.method === 'GET') return responder(s)
        if (req.method === 'PUT') {
          const b = await req.json()
          if (!b.slots || avatarProblems(C, b.slots).length > 0) return responder({}, 400)
          if (avatarUnownedWorn(C, b.slots, new Set(s.owned)).length > 0) return responder({}, 403)
          s.equipped = b.slots
          if (b.filter) s.filter = b.filter
          s.customized = true
          s.saves++
          return responder({ equipped: s.equipped, style: s.style, filter: s.filter })
        }
      }
      if (u.pathname === '/api/members/avatar/snapshot')
        return responder({ url: '/foto-local.png' })
      const peca = u.pathname.match(/^\/api\/members\/avatar\/parts\/([a-z0-9_-]+)\/buy$/)?.[1]
      if (peca && req.method === 'POST') {
        const preco = C.sets[peca]?.price ?? C.parts[peca]?.price
        if (preco === undefined) return responder({}, 404)
        const alreadyOwned = s.owned.includes(peca)
        if (!alreadyOwned) {
          if (s.balance < preco) return responder({}, 402)
          s.balance -= preco
          s.compras++
          s.owned.push(peca)
        }
        return responder({ alreadyOwned, balance: s.balance })
      }
      return responder({}, 404)
    }
    const pack = process.env.AVATAR_QA_DIR
    const raiz = u.pathname.startsWith('/dist/')
      ? saida
      : u.pathname.startsWith('/api/avatar3d/') && pack
        ? resolve(pack)
        : null
    if (!raiz) return new Response('Not found', { status: 404 })
    const file = resolve(
      raiz,
      u.pathname.startsWith('/dist/')
        ? u.pathname.slice(6)
        : decodeURIComponent(u.pathname.slice('/api/avatar3d/'.length)),
    )
    const rel = relative(raiz, file)
    if (rel.startsWith('..') || rel.includes(':')) return new Response('Forbidden', { status: 403 })
    const blob = Bun.file(file)
    return (await blob.exists()) ? new Response(blob) : new Response('Not found', { status: 404 })
  },
})
console.log(`READY ${server.url.origin}`)
for (const sinal of ['SIGINT', 'SIGTERM'])
  process.on(sinal, () => {
    server.stop(true)
    process.exit(0)
  })
