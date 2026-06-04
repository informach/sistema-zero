/**
 * Geração de slugs/SKUs/codes a partir de texto livre (auto-preenchimento dos
 * formulários do catálogo). Os formatos espelham os value objects do catalog:
 * - Slug: `^[a-z0-9]+(?:-[a-z0-9]+)*$` (max 140)
 * - Sku/code: `^[a-z0-9][a-z0-9._-]*$` (max 80) — ⚠️ o catálogo normaliza para
 *   MINÚSCULAS; gerar em caixa alta causaria VALIDATION_ERROR (400).
 * Kebab minúsculo satisfaz os dois.
 */

const DIACRITICS = /[̀-ͯ]/g

/** Texto livre → kebab minúsculo sem acentos (ex.: "Olá Mundo!" → "ola-mundo"). */
export function slugify(input: string, maxLen = 140): string {
  return input
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/, '') // o corte do teto pode terminar em hífen
}

/** SKU/código estável derivado do nome (mesmo kebab, teto do Sku VO: 80). */
export function skuify(input: string): string {
  return slugify(input, 80)
}

export interface OfferSuggestionInput {
  productName: string
  priceCents: number
  mode: 'one_time' | 'subscription'
}

/** Rótulo do preço p/ slug: sem centavos quando inteiros ("9700"→"97", "9790"→"97-90"). */
function priceLabel(priceCents: number): string {
  if (!Number.isFinite(priceCents) || priceCents <= 0) return ''
  const reais = Math.floor(priceCents / 100)
  const cents = priceCents % 100
  return cents === 0 ? String(reais) : `${reais}-${String(cents).padStart(2, '0')}`
}

/**
 * Slug sugerido da oferta: produto + preço + modo.
 * Ex.: { "No Comando da IA", 9700, one_time } → "no-comando-da-ia-97-a-vista".
 */
export function offerSlugSuggestion(input: OfferSuggestionInput): string {
  const mode = input.mode === 'subscription' ? 'assinatura' : 'a-vista'
  const parts = [slugify(input.productName), priceLabel(input.priceCents), mode]
  return slugify(parts.filter(Boolean).join('-'))
}

/** Code sugerido da oferta (identificador interno estável, formato do Sku VO). */
export function offerCodeSuggestion(input: OfferSuggestionInput): string {
  return slugify(offerSlugSuggestion(input), 80)
}
