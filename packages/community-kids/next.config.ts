import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

// Raiz do MONOREPO: o file tracing do standalone precisa enxergar o workspace
// (@sistemazero/ui, sharp hasteado) — sem isso o server.js sai sem dependências.
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const isDev = process.env.NODE_ENV !== 'production'

/**
 * CSP da área do aluno (defesa em profundidade — não há sink de HTML cru: o
 * rich_text usa conversor markdown controlado e embeds rodam em sandbox). Sem
 * nonce: o Next 16 injeta scripts inline de bootstrap e Tailwind/libs injetam
 * estilos inline → `'unsafe-inline'` (e em dev o Turbopack/HMR usa `eval`).
 *
 * ⚠️ O bloco interativo/embed v3 é `iframe srcDoc`, e documento `srcdoc` HERDA a
 * CSP do pai: conteúdo autoral (CodeMirror do admin) pode puxar lib/fonte/CSS de
 * CDN e fazer fetch — por isso `https:` em script/style/font/connect/img/media
 * (a fronteira REAL do embed é o sandbox SEM allow-same-origin). Os ganhos duros
 * que ficam: `object-src 'none'`, `base-uri`/`form-action 'self'`,
 * `frame-ancestors 'none'` e `frame-src` em ALLOWLIST (YouTube nocookie + Vimeo
 * — iframe de vídeo nunca aponta p/ host arbitrário; srcdoc não passa por
 * frame-src). `worker-src blob:` é o pdf.js do livro 3D (worker do bundle).
 */
/**
 * Monta a CSP. `pro:true` = a rota ISOLADA do modo Código (`/estudio/pro`), a
 * ÚNICA que roda o WebContainer: relaxa `script-src` p/ `'unsafe-eval'`/
 * `'wasm-unsafe-eval'`/`blob:` e libera o iframe do webcontainer em `frame-src`.
 * Esse afrouxamento fica ESCOPADO nessa rota (ver `headers()`); o resto do app kids
 * mantém a CSP estrita e SEM WASM. `connect-src https:`/`worker-src blob:` já cobrem.
 */
function buildCsp({ pro }: { pro: boolean }): string {
  const scriptSrc = pro
    ? "script-src 'self' 'unsafe-inline' data: https: 'unsafe-eval' 'wasm-unsafe-eval' blob:"
    : `script-src 'self' 'unsafe-inline' data: https:${isDev ? " 'unsafe-eval'" : ''}`
  // `blob:` p/ o preview/iframe do bloco `studio`; no pro, + os iframes do WebContainer:
  // o dev-server (`*.webcontainer-api.io`) E o iframe de BOOT (`stackblitz.com`/
  // `*.staticblitz.com`) — sem este último o WebContainer nunca boota (o console
  // acusa "Framing 'https://stackblitz.com/' violates frame-src"). A doc do Studio
  // (embedding.md) listava só o webcontainer-api.io; o boot real usa o stackblitz.
  const frameSrc = pro
    ? "frame-src 'self' blob: https://www.youtube-nocookie.com https://player.vimeo.com https://*.webcontainer-api.io https://stackblitz.com https://*.staticblitz.com"
    : "frame-src 'self' blob: https://www.youtube-nocookie.com https://player.vimeo.com"
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    frameSrc,
    // Capas de curso são URLs externas arbitrárias da autoria + avatares do R2.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    // Blocos de áudio (bucket R2 público) e vídeo "file" legado tocam URL externa.
    "media-src 'self' blob: https:",
    "style-src 'self' 'unsafe-inline' https:",
    // `data:` p/ o preview do Estúdio (@sistemazero/studio): o script.js do aluno é
    // injetado como `<script src="data:text/javascript;base64,…">` dentro do iframe
    // `srcdoc`, que HERDA esta CSP (só pode RESTRINGIR, nunca relaxar) — sem `data:`
    // aqui, o preview do bloco/estúdio não executa o código da criança. Risco baixo: já
    // há `'unsafe-inline'` e não existe sink de HTML cru; o sandbox SEM allow-same-origin
    // segue sendo a fronteira real.
    scriptSrc,
    "connect-src 'self' https:",
    "worker-src 'self' blob:",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ')
}

const strictCsp = buildCsp({ pro: false })
const proCsp = buildCsp({ pro: true })

