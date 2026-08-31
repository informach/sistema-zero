import { AUDIENCES } from '../funnels/registry'

// GETs que tocam banco/gateway e precisam de teto best-effort por IP:
// - oferta/checkout/resultado antigos e multi-funil (`/<audience>/<produto>/...`);
// - /api/checkout/:id, /api/leads e admin;
// - /bolsa/<code> e /embaixador/<token> (cada hit SSR = 1 chamada assinada ao gateway).
// As audiências vêm do registry (fonte da verdade) — um público novo entra no teto sozinho.
const RATE_LIMITED_GET = new RegExp(
  `^\\/(?:oferta|checkout|resultado)\\/?$|^\\/(?:${AUDIENCES.join('|')})\\/[^/]+\\/(?:oferta|checkout|resultado)\\/?$|^\\/(?:bolsa|embaixador)(?:\\/|$)|^\\/admin(?:\\/|$)|^\\/api\\/(?:leads|checkout|admin)(?:\\/|$)`,
)

export function isRateLimitedGetPath(pathname: string): boolean {
  return RATE_LIMITED_GET.test(pathname)
}
