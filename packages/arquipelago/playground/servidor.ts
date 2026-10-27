import { basename, resolve } from 'node:path'

/**
 * Servidor do playground: compila o jogo com o Bun a cada pedido e serve os modelos do avatar
 * e do quarto direto do `public/` do Kids (são os mesmos arquivos que a plataforma serve). Os
 * arquivos do próprio jogo (o Zappy) saem da compilação e ficam guardados para o pedido seguinte.
 */
const PORTA = Number(process.env.PORTA ?? 4520)
const PUBLICO = resolve(import.meta.dir, '../../community-kids/public')

const arquivosDoJogo = new Map<string, Blob>()

async function compilar(): Promise<Response> {
  const r = await Bun.build({
    entrypoints: [resolve(import.meta.dir, 'playground.tsx')],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  })
  if (!r.success) return new Response(r.logs.join('\n'), { status: 500 })
  for (const o of r.outputs) if (o.kind === 'asset') arquivosDoJogo.set(basename(o.path), o)
  const js = r.outputs.find((o) => o.kind === 'entry-point')
  return new Response(js ? await js.text() : '', { headers: { 'content-type': 'text/javascript' } })
}

const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arquipélago Vagalume · playground</title><style>html,body,#jogo{margin:0;height:100%;background:#0e1638}</style></head><body><div id="jogo"></div><script type="module" src="/jogo.js"></script></body></html>`

Bun.serve({
  hostname: '127.0.0.1',
  port: PORTA,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname === '/jogo.js') return compilar()
    const doJogo = arquivosDoJogo.get(pathname.slice(1))
    if (doJogo) return new Response(doJogo)
    if (pathname.startsWith('/avatar3d/') || pathname.startsWith('/room3d/')) {
      const f = Bun.file(PUBLICO + pathname)
      return (await f.exists()) ? new Response(f) : new Response('não achei', { status: 404 })
    }
    return new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  },
})
console.log(`Arquipélago no ar em http://127.0.0.1:${PORTA}`)
