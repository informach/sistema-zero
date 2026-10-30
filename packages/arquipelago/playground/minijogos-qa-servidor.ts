import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, resolve } from 'node:path'
import { ManifestoDeDesafiosSchema } from '@sistemazero/arquipelago-contracts'

const raiz = resolve(import.meta.dir, '../../..')
const porta = Number(process.env.PORTA ?? 4598)
const arquivos = new Map<string, Blob>()
const studioRequire = createRequire(resolve(raiz, 'packages/studio/package.json'))
const tailwindRequire = createRequire(studioRequire.resolve('@tailwindcss/vite'))
const { compile } = tailwindRequire('@tailwindcss/node')
const fontes = [
  'packages/member-shell/src/components/arquipelago-minijogo-player.tsx',
  'packages/member-shell/src/components/arquipelago-mural-player.tsx',
  'packages/member-shell/src/components/creator/public-player.tsx',
  'packages/member-shell/src/components/creator/public-stage.tsx',
  'packages/member-shell/src/components/creator/console-controls.tsx',
  'packages/community-kids/src/app/pais/_components/arquipelago-minijogos.tsx',
]
const tokens = fontes.flatMap(
  (f) => readFileSync(resolve(raiz, f), 'utf8').match(/[^\s"'`{};]+/g) ?? [],
)
const estilos = new Map<string, string>()
for (const [publico, pacote] of [
  ['kids', 'community-kids'],
  ['adulto', 'community'],
] as const) {
  const base = resolve(raiz, `packages/${pacote}/src/app`)
  const css = await compile(readFileSync(resolve(base, 'globals.css'), 'utf8'), {
    base,
    onDependency() {},
  })
  estilos.set(publico, css.build(tokens))
}
const pacote = await Bun.build({
  entrypoints: [resolve(raiz, 'scripts/qa/arquipelago-minijogos.tsx')],
  target: 'browser',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [
    {
      name: 'dependencias-do-harness',
      setup(build) {
        const pacoteRequire = createRequire(resolve(raiz, 'packages/arquipelago/package.json'))
        build.onResolve(
          { filter: /^(react(?:-dom)?(?:\/.*)?|@sistemazero\/arquipelago-contracts)$/ },
          (args) => ({ path: pacoteRequire.resolve(args.path) }),
        )
      },
    },
  ],
})
if (!pacote.success) throw new Error(pacote.logs.join('\n'))
for (const arquivo of pacote.outputs) arquivos.set(basename(arquivo.path), arquivo)
const entrada = pacote.outputs.find((v) => v.kind === 'entry-point')!
const manifesto = ManifestoDeDesafiosSchema.parse(
  JSON.parse(
    readFileSync(resolve(raiz, 'docs/desafios-do-jogo/bosque/bosque.manifesto.json'), 'utf8'),
  ),
)
const corrida = manifesto.desafios.find((d) => d.slug === 'bosque-corrida-dos-bichos')
if (!corrida) throw new Error('Corrida dos bichos ausente do manifesto do Bosque')
const conteudo = corrida.conteudo
const projeto = conteudo.gabarito
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const resumo = {
  desafioId: id,
  titulo: conteudo.titulo,
  capa: null,
  aprovadoEm: '2026-10-29T12:00:00Z',
  atualizadoEm: '2026-10-29T12:00:00Z',
}
Bun.serve({
  hostname: '127.0.0.1',
  port: porta,
  async fetch(req) {
    const u = new URL(req.url)
    if (u.pathname === '/api/arquipelago/mural')
      return Response.json(
        { jogos: [{ playId: id, titulo: 'Corrida publicada' }] },
        { headers: { 'cache-control': 'no-store' } },
      )
    if (u.pathname === `/api/studio/play/${id}`)
      return Response.json(projeto, {
        headers: { 'cache-control': 'no-store', 'X-Author-Name': 'Pessoa' },
      })
    if (u.pathname.startsWith('/api/'))
      return Response.json(
        u.pathname.endsWith(id) || u.searchParams.has('id')
          ? { ...resumo, projeto }
          : { minijogos: [resumo] },
        { headers: { 'cache-control': 'no-store' } },
      )
    if (u.pathname === '/qa.css')
      return new Response(
        estilos.get(u.searchParams.get('publico') === 'adulto' ? 'adulto' : 'kids'),
        { headers: { 'content-type': 'text/css' } },
      )
    const a = arquivos.get(u.pathname.slice(1))
    if (a) return new Response(a)
    if (u.pathname.startsWith('/avatar3d/') || u.pathname.startsWith('/room3d/'))
      return new Response(Bun.file(resolve(raiz, `packages/community-kids/public${u.pathname}`)))
    return new Response(
      `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/qa.css?publico=${u.searchParams.get('publico') === 'adulto' ? 'adulto' : 'kids'}"><style>html,body,#jogo{margin:0;height:100%}dialog iframe{width:100%;height:100%;border:0}</style></head><body><div id="jogo"></div><script type="module" src="/${basename(entrada.path)}"></script></body></html>`,
      { headers: { 'content-type': 'text/html' } },
    )
  },
})
console.log(`QA local em http://127.0.0.1:${porta}`)
