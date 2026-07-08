/**
 * Helpers PUROS da seleção/ordenação do carrossel do IG (testados em
 * tests/carousel.test.ts). A ORDEM da lista é a ordem do post — imutáveis
 * (sempre devolvem um array novo).
 */

export const CAROUSEL_MIN = 2
export const CAROUSEL_MAX = 10

/** Seleciona/desseleciona: entra no FIM; fora sai preservando a ordem dos demais. */
export function toggleAsset(selected: string[], assetId: string): string[] {
  if (selected.includes(assetId)) return selected.filter((id) => id !== assetId)
  if (selected.length >= CAROUSEL_MAX) return selected
  return [...selected, assetId]
}

/** Move o item uma posição (setas ↑↓). Bordas são no-op. */
export function moveAsset(selected: string[], assetId: string, direction: -1 | 1): string[] {
  const from = selected.indexOf(assetId)
  if (from === -1) return selected
  const to = from + direction
  if (to < 0 || to >= selected.length) return selected
  const next = [...selected]
  const [item] = next.splice(from, 1)
  if (item === undefined) return selected
  next.splice(to, 0, item)
  return next
}

/** Pronto p/ agendar automático: 2..10 imagens selecionadas. */
export function isCarouselReady(selected: string[]): boolean {
  return selected.length >= CAROUSEL_MIN && selected.length <= CAROUSEL_MAX
}
