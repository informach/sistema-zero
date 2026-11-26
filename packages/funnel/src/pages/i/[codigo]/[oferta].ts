import type { APIRoute } from 'astro'
import { getDeps } from '../../../server/deps'
import { referralLinkRedirect } from '../../../server/referral-link'

export const prerender = false
/** Link de indicação `/i/<código>[/<oferta>][/pagamento]` (ver `server/referral-link.ts`). */
export const GET: APIRoute = ({ params, url }) => {
  const { env, gateway, log } = getDeps()
  return referralLinkRedirect(
    url,
    { code: params.codigo, offer: params.oferta, target: params.destino },
    { gateway, log, secureCookie: env.NODE_ENV === 'production' },
  )
}
