import { getEnv } from '@/lib/env'

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams
  const code = query.get('code') ?? '',
    slug = query.get('offer') ?? '',
    audience = query.get('audience') ?? ''
  const fail = (message: string, status: number) =>
    Response.json({ error: { code: 'COUPON_LINK_UNAVAILABLE', message } }, { status })
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,59}$/.test(code) ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    !['kids', 'adult'].includes(audience)
  )
    return fail('Confira o cupom, a oferta e a comunidade.', 400)
  const base = getEnv().FUNNEL_PUBLIC_URL
  if (!base) return fail('O endereço público de divulgação ainda não foi configurado.', 503)
  try {
    const check = new URL('/api/oferta-link', base)
    check.search = new URLSearchParams({ oferta: slug, publico: audience }).toString()
    const response = await fetch(check, { cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!response.ok) return fail('Não foi possível conferir a página de compra.', 503)
    const result = (await response.json()) as { available?: unknown }
    if (result.available !== true)
      return fail('Esta oferta ainda não tem uma página de compra configurada.', 409)
    const url = new URL(`/cupom/${encodeURIComponent(code)}`, base)
    url.search = new URLSearchParams({ oferta: slug, publico: audience }).toString()
    return Response.json({ url: url.toString() }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return fail('Não foi possível conferir a página de compra. Tente novamente.', 503)
  }
}
