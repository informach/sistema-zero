import type { APIRoute } from 'astro'
import { resolveCouponOfferPath } from '../../server/coupon-link'
import { getDeps } from '../../server/deps'

export const prerender = false
export const GET: APIRoute = async ({ params, url }) => {
  const code = params.codigo ?? ''
  const slug = url.searchParams.get('oferta') ?? ''
  const audience = url.searchParams.get('publico') ?? ''
  const headers = { 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,59}$/.test(code))
    return new Response('Cupom inválido.', { status: 400, headers })
  const { env, gateway } = getDeps()
  const path = await resolveCouponOfferPath(env, gateway, slug, audience)
  if (!path)
    return new Response('Esta oferta não tem uma página de compra disponível neste link.', {
      status: 404,
      headers,
    })
  const target = new URL(path, url)
  target.searchParams.set('cupom', code.toUpperCase())
  const event = url.searchParams.get('event_code')
  if (event && /^[a-z0-9-]{4,32}$/.test(event)) target.searchParams.set('event_code', event)
  // Mesmo expirado, o código chega à página: ela mostra o aviso e o preço normal.
  return new Response(null, {
    status: 302,
    headers: { ...headers, location: `${target.pathname}${target.search}` },
  })
}
