import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

// Raiz do MONOREPO: o file tracing do standalone precisa enxergar o workspace
// (@sistemazero/ui) — sem isso o server.js sai sem dependências.
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const isDev = process.env.NODE_ENV !== 'production'

/**
 * CSP da ferramenta de marketing (defesa em profundidade — não há sink de HTML
 * cru no app). Sem nonce: o Next 16 injeta scripts inline de bootstrap e o
 * Tailwind/libs injetam estilos inline → `'unsafe-inline'` é necessário (e em dev
 * o Turbopack/HMR usa `eval`). Fontes externas reais:
 *  - `connect-src` libera `*.r2.cloudflarestorage.com`: a mídia (vídeo bruto/final,
 *    capa) sobe DIRETO do browser p/ o R2 via URL PUT pré-assinada pelo BACKEND
 *    (`POST /marketing/media/presign`) — o app nunca buffeia o arquivo.
 *  - `img-src`/`media-src https:` p/ previews de capa/vídeo servidos por URL
 *    pré-assinada do R2 (host varia) e URLs externas de publicação.
 *  - Cloudflare Insights: atrás do Cloudflare (Free) o beacon `beacon.min.js` é
 *    INJETADO na borda e reporta em `cloudflareinsights.com/cdn-cgi/rum` — coberto
 *    por `script-src https:` + explícito no `connect-src`. (Desligável no dashboard.)
 * Removido em relação ao admin (só fazia sentido lá): hosts do Vimeo
 * (connect-src/frame-src) e `script-src data:` (preview do Estúdio).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "frame-src 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "media-src 'self' blob: https:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https:${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https://*.r2.cloudflarestorage.com https://cloudflareinsights.com",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Ferramenta interna: nunca indexável por buscadores.
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
  // Ferramenta interna não anuncia o framework na borda.
  poweredByHeader: false,
  // O app é um BFF: nunca exponha segredos ao bundle do cliente.
  // Variáveis sem prefixo NEXT_PUBLIC_ ficam só no servidor.
  // (O Sentry NÃO usa SDK aqui — fala o protocolo de ingestão via fetch, sem dep
  // externa, justamente p/ não depender do tracing de externos do standalone.)
  // Pacotes workspace com TS cru (componentes compartilhados) — transpilar junto.
  transpilePackages: ['@sistemazero/ui'],
  // Security headers em TODAS as respostas. Fonte única — não duplicar no proxy.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
