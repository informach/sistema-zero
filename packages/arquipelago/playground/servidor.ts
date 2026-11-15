import { basename, resolve, sep } from 'node:path'
import { isMoradaFile } from '@sistemazero/avatar-quarto/morada/catalog'
import { conferirPortosDaArte } from '../scripts/gerar-portos'
import { ARTE_DA_FAISCA } from '../src/mundo/faisca/arte.generated'

await conferirPortosDaArte()

/**
 * Servidor do playground: compila o jogo com o Bun a cada pedido e serve os modelos do avatar
 * e do quarto direto do `public/` do Kids (são os mesmos arquivos que a plataforma serve). Os
 * arquivos do próprio jogo (o Zappy) saem da compilação e ficam guardados para o pedido seguinte.
 *
 * As peças do avatar do pack (`/api/avatar3d/`, 13/11/2026) são pagas e não estão no repositório:
 * `AVATAR_QA_DIR` aponta para uma cópia local (fora do git). Sem ela (o CI), o servidor entrega um
 * modelo vazio: o jogo roda sem o boneco.
 */
const PORTA = Number(process.env.PORTA ?? 4520)
const MORADA = resolve(
  process.env.MORADA_QA_DIR ?? resolve(import.meta.dir, '../../../output/morada-assets/morada'),
)
const PACK = process.env.AVATAR_QA_DIR ? resolve(process.env.AVATAR_QA_DIR) : null
const ARTE_FAISCA = resolve(import.meta.dir, '../../../output/faisca-arte')
const ARQUIVOS_FAISCA = new Set(Object.values(ARTE_DA_FAISCA.pecas).map((p) => p.arquivo as string))
/** As peças da pista com a arte (`preparar-pista-da-arte.ts`), fora do git. */
const PISTA = resolve(
  process.env.ARQUIPELAGO_PISTA_DIR ?? resolve(import.meta.dir, '../.cache/pista-da-arte'),
)
/** O glTF mínimo (uma cena sem nada): o carregador do three aceita o JSON no lugar do binário. */
const GLTF_VAZIO = { asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [] }] }
const PNG_DE_UM_PONTO = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  ),
  (c) => c.charCodeAt(0),
)

const arquivosDoJogo = new Map<string, Blob>()

async function compilar(entrada: string): Promise<Response> {
  const r = await Bun.build({
    entrypoints: [resolve(import.meta.dir, entrada)],
    target: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  })
  if (!r.success) return new Response(r.logs.join('\n'), { status: 500 })
  for (const o of r.outputs) if (o.kind === 'asset') arquivosDoJogo.set(basename(o.path), o)
  const js = r.outputs.find((o) => o.kind === 'entry-point')
  return new Response(js ? await js.text() : '', { headers: { 'content-type': 'text/javascript' } })
}

/**
 * `?mundo=aventura` troca as regras do mundo antes de o jogo carregar (`mundo/mundo-escolhido.ts`):
 * o avatar no tamanho de verdade, com as velocidades e o pulo tirados das animações.
 */
const ESCOLHER_O_MUNDO =
  "<script>globalThis.__arquipelagoRitmo=new URLSearchParams(location.search).get('ritmo');globalThis.__arquipelagoMundo=location.pathname==='/macro'?'macro':new URLSearchParams(location.search).get('mundo')</script>"
const pagina = (titulo: string, js: string) =>
  `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title><style>html,body,#jogo{margin:0;height:100%;background:#0e1638}</style></head><body><div id="jogo"></div>${ESCOLHER_O_MUNDO}<script type="module" src="${js}"></script></body></html>`
const HTML = pagina('Arquipélago Vagalume · playground', '/jogo.js')
/** O visualizador das animações do avatar (`/animacoes?v=1.4`, veja `animacoes.tsx`). */
const HTML_DAS_ANIMACOES = pagina('Arquipélago Vagalume · animações', '/animacoes.js')
/** A sala de testes do movimento (`/movimento?estacao=Laguinho`, veja `movimento.tsx`). */
const HTML_DO_MOVIMENTO = pagina('Arquipélago Vagalume · sala de movimento', '/movimento.js')

