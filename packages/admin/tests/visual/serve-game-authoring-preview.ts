/** Local visual/interaction harness. In-memory HTTP fixtures; never connects to real accounts. */
import { createRequire } from 'node:module'
import { basename, resolve, sep } from 'node:path'
import { challengePayload, newChallenge } from '@sistemazero/arquipelago-admin'
import {
  CriarDesafioSchema,
  type DesafioDaEquipe,
  GravarDesafioSchema,
} from '@sistemazero/arquipelago-contracts'
import tailwind from '@tailwindcss/postcss'

const app = resolve(import.meta.dir, '../..')
const postcss = createRequire(Bun.resolveSync('@tailwindcss/postcss', app))('postcss')
const cssPath = resolve(app, 'src/app/globals.css')
const build = await Bun.build({
  entrypoints: [resolve(import.meta.dir, 'game-authoring-preview.tsx')],
  target: 'browser',
  splitting: true,
  minify: true,
  outdir: resolve(app, '.cache/game-ui-build'),
  naming: { entry: '[name].[ext]', chunk: 'chunk-[hash].js', asset: '[name]-[hash].[ext]' },
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
})
if (!build.success) throw new Error(build.logs.join('\n'))
const styles = await postcss([tailwind()]).process(await Bun.file(cssPath).text(), {
  from: cssPath,
})
const assets = new Map(build.outputs.map((o) => [`/${basename(o.path)}`, o]))
const records = new Map<string, DesafioDaEquipe>()
const seed = newChallenge('kids')
seed.metadados.slug = 'desafio-visual'
seed.conteudo.titulo = 'A primeira cor da ilha'
seed.conteudo.enunciado = 'Crie uma repetição para desenhar sua primeira cor.'
seed.conteudo.objetivos = [{ id: 'loop', label: 'Usar uma repetição', rule: { type: 'usesLoop' } }]
const id = 'db9ca185-3ce4-4eba-a07d-8cdba7a145fd'
function record(
  input: ReturnType<typeof challengePayload>,
  recordId: string,
  revision: number,
): DesafioDaEquipe {
  return {
    metadados: input.metadados,
    conteudo: input.conteudo,
    resumo: {
      ...input.metadados,
      id: recordId,
      titulo: input.conteudo.titulo,
      situacao: 'rascunho',
      revisao: revision,
      revisaoPublicada: null,
      alteradoDepoisDePublicar: false,
      atualizadoEm: new Date().toISOString(),
    },
    blocosPublicados: null,
  }
}
records.set(id, record(challengePayload(seed), id, 1))
let conflictOnce = false
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 0,
  async fetch(request) {
    const url = new URL(request.url),
      path = url.pathname
    if (path === '/favicon.ico') return new Response(null, { status: 204 })
    const asset = assets.get(path)
    if (asset) return new Response(asset)
    if (path === '/app.css')
      return new Response(styles.css, { headers: { 'content-type': 'text/css' } })
    const publicRoot = resolve(app, 'public')
    const publicPath = resolve(publicRoot, path.slice(1))
    if (publicPath.startsWith(publicRoot + sep) && (await Bun.file(publicPath).exists()))
      return new Response(Bun.file(publicPath))
    if (path === '/__qa/conflict' && request.method === 'POST') {
      conflictOnce = true
      return Response.json({ ok: true })
    }
    if (path === '/api/arquipelago/cobertura')
      return Response.json({
        mapa: { situacao: 'ok' },
        cartas: [
          {
            id: 'primeira',
            nome: 'Primeira repetição',
            bloco: 'sz_js_repeat',
            cursos: [],
            avisos: ['sem-curso'],
          },
        ],
      })
    if (path === '/api/arquipelago/desafios') {
      if (request.method === 'GET')
        return Response.json({
          desafios: [...records.values()]
            .filter(
              (r) =>
                r.metadados.publico === url.searchParams.get('publico') &&
                (!url.searchParams.get('ilha') ||
                  r.metadados.ilha === url.searchParams.get('ilha')),
            )
            .map((r) => r.resumo),
        })
      const data = CriarDesafioSchema.parse(await request.json()),
        newId = crypto.randomUUID()
      const item = record(data, newId, 1)
      records.set(newId, item)
      return Response.json(item, { status: 201 })
    }
    const match = path.match(
      /^\/api\/arquipelago\/desafios\/([a-f0-9-]+)(?:\/(analisar|publicar|arquivar|reativar))?$/,
    )
    if (match) {
      const item = records.get(match[1] ?? '')
      if (!item) return Response.json({ error: { message: 'Não encontrado.' } }, { status: 404 })
      if (request.method === 'GET') return Response.json(item)
      if (conflictOnce) {
        conflictOnce = false
        return Response.json(
          { error: { message: 'Outra pessoa editou este desafio.' }, atual: item },
          { status: 409 },
        )
      }
      if (request.method === 'PUT') {
        const data = GravarDesafioSchema.parse(await request.json())
        const next = record(data, item.resumo.id, item.resumo.revisao + 1)
        records.set(item.resumo.id, next)
        return Response.json(next)
      }
      if (match[2] === 'analisar')
        return Response.json({
          blocosDerivados: [],
          blocosExigidos: [],
          cobertura: [],
          problemas: [],
          gabarito: item.conteudo.objetivos.map((o) => ({ id: o.id, passou: true })),
          inicial: item.conteudo.objetivos.map((o) => ({ id: o.id, passou: false })),
        })
      if (match[2] === 'publicar') {
        item.resumo.situacao = 'publicado'
        item.resumo.revisaoPublicada = item.resumo.revisao
        return Response.json(item)
      }
      item.resumo.situacao = match[2] === 'arquivar' ? 'arquivado' : 'publicado'
      item.resumo.revisao++
      return Response.json(item)
    }
    if (path.startsWith('/api/'))
      return Response.json({ error: { message: 'Rota fora do ensaio visual.' } }, { status: 404 })
    if (path !== '/') return new Response('Not found', { status: 404 })
    return new Response(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Arquipélago · QA local</title><link rel="stylesheet" href="/app.css"><body><script>globalThis.process={env:{NODE_ENV:"production"}}</script><div id="root"></div><script type="module" src="/game-authoring-preview.js"></script></body></html>',
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
console.log(`Game authoring preview: ${server.url}`)
