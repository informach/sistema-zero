// A oferta principal de cada página no catálogo falso dos testes de navegador (25/11/2026: o funil
// lê `GET /catalog/products/by-sku/:sku` → `primaryOfferSlug`, sem as envs `FUNNEL_OFFER_*`).

export const PAGE_PRIMARIES: Record<string, string> = {
  'comunidade-dos-criadores': 'comunidade-dos-criadores-mensal',
  'comunidade-dos-criadores-adulto': 'comunidade-dos-criadores-adulto-mensal',
  'desafio-primeiro-jogo': 'desafio-primeiro-jogo-30-dias',
  'desafio-primeiro-jogo-adulto': 'desafio-primeiro-jogo-adulto-30-dias',
  'cade-todo-mundo': 'cade-todo-mundo-1-ano',
  'cade-todo-mundo-adulto': 'cade-todo-mundo-adulto-1-ano',
  'transformando-o-vilao-em-aliado': 'transformando-o-vilao-em-aliado-1-ano',
  'como-ajudar-seu-filho-autista-nas-frustracoes':
    'como-ajudar-seu-filho-autista-nas-frustracoes-1-ano',
}

/** O corpo de `GET /catalog/products/by-sku/:sku`, ou null se o caminho não é esse. */
export function productResponse(
  pathname: string,
  primaries: Record<string, string> = PAGE_PRIMARIES,
): { status: number; body: unknown } | null {
  const sku = pathname.match(/^\/catalog\/products\/by-sku\/([^/]+)$/)?.[1]
  if (!sku) return null
  const slug = primaries[decodeURIComponent(sku)]
  return slug
    ? { status: 200, body: { sku, primaryOfferSlug: slug } }
    : { status: 404, body: { error: { code: 'PRODUCT_NOT_FOUND' } } }
}
