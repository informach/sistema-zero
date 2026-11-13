/**
 * O catálogo do avatar (pack Cute Characters) visto pelo servidor.
 *
 * A fonte é o catálogo gerado do core (`@sistemazero/core/avatar`, escrito pela migração a partir
 * do repositório da arte): peças, conjuntos de fantasia, preços e regras. O members é quem decide
 * o que a pessoa TEM (inventário) e confere o que ela veste; o catálogo é o mesmo código na tela e
 * aqui, sem cópia.
 *
 * O que se compra: uma peça `coins` ou um conjunto de fantasia inteiro (o id do conjunto vai ao
 * inventário). Grátis e orelhas (`auto`) são de todo mundo. `festa` só o jogo concede.
 */
import { AVATAR_CATALOG, type AvatarCatalog } from '@sistemazero/core/avatar'

export { AVATAR_CATALOG }

/** Estilo do avatar gravado. `char-v1` era o boneco antigo (Quaternius). */
export const AVATAR_CHAR_STYLE = 'cute-v1' as const

export type AvatarItem =
  | { kind: 'part'; id: string; tier: 'free' | 'coins' | 'festa' | 'set' | 'auto'; price: number }
  | { kind: 'set'; id: string; tier: 'coins' | 'festa'; price: number }

/** Uma peça ou um conjunto de fantasia, pelo id. */
export function avatarItem(id: string, catalog: AvatarCatalog = AVATAR_CATALOG): AvatarItem | null {
  const conjunto = catalog.sets[id]
  if (conjunto) return { kind: 'set', id, tier: conjunto.tier, price: conjunto.price }
  const peca = catalog.parts[id]
  if (peca) return { kind: 'part', id, tier: peca.tier, price: peca.price }
  return null
}

/** O que precisa estar no inventário para vestir: peças pagas e da festa, e conjuntos. */
export function needsOwnership(item: AvatarItem): boolean {
  return item.kind === 'set' || item.tier === 'coins' || item.tier === 'festa'
}

/** Ids que podem ir ao inventário (o que se compra ou o jogo concede). */
export function inventoryIds(catalog: AvatarCatalog = AVATAR_CATALOG): ReadonlySet<string> {
  const ids = new Set<string>(Object.keys(catalog.sets))
  for (const [id, p] of Object.entries(catalog.parts))
    if (p.tier === 'coins' || p.tier === 'festa') ids.add(id)
  return ids
}
