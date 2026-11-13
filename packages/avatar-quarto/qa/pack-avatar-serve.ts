/**
 * Servidor da página de conferência do avatar do pack (fora do app, sem login).
 *
 *   AVATAR_QA_DIR=<pasta com os arquivos> bun packages/avatar-quarto/qa/pack-avatar-serve.ts
 *
 * ⚠️ Os arquivos do pack são pagos e NÃO entram no repositório: a pasta é uma cópia temporária
 * baixada do bucket privado (`wrangler r2 object get testes-privado/avatar/<arquivo> --remote`),
 * fora do git. O servidor só escuta no próprio computador.
 */
import { join, resolve, sep } from 'node:path'

const pasta = process.env.AVATAR_QA_DIR
if (!pasta) throw new Error('Defina AVATAR_QA_DIR (a pasta com os arquivos baixados do bucket).')
const porta = Number(process.env.PORT ?? 5281)

const build = await Bun.build({
  entrypoints: [join(import.meta.dirname, 'pack-avatar-page.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
})
if (!build.success) throw new AggregateError(build.logs, 'build da página falhou')
const app = await build.outputs[0]?.text()

const html = `<!doctype html><meta charset="utf-8"><title>Avatar do pack</title>
<body style="margin:0;background:#f5f7fb"><div id="raiz"></div><script type="module" src="/app.js"></script>`

Bun.serve({
  hostname: '127.0.0.1',
  port: porta,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/') return new Response(html, { headers: { 'content-type': 'text/html' } })
    if (url.pathname === '/app.js')
      return new Response(app, { headers: { 'content-type': 'text/javascript' } })
    if (url.pathname.startsWith('/api/avatar3d/')) {
      const alvo = resolve(pasta, decodeURIComponent(url.pathname.slice('/api/avatar3d/'.length)))
      if (!alvo.startsWith(resolve(pasta) + sep)) return new Response('fora', { status: 403 })
      const f = Bun.file(alvo)
      return (await f.exists()) ? new Response(f) : new Response('não baixado', { status: 404 })
    }
    return new Response('não', { status: 404 })
  },
})
console.log(`http://127.0.0.1:${porta}/`)