// Headers de segurança comuns a TODAS as rotas — SEM a CSP (aplicada por-rota em
// `headers()`: estrita em tudo, relaxada só em `/estudio/pro`). COOP fica aqui (vale
// em toda página, inclusive a pro); a COEP é adicionada SÓ na rota pro.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Isolamento de janela/recurso (defesa em profundidade numa área infantil). COOP
  // corta a referência de janela de um abridor cross-origin; CORP barra que outra
  // origem embuta as respostas autenticadas como subrecurso (sondagem por timing).
  // COEP fica OFF globalmente de propósito (quebraria os iframes cross-origin de vídeo
  // youtube-nocookie/vimeo) — só a rota `/estudio/pro` a liga (credentialless), onde não
  // há vídeo e o WebContainer precisa do cross-origin isolation p/ o SharedArrayBuffer.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
  // Área do aluno é privada: nunca indexável por buscadores (espelha o admin).
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  // HSTS só em produção (TLS termina na borda do Railway; dev local é http).
  ...(isDev
    ? []
    : [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]),
]

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Deploy em container (Railway): `.next/standalone` com server.js mínimo.
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  // Área do aluno não anuncia o framework na borda.
  poweredByHeader: false,
  // O app é um BFF: nunca exponha segredos ao bundle do cliente.
  // Variáveis sem prefixo NEXT_PUBLIC_ ficam só no servidor.
  // sharp é binário nativo (upload de avatar + marca d'água) — fora do bundler.
  // (O Sentry NÃO usa SDK aqui — ingestão via fetch, sem dep externa, imune ao
  // tracing de externos do standalone/Turbopack; mesma decisão do admin.)
  serverExternalPackages: ['sharp'],
  // Pacotes workspace com TS cru (componentes/BFF compartilhados) — transpilar junto.
  // three: recomendação oficial do react-three-fiber p/ Next 13.1+ (livro 3D do e-book).
  transpilePackages: [
    '@sistemazero/ui',
    '@sistemazero/member-shell',
    '@sistemazero/studio',
    '@sistemazero/pensa',
    '@sistemazero/pinta',
    'three',
  ],
  // Security headers em TODAS as respostas (inclui `/api/me/avatar` e estáticos,
  // fora do matcher do `proxy.ts`). Fonte única — não duplicar no proxy.
  //
  // ⚠️ A CSP é aplicada por-rota, NUNCA duas vezes na mesma rota: dois headers CSP =
  // o navegador enforça a INTERSEÇÃO (a estrita venceria e o WASM do WebContainer
  // seria bloqueado). Por isso a estrita usa um negative-lookahead que EXCLUI
  // `/estudio/pro`, e a rota pro recebe a sua própria CSP (relaxada) + COEP. QA em
  // navegador DEVE confirmar: `/estudio/pro` com COEP + `wasm-unsafe-eval`; todo o
  // resto com a CSP estrita e SEM COEP (os vídeos das aulas seguem tocando).
  async headers() {
    return [
      // Comuns a tudo (sem CSP; COOP/CORP/etc.).
      { source: '/:path*', headers: securityHeaders },
      // CSP ESTRITA em tudo, EXCETO a rota isolada do modo Código.
      {
        source: '/((?!estudio/pro).*)',
        headers: [{ key: 'Content-Security-Policy', value: strictCsp }],
      },
      // Rota isolada do modo Código (PRO/WebContainer): CSP relaxada (WASM) + COEP
      // credentialless — escopados AQUI para não vazar p/ as páginas com vídeo.
      {
        source: '/estudio/pro/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: proCsp },
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          // ⚠️ TEMPORÁRIO (cura de cache — remover após ~1 semana em produção):
          // navegadores que abriram a rota PRO ANTES do COEP nos chunks guardaram
          // o bootstrap de worker do Turbopack (`turbopack-worker-*.js`) com
          // `immutable` de 1 ano e SEM o header — e a URL nunca muda (a parte
          // variável vai no #fragment, fora da chave de cache). Sem isto, o
          // `new Worker()` do Monaco continua falhando nesses navegadores para
          // sempre. Limpa SÓ o cache HTTP da origem (aspas fazem parte do valor;
          // NUNCA usar "storage" — apagaria o IndexedDB com os projetos).
          { key: 'Clear-Site-Data', value: '"cache"' },
        ],
      },
      // Workers do Monaco DENTRO da rota PRO: uma página com COEP só cria um
      // dedicated worker se o SCRIPT do worker também vier com COEP (check de
      // compatibilidade de embedder policy do HTML spec). Os workers saem de
      // `/_next/static/chunks/…` — sem o header aqui, o `new Worker(...)` falha
      // com um error event e o Monaco cai no fallback de MAIN THREAD ("Could not
      // create web worker(s)…" no console; o compilador do TS ~11MB congelando a
      // UI). COEP em subrecurso que nunca é documento é INERTE nas demais
      // páginas (só documentos e worker scripts consultam o header) — os vídeos
      // das aulas seguem intactos.
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' }],
      },
      {
        // Assets do avatar 3D (~28MB de GLB/PNG) têm nomes estáveis de catálogo, mas NÃO são
        // hashados. Um TTL curto reduz revalidações repetidas sem prender uma correção de arte por
        // um ano no browser da criança. (Segurança + CSP estrita já vêm das regras acima.)
        source: '/avatar3d/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ]
  },
}

export default nextConfig
