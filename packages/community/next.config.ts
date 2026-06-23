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
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // `blob:` p/ o preview/iframe do bloco `studio` (editor embarcável @sistemazero/studio).
  "frame-src 'self' blob: https://www.youtube-nocookie.com https://player.vimeo.com",
  // Capas de curso são URLs externas arbitrárias da autoria + avatares do R2.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  // Blocos de áudio (bucket R2 público) e vídeo "file" legado tocam URL externa.
  "media-src 'self' blob: https:",
  "style-src 'self' 'unsafe-inline' https:",
  // `data:` p/ o preview do Estúdio (bloco `studio`): o script.js do aluno é injetado
  // como `<script src="data:text/javascript;base64,…">` no iframe `srcdoc`, que HERDA
  // esta CSP (só RESTRINGE, nunca relaxa) — sem `data:`, o preview não executa o código.
  `script-src 'self' 'unsafe-inline' data: https:${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https:",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Isolamento de janela/recurso (defesa em profundidade). COOP corta a referência
  // de janela de um abridor cross-origin; CORP barra que outra origem embuta as
  // respostas autenticadas como subrecurso (sondagem por timing). COEP fica OFF de
  // propósito: quebraria os iframes cross-origin de vídeo (youtube-nocookie/vimeo) e
  // só é preciso p/ SharedArrayBuffer (terminal off).
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
    'three',
  ],
  // Security headers em TODAS as respostas (inclui `/api/me/avatar` e estáticos,
  // fora do matcher do `proxy.ts`). Fonte única — não duplicar no proxy.
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Kill-switch do service worker fantasma (public/sw.js): o update-check do
      // navegador precisa SEMPRE buscar a versão nova — nunca servir do cache HTTP.
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
    ]
  },
}

export default nextConfig