Bun.serve({
  hostname: '127.0.0.1',
  port: PORTA,
  async fetch(req) {
    const { pathname } = new URL(req.url)
    if (pathname.startsWith('/api/faisca3d/')) {
      const arquivo = pathname.slice('/api/faisca3d/'.length)
      if (!ARQUIVOS_FAISCA.has(arquivo))
        return new Response('Fora da seleção da Faísca', { status: 404 })
      const f = Bun.file(resolve(ARTE_FAISCA, arquivo))
      return (await f.exists())
        ? new Response(f, {
            headers: {
              'content-type': 'model/gltf-binary',
              'cache-control': 'private, max-age=604800, immutable',
            },
          })
        : new Response('Execute scripts/exportar-arte-faisca.ts para preparar a arte local', {
            status: 404,
          })
    }
    if (pathname === '/rotina-lumi.css') {
      const css = await Bun.build({
        entrypoints: [
          resolve(
            import.meta.dir,
            '../../member-shell/src/components/arquipelago-rotina/editor.css',
          ),
        ],
        target: 'browser',
      })
      if (!css.success) return new Response(css.logs.join('\n'), { status: 500 })
      return new Response(css.outputs[0], { headers: { 'content-type': 'text/css' } })
    }
    if (pathname === '/arte.js') return compilar('arte.tsx')
    if (pathname === '/arte')
      return new Response(pagina('Arquipélago · conferência da arte', '/arte.js'), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    if (pathname === '/jogo.js') return compilar('playground.tsx')
    if (pathname === '/macro.js') return compilar('arquipelago-macro.tsx')
    if (pathname === '/macro')
      return new Response(pagina('Arquipélago · estudo de escala', '/macro.js'), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    if (pathname === '/animacoes.js') return compilar('animacoes.tsx')
    if (pathname === '/animacoes')
      return new Response(HTML_DAS_ANIMACOES, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    // A pista de conferência com as peças reais da arte (`pista-da-arte.tsx`).
    if (pathname === '/pista-da-arte.js') return compilar('pista-da-arte.tsx')
    if (pathname === '/pista-da-arte')
      return new Response(pagina('Arquipélago · pista com as peças da arte', '/pista-da-arte.js'), {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    if (pathname.startsWith('/pista-da-arte/arquivos/')) {
      const nome = decodeURIComponent(pathname.slice('/pista-da-arte/arquivos/'.length))
      const alvo = resolve(PISTA, nome)
      if (!alvo.startsWith(PISTA + sep)) return new Response('fora', { status: 403 })
      const f = Bun.file(alvo)
      return (await f.exists()) ? new Response(f) : new Response('não achei', { status: 404 })
    }
    if (pathname === '/movimento.js') return compilar('movimento.tsx')
    if (pathname === '/movimento')
      return new Response(HTML_DO_MOVIMENTO, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    // Os modelos do jogo por caminho fixo, para as capturas porem peças soltas na cena.
    if (pathname.startsWith('/modelos/') && !pathname.includes('..')) {
      const f = Bun.file(
        resolve(import.meta.dir, '../src/assets', pathname.slice('/modelos/'.length)),
      )
      return (await f.exists()) ? new Response(f) : new Response('não achei', { status: 404 })
    }
    const doJogo = arquivosDoJogo.get(pathname.slice(1))
    if (doJogo) return new Response(doJogo)
    if (pathname.startsWith('/api/avatar3d/')) {
      // Sem a cópia das peças (o CI, que não tem o pack): um modelo vazio e uma imagem de 1 ponto,
      // para o jogo seguir sem o boneco e sem erro de arquivo que não baixou.
      if (!PACK)
        return pathname.endsWith('.glb')
          ? Response.json(GLTF_VAZIO, { headers: { 'content-type': 'model/gltf+json' } })
          : new Response(PNG_DE_UM_PONTO, { headers: { 'content-type': 'image/png' } })
      const alvo = resolve(PACK, decodeURIComponent(pathname.slice('/api/avatar3d/'.length)))
      if (!alvo.startsWith(PACK + sep)) return new Response('fora', { status: 403 })
      const f = Bun.file(alvo)
      return (await f.exists()) ? new Response(f) : new Response('não achei', { status: 404 })
    }
    if (pathname.startsWith('/api/morada3d/')) {
      const file = decodeURIComponent(pathname.slice('/api/morada3d/'.length))
      if (!isMoradaFile(file)) return new Response('Fora do catálogo', { status: 404 })
      // Provas de estado/física no CI não distribuem o pack privado. A cópia real,
      // quando solicitada, continua estrita: arquivo ausente responde 404.
      if (process.env.MORADA_QA_EMPTY_ASSETS === '1' && !process.env.MORADA_QA_DIR)
        return file.endsWith('.glb')
          ? Response.json(GLTF_VAZIO, { headers: { 'content-type': 'model/gltf+json' } })
          : new Response(PNG_DE_UM_PONTO, { headers: { 'content-type': 'image/png' } })
      const path = resolve(MORADA, file)
      if (!path.startsWith(MORADA + sep)) return new Response('Fora da pasta', { status: 403 })
      const f = Bun.file(path)
      return (await f.exists()) ? new Response(f) : new Response('não achei', { status: 404 })
    }
    return new Response(HTML, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  },
})
console.log(`Arquipélago no ar em http://127.0.0.1:${PORTA}`)
