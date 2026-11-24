/** Referência imutável de arte: lê o Git em memória, sem trocar staging ou tocar arquivos atuais. */
import { spawnSync } from 'node:child_process'
import { relative, resolve } from 'node:path'

const raiz = resolve(import.meta.dirname, '../../..'),
  commit = process.argv[2] ?? 'a300c5f2e',
  porta = Number(process.env.PORTA_REFERENCIA ?? 4531)
const cache = new Map<string, string>(),
  modelos = resolve(raiz, 'output/faisca-gate21/referencia.js')
const resultado = await Bun.build({
  entrypoints: [resolve(import.meta.dirname, 'arquipelago-macro.tsx')],
  target: 'browser',
  format: 'esm',
  define: { 'process.env.NODE_ENV': '"development"' },
  plugins: [
    {
      name: 'referencia-git-da-faisca',
      setup(b) {
        b.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, (args) => {
          const rel = relative(raiz, args.path).replaceAll('\\', '/')
          if (!rel.startsWith('packages/arquipelago/')) return
          // Só a lista de câmeras é atual, para fotografar a referência com os mesmos enquadramentos.
          if (rel === 'packages/arquipelago/playground/faisca-vistas.tsx') return
          let conteudo = cache.get(rel)
          if (conteudo === undefined) {
            const r = spawnSync('git', ['show', `${commit}:${rel}`], {
              cwd: raiz,
              maxBuffer: 32 * 1024 * 1024,
            })
            if (r.status !== 0) throw Error(`Arquivo ausente na referência: ${rel}`)
            conteudo = r.stdout.toString()
            cache.set(rel, conteudo)
          }
          return {
            contents: conteudo,
            loader: rel.endsWith('tsx') ? 'tsx' : rel.endsWith('.ts') ? 'ts' : 'js',
          }
        })
      },
    },
  ],
})
if (!resultado.success) throw Error(resultado.logs.join('\n'))
await Bun.write(modelos, resultado.outputs[0]!)
Bun.serve({
  hostname: '127.0.0.1',
  port: porta,
  async fetch(req) {
    const url = new URL(req.url)
    if (url.pathname === '/macro.js')
      return new Response(Bun.file(modelos), { headers: { 'content-type': 'text/javascript' } })
    return fetch(`http://127.0.0.1:4530${url.pathname}${url.search}`)
  },
})
console.log(
  `Referência ${commit} na porta ${porta}; somente câmeras atuais; ${cache.size} fontes do Git.`,
)
