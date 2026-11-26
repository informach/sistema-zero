import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'

/**
 * A régua ÚNICA de "esta oferta pode ser vendida na página do curso" (25/11/2026): produto ativo
 * e a oferta é a PRINCIPAL do produto (`primaryOfferSlug`, do catálogo) ou está marcada no Admin
 * "Pode ser vendida na página do produto" (`content.pageSellable`). A oferta de presente nunca
 * recebe a marca, então nunca abre à venda. Usada pelo BFF do mini checkout (origem `offer`) e
 * pela leitura que monta os cartões dos cursos para pais: os dois nunca divergem.
 */

type ProductFetch = (
  sku: string,
) => Promise<{ status: number; body?: { primaryOfferSlug?: unknown } | null } | null>

/** A busca do produto pelo SKU, guardada por 60 s por processo (ela entra em toda tela de compra). */
const PRIMARY_CACHE_MS = 60_000
const MAX_ENTRIES = 500
const cache = new Map<string, { value: string | null; until: number }>()

/**
 * O slug da oferta principal do produto; `null` se não há; `'unavailable'` se o catálogo não
 * respondeu (quem chama mostra "tente de novo", nunca "não está à venda"). Só resultados firmes
 * (200 ou 404) ficam guardados.
 */
export async function primaryOfferSlugFor(
  fetchProduct: ProductFetch,
  sku: string,
  now = Date.now(),
): Promise<string | null | 'unavailable'> {
  const hit = cache.get(sku)
  if (hit && hit.until > now) return hit.value
  const found = await fetchProduct(sku).catch(() => null)
  if (!found || (found.status !== 200 && found.status !== 404)) return 'unavailable'
  const slug = found.body?.primaryOfferSlug
  const value = found.status === 200 && typeof slug === 'string' ? slug : null
  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(sku, { value, until: now + PRIMARY_CACHE_MS })
  return value
}

/** Hook de teste. */
export function clearPrimaryOfferCache(): void {
  cache.clear()
}

/**
 * `'sellable'`, `'not-sellable'` ou `'unavailable'` (catálogo fora ao conferir a principal).
 * A oferta precisa estar disponível; produto não ativo nunca vende.
 */
export async function pageSellableStatus(
  target: CommerceCatalogOffer,
  fetchProduct: ProductFetch,
  now?: number,
): Promise<'sellable' | 'not-sellable' | 'unavailable'> {
  if (!target.isAvailable || target.product.status !== 'active') return 'not-sellable'
  if (target.content?.pageSellable === true) return 'sellable'
  const primary = await primaryOfferSlugFor(fetchProduct, target.product.sku, now)
  if (primary === 'unavailable') return 'unavailable'
  return primary === target.slug ? 'sellable' : 'not-sellable'
}
