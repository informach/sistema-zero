/**
 * O sorteio do avatar, o mesmo algoritmo do pack (o "gerar personagem aleatório" da ferramenta
 * dele), com uma semente: a mesma semente dá sempre o mesmo avatar.
 *
 * Como o pack sorteia: começa com corpo e rosto e todos os grupos liberados. Os passos vão em
 * ordem; o grupo de um passo, se ainda liberado, liga com a chance do passo, com uma peça ao acaso.
 * Ligado, só continuam liberados os grupos compatíveis com ele (mais o que ele "libera", com a
 * chance dele). Não ligado, só ele sai da lista. A fantasia, ligada, encerra o sorteio.
 *
 * O que muda aqui: o filtro de menina, menino ou todos; só as peças que a pessoa pode usar (por
 * padrão, as grátis); e as expressões do rosto (um avatar novo não nasce chorando).
 */
import { type AvatarSlots, equipPart, withEars } from './rules'
import type { AvatarAudience, AvatarCatalog, AvatarPartEntry, AvatarTier } from './types'

export type AvatarFilter = 'girl' | 'boy' | 'all'

export interface DrawOptions {
  /** Menina, menino ou todos. */
  filter?: AvatarFilter
  /** As faixas de peça que podem sair. Padrão: só as grátis. */
  tiers?: readonly AvatarTier[]
  /** As expressões de rosto que podem sair. Padrão: as simpáticas. */
  expressions?: readonly string[]
  /** Peças a mais que podem sair, mesmo fora das faixas (as que a pessoa tem). */
  owned?: ReadonlySet<string>
}

export const FRIENDLY_EXPRESSIONS = ['normal', 'neutro', 'feliz'] as const

/** Gerador de números de 0 a 1 a partir de uma semente (mulberry32). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A peça aparece para quem escolheu este filtro. */
export function matchesFilter(audience: AvatarAudience, filter: AvatarFilter): boolean {
  return filter === 'all' || audience === 'both' || audience === filter
}

/** A peça pode aparecer na loja e no sorteio (não está escondida nem aposentada). */
export function isListed(part: AvatarPartEntry): boolean {
  return !part.hidden && !part.retired
}

export function drawAvatar(
  catalog: AvatarCatalog,
  seed: string,
  options: DrawOptions = {},
): AvatarSlots {
  const aleatorio = seededRandom(seed)
  const filtro = options.filter ?? 'all'
  const faixas = new Set(options.tiers ?? ['free'])
  const expressoes = new Set(options.expressions ?? FRIENDLY_EXPRESSIONS)
  const fora = new Set(catalog.rules.draw.excluded)

  const pode = (id: string): boolean => {
    // O grupo da fantasia lista CONJUNTOS (o pack sorteia a fantasia inteira), não peças.
    const conjunto = catalog.sets[id]
    if (conjunto) return faixas.has(conjunto.tier) || (options.owned?.has(id) ?? false)
    const p = catalog.parts[id]
    if (!p || !isListed(p) || fora.has(id)) return false
    if (!matchesFilter(p.audience, filtro)) return false
    if (p.face && !expressoes.has(p.face.expression)) return false
    if (p.set) {
      const conjunto = catalog.sets[p.set]
      return Boolean(conjunto && (faixas.has(conjunto.tier) || options.owned?.has(p.set)))
    }
    return faixas.has(p.tier) || (options.owned?.has(id) ?? false)
  }
  const escolher = (grupo: string): string | undefined => {
    const pecas = (catalog.rules.groups[grupo]?.parts ?? []).filter(pode)
    return pecas[Math.floor(aleatorio() * pecas.length)]
  }

  let slots: AvatarSlots = {}
  let liberados = new Set(Object.keys(catalog.rules.groups))
  const ligados = new Set<string>()
  for (const passo of catalog.rules.draw.steps) {
    if (!liberados.has(passo.group)) continue
    const liga = aleatorio() < passo.probability
    const peca = liga ? escolher(passo.group) : undefined
    if (!peca) {
      liberados.delete(passo.group)
      continue
    }
    const conjunto = catalog.sets[peca]
    slots = equipPart(catalog, slots, conjunto ? (conjunto.parts[0]?.part ?? '') : peca)
    ligados.add(passo.group)
    if (conjunto) break
    if (passo.compatible) {
      const proximos = new Set(passo.compatible.filter((g) => liberados.has(g)))
      const bloqueado = passo.unlocksUnlessOn?.some((g) => ligados.has(g)) ?? false
      if (passo.unlocks && !bloqueado && aleatorio() < (passo.unlockChance ?? 1))
        proximos.add(passo.unlocks)
      liberados = proximos
    }
  }
  // Corpo e rosto sempre: se o filtro deixou o passo sem peça, vale o padrão do pack.
  for (const slot of ['corpo', 'rosto'] as const) {
    if (!slots[slot]) {
      const padrao = catalog.rules.default[slot]
      if (padrao) slots = equipPart(catalog, slots, padrao)
    }
  }
  return withEars(catalog, slots)
}
