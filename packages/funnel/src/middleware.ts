import { defineMiddleware } from 'astro:middleware'
import { rateLimit } from './lib/rate-limit'

// NOTA: a middleware roda nas rotas on-demand (SSR) — checkout, admin, resultado
// e /api/*. Páginas de marketing pré-renderizadas são servidas como estáticas e
// NÃO passam por aqui em runtime; para essas, configure os headers no proxy/CDN.

// Endpoints públicos de escrita que recebem um teto best-effort por IP.
const RATE_LIMITED = /^\/api\/(leads|events|contact|checkout)(\/|$)/
const RATE_LIMIT = 240 // requisições…
const RATE_WINDOW_MS = 60_000 // …por minuto, por IP (generoso: o quiz faz ~12 PATCH)

// Origens do checkout de cartão (payment-token-efi v3 — tokenização no browser):
// API de cobranças da Efí (produção + sandbox/homolog., installments/pubkey),
// tokenizer (salt/card) e fingerprint antifraude da ClearSale (fp.js + pixels).
// Sem elas a CSP bloqueia a tokenização e o isScriptBlocked() acusa "adblock" à toa.
const EFI_API = 'https://cobrancas.api.efipay.com.br https://cobrancas-h.api.efipay.com.br'
const EFI_TOKENIZER = 'https://tokenizer.sejaefi.com.br'
const EFI_FINGERPRINT = 'https://device.clearsale.com.br https://web.fpcs-monitor.com.br'

// Extras SÓ DE DEV (nunca vão a produção): o cliente HMR do Vite cria um
// SharedWorker via `blob:` p/ detectar o restart do server (sem `worker-src` o
// fallback é o script-src e a CSP o bloqueava — "Creating a worker from blob:...
// has been blocked" + auto-reload quebrado) e usa eval em deps otimizadas.
const DEV = import.meta.env.DEV

const CSP = [
  "default-src 'self'",
  `img-src 'self' data: ${EFI_FINGERPRINT}`, // QR do Pix vem como data:image/png;base64 + pixels fp.png
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'", // estilos inline do Astro/Tailwind + style={}
  // hidratação + JSON-LD inline + onerror da imagem + fp.js
  `script-src 'self' 'unsafe-inline'${DEV ? " 'unsafe-eval'" : ''} https://device.clearsale.com.br`,
  ...(DEV ? ["worker-src 'self' blob:"] : []),
  `connect-src 'self' ${EFI_API} ${EFI_TOKENIZER} ${EFI_FINGERPRINT}`,
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
