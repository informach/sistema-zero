import { randomBytes } from 'node:crypto'
import { basename, resolve } from 'node:path'
import {
  catalogoInicialDaFaisca,
  cenarioInicialDaFaisca,
} from '../packages/arquipelago/src/sistemas/cenario-inicial'
import { prepararCenariosLocal } from '../packages/arquipelago-api/scripts/cenarios-local'
import { abrirEditorLocal } from '../packages/molda-cenarios/playground/servidor'
import type { ModeloDeCatalogo } from '../packages/molda-cenarios-core/src'

const raiz = resolve(import.meta.dir, '..'),
  arte = resolve(raiz, 'output/faisca-arte'),
  token = randomBytes(32).toString('hex')
const acervo = resolve(raiz, 'output/molda-cenarios/acervo'),
  manifestoDoAcervo = Bun.file(resolve(acervo, 'catalogo.json'))
const modelos: ModeloDeCatalogo[] = (await manifestoDoAcervo.exists())
  ? (await manifestoDoAcervo.json()).modelos
  : catalogoInicialDaFaisca()
const porDigest = new Map(modelos.map((m) => [`${m.digest}.glb`, m.arquivo]))
const local = await prepararCenariosLocal(
  process.env.MOLDA_CENARIOS_DATABASE_URL ??
    'postgres://postgres:cenario-local@127.0.0.1:55438/molda_cenarios_local',
  modelos,
  cenarioInicialDaFaisca,
)
const arquivos = new Map<string, Blob>()
let compilacao: Promise<void> | null = null
const compilar = () =>
  (compilacao ??= (async () => {
    const r = await Bun.build({
      entrypoints: [resolve(raiz, 'packages/arquipelago/src/cenarios/entrada.ts')],
      target: 'browser',
      format: 'esm',
      splitting: true,
      naming: { entry: 'entrada.js', chunk: 'parte-[hash].js', asset: 'arquivo-[hash].[ext]' },
      define: { 'process.env.NODE_ENV': '"development"' },
    })
    if (!r.success) throw Error(r.logs.join('\n'))
    for (const o of r.outputs) arquivos.set(basename(o.path), o)
  })())
await compilar()
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 4533,
  maxRequestBodySize: 9 * 1024 * 1024,
  async fetch(req) {
    const u = new URL(req.url)
    if (u.pathname.startsWith('/runtime/')) {
      const arquivo = arquivos.get(u.pathname.slice('/runtime/'.length))
      return arquivo
        ? new Response(arquivo, {
            headers: {
              'content-type': u.pathname.endsWith('.js')
                ? 'text/javascript'
                : 'application/octet-stream',
              'access-control-allow-origin': '*',
              'cache-control': 'no-store',
            },
          })
        : new Response('Não encontrado', { status: 404 })
    }
    const origem = req.headers.get('origin'),
      site = req.headers.get('sec-fetch-site')
    if ((origem && origem !== 'http://127.0.0.1:4531') || site === 'cross-site')
      return new Response('Origem não permitida', { status: 403 })
    if (
      u.pathname === '/api/molda-cenarios/local' &&
      req.method === 'GET' &&
      site === 'same-origin'
    )
      return Response.json(
        { ambiente: 'ensaio-local' },
        {
          headers: {
            'set-cookie': `molda_cenarios_local=${token}; HttpOnly; SameSite=Strict; Path=/`,
          },
        },
      )
    const cookie = req.headers.get('cookie') ?? '',
      bearer = req.headers.get('authorization')
    if (
      !cookie.split(';').some((c) => c.trim() === `molda_cenarios_local=${token}`) &&
      bearer !== `Bearer ${token}`
    )
      return new Response('Sessão local necessária', { status: 401 })
    if (u.pathname === '/api/molda-cenarios/recompilar' && req.method === 'POST') {
      compilacao = null
      await compilar()
      return Response.json({ pronto: true })
    }
    if (u.pathname.startsWith('/api/molda-cenarios/arte/')) {
      const nome = u.pathname.slice('/api/molda-cenarios/arte/'.length),
        fonte = porDigest.get(nome)
      if (!fonte || req.method !== 'GET') return new Response('Arte ausente', { status: 404 })
      const modeloArquivo = Bun.file(resolve(acervo, fonte)),
        conteudo = (await modeloArquivo.exists()) ? modeloArquivo : Bun.file(resolve(arte, fonte))
      return new Response(conteudo, {
        headers: {
          'content-type': 'model/gltf-binary',
          'cache-control': 'private,max-age=604800,immutable',
        },
      })
    }
    if (u.pathname.startsWith('/api/molda-cenarios/')) {
      const path = u.pathname.replace('/api/molda-cenarios', '/arquipelago/admin/cenarios'),
        headers = new Headers(req.headers)
      headers.set('x-auth-user-id', local.equipe.id)
      headers.set('x-auth-user-role', 'admin')
      headers.set('x-auth-user-status', 'active')
      headers.delete('x-auth-kids-context')
      headers.delete('x-auth-account-id')
      return local.rotas.handle(
        new Request(`http://localhost${path}${u.search}`, {
          method: req.method,
          headers,
          body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer(),
        }),
      )
    }
    return new Response('Não encontrado', { status: 404 })
  },
})
await Bun.write(
  resolve(raiz, 'output/molda-cenarios/local-session.json'),
  JSON.stringify({ url: 'http://127.0.0.1:4533/api/molda-cenarios', token }),
)
const editor = await abrirEditorLocal()
console.log(
  'Molda — Cenários: http://127.0.0.1:4531 · PostgreSQL local persistente · arte privada local',
)
async function fechar() {
  await editor.close()
  server.stop(true)
  await local.conexao.close()
  process.exit(0)
}
process.on('SIGINT', fechar)
process.on('SIGTERM', fechar)
