import { defineMiddleware } from 'astro:middleware'
import { rateLimit } from './lib/rate-limit'

// NOTA: a middleware roda nas rotas on-demand (SSR) — checkout, admin, resultado
// e /api/*. Páginas de marketing pré-renderizadas são servidas como estáticas e
// NÃO passam por aqui em runtime; para essas, configure os headers no proxy/CDN.

// Endpoints públicos de escrita que recebem um teto best-effort por IP.
const RATE_LIMITED = /^\/api\/(leads|events|contact|checkout)(\/|$)/
const RATE_LIMIT = 240 // requisições…
const RATE_WINDOW_MS = 60_000 // …por minuto, por IP (generoso: o quiz faz ~12 PATCH)

const CSP = [
  "default-src 'self'",
  "img-src 'self' data:", // QR do Pix vem como data:image/png;base64
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'", // estilos inline do Astro/Tailwind + style={}
  "script-src 'self' 'unsafe-inline'", // hidratação + JSON-LD inline + onerror da imagem
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

function applySecurityHeaders(headers: Headers): void {
  headers.set('x-content-type-options', 'nosniff')
  headers.set('x-frame-options', 'DENY')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('permissions-policy', 'geolocation=(), microphone=(), camera=()')
  headers.set('content-security-policy', CSP)
  if (import.meta.env.PROD) {
    headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains')
  }
}

export const onRequest = defineMiddleware(async (ctx, next) => {
  const method = ctx.request.method
  if ((method === 'POST' || method === 'PATCH') && RATE_LIMITED.test(ctx.url.pathname)) {
    const { allowed, retryAfterSeconds } = rateLimit(
      `${ctx.clientAddress || 'unknown'}:funnel-api`,
      RATE_LIMIT,
      RATE_WINDOW_MS,
      Date.now(),
    )
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: { code: 'RATE_LIMITED', message: 'Muitas requisições. Tente em instantes.' },
        }),
        {
          status: 429,
          headers: {
            'content-type': 'application/json',
            'retry-after': String(retryAfterSeconds),
            'cache-control': 'no-store',
          },
        },
      )
    }
  }

  const res = await next()
  applySecurityHeaders(res.headers)
  return res
})
