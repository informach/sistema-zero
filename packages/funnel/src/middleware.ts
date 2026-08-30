import { defineMiddleware } from 'astro:middleware'
import { clientIp } from './lib/client-ip'
import { getEnv } from './lib/env'
import { rateLimit } from './lib/rate-limit'
import { isRateLimitedGetPath } from './lib/rate-limit-paths'
import { captureError } from './lib/sentry'

// NOTA: TODAS as páginas são SSR (full review 06/2026: quiz/políticas deixaram o
// prerender) — a middleware cobre o site inteiro com os security headers. Se uma
// página voltar a ser pré-renderizada, ela é servida estática SEM passar por aqui
// (e o branch de rate limit não pode rodar no prerender do build — ver abaixo).

// Endpoints públicos de escrita que recebem um teto best-effort por IP.
const RATE_LIMITED_WRITE = /^\/api\/(leads|events|contact|checkout|bolsa|embaixador)(\/|$)/
const WRITE_LIMIT = 240 // requisições…
const RATE_WINDOW_MS = 60_000 // …por minuto, por IP (generoso: o quiz faz ~12 PATCH)

// GETs que tocam banco/gateway (full review 06/2026 — antes NENHUM GET tinha teto):
//  - checkout (contato válido na URL INSERE lead) e resultado (insere evento),
//    incluindo rotas multi-funil `/<audience>/<produto>/...`;
//  - /api/checkout/:id (cada hit = 1 chamada assinada ao gateway; o teto de
//    3000/min lá é AGREGADO do consumer `funnel` — sem teto por IP, um só
//    cliente esgotava o budget de polling de TODOS os compradores pendentes);
//  - /api/leads (leitura de banco) e /admin + /api/admin/* (cookie lixo dispara
//    2 chamadas S2S — me+refresh — por request).
const GET_LIMIT = 360 // por minuto por IP — folga p/ CGNAT (polling ≈ 17/min por comprador)

// Login do admin tem bucket PRÓPRIO, bem mais apertado (anti brute-force por IP;
// o cooldown por conta do auth é a defesa principal — isto barra o spray barato).
const ADMIN_LOGIN_PATH = '/api/admin/login'
const ADMIN_LOGIN_LIMIT = 10 // por minuto, por IP

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
  const isWrite = method === 'POST' || method === 'PATCH'
  const isAdminLogin = isWrite && ctx.url.pathname === ADMIN_LOGIN_PATH
  const writeLimited = isWrite && (isAdminLogin || RATE_LIMITED_WRITE.test(ctx.url.pathname))
  const getLimited = method === 'GET' && isRateLimitedGetPath(ctx.url.pathname)
  if (writeLimited || getLimited) {
    // getEnv()/clientAddress SÓ aqui dentro: se alguma página voltar ao
    // prerender, a middleware roda no build (só GET, paths de marketing — não
    // casam os regex), onde não há env de runtime nem clientAddress.
    const ip = clientIp(ctx.request, ctx.clientAddress || 'unknown', getEnv().TRUST_PROXY)
    const [key, limit]: [string, number] = isAdminLogin
      ? [`${ip}:admin-login`, ADMIN_LOGIN_LIMIT]
      : getLimited
        ? [`${ip}:funnel-get`, GET_LIMIT]
        : [`${ip}:funnel-api`, WRITE_LIMIT]
    const { allowed, retryAfterSeconds } = rateLimit(key, limit, RATE_WINDOW_MS, Date.now())
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

  let res: Response
  try {
    res = await next()
  } catch (err) {
    // Exceção não tratada de rota/render → evento canônico no Sentry (com
    // stack); o Astro segue renderizando o 500 normalmente.
    captureError(err)
    throw err
  }
  applySecurityHeaders(res.headers)
  // API nunca é cacheável — default p/ handlers que não setam o próprio header
  // (alguns setam no-store explicitamente; nenhum quer cache compartilhado).
  if (ctx.url.pathname.startsWith('/api/') && !res.headers.has('cache-control')) {
    res.headers.set('cache-control', 'no-store')
  }
  return res
})
