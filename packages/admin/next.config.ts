import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

// Raiz do MONOREPO: o file tracing do standalone precisa enxergar o workspace
// (@sistemazero/ui, sharp hasteado) — sem isso o server.js sai sem dependências.
const monorepoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const isDev = process.env.NODE_ENV !== 'production'

/**
 * CSP do painel (defesa em profundidade — não há sink de HTML cru no app). Sem
 * nonce: o Next 16 injeta scripts inline de bootstrap e o Tailwind/libs injetam
 * estilos inline → `'unsafe-inline'` é necessário (e em dev o Turbopack/HMR usa
 * `eval`). Fontes externas reais:
 *  - `connect-src` libera os hosts de UPLOAD TUS do Vimeo (o vídeo sobe DIRETO do
 *    browser p/ o `uploadLink` — `*.cloud.vimeo.com`/`*.vimeo.com`). ⚠️ Se o Vimeo
 *    trocar de host de upload, re-extraia daí (sintoma: upload some com erro de CSP).
 *  - `connect-src` também libera `*.r2.cloudflarestorage.com`: anexo/e-book (PDF até
 *    200MB) sobe DIRETO do browser p/ o R2 via URL PUT pré-assinada — sem isso o teto
 *    de 100MB do Cloudflare Free (que fica na frente do admin) cortaria o upload.
 *  - `img-src https:` p/ as capas (R2 público + URL externa colada na autoria).
 *  - `frame-src player.vimeo.com` p/ o preview de vídeo no editor.
 *  - `static.cloudflareinsights.com` (script) + `cloudflareinsights.com` (connect): o
 *    admin fica atrás do Cloudflare (plano Free), que INJETA o beacon de Browser
 *    Insights (`beacon.min.js`) no HTML e o reporta em `cloudflareinsights.com/cdn-cgi/rum`
 *    — sem o allowlist a CSP bloqueia o script (ruído no console). Alternativa: desligar
 *    a injeção no dashboard do Cloudflare (Web Analytics) e remover estas duas entradas.
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // `blob:` p/ o preview/iframe do editor embarcável @sistemazero/studio (autoria + entregas).
  "frame-src 'self' blob: https://player.vimeo.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${isDev ? " 'unsafe-eval'" : ''}`,
  "connect-src 'self' https://*.vimeo.com https://*.cloud.vimeo.com https://*.r2.cloudflarestorage.com https://cloudflareinsights.com",
  "worker-src 'self' blob:",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Painel administrativo: nunca indexável por buscadores.
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
  // Painel administrativo não anuncia o framework na borda.
  poweredByHeader: false,
  // O painel é um BFF: nunca exponha segredos ao bundle do cliente.
  // Variáveis sem prefixo NEXT_PUBLIC_ ficam só no servidor.
  // sharp é binário nativo (.node) — não deixe o bundler tentar empacotá-lo.
  // (O Sentry NÃO usa SDK aqui — fala o protocolo de ingestão via fetch, sem dep
  // externa, justamente p/ não depender do tracing de externos do standalone.)
  serverExternalPackages: ['sharp'],
  // Pacotes workspace com TS cru (componentes compartilhados + editor embarcável) — transpilar junto.
  transpilePackages: ['@sistemazero/ui', '@sistemazero/studio'],
  // Security headers em TODAS as respostas (inclui `/api/media/*`, que fica fora
  // do matcher do `proxy.ts`). Fonte única — não duplicar no proxy.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
