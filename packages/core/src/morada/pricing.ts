/**
 * Preço e posse das peças Morada (decisão da dona, 14/11/2026: a régua do avatar).
 *
 * O preço é editorial e mora em `prices.generated.ts`, fora do `catalog.generated.ts`: o
 * `scripts/morada/migrar.ts` reescreve o catálogo inteiro a cada importação e apagaria o preço.
 * O `scripts/morada/propor-precos.ts` preserva o que já está no arquivo e só propõe preço para
 * peça nova (com `review`).
 *
 * - Construção (paredes, pisos, portas, janelas, telhados, cercas, lotes) é sempre grátis.
 * - Peça sem entrada no arquivo é grátis (peça nova da arte ainda sem proposta).
 * - `trophy`: os oito troféus e a estante de troféus, ganhos por conquista, nunca à venda.
 */
import { MORADA_CATALOG } from './catalog.generated'
import { MORADA_PRICES } from './prices.generated'
import type { MoradaCatalog, MoradaInstance, MoradaPiece } from './types'

export type MoradaTier = 'free' | 'coins' | 'trophy'
export type MoradaBand = 'comum' | 'especial' | 'raro'

export interface MoradaPrice {
  tier: MoradaTier
  /** Moedas (0 no grátis e no troféu). */
  price: number
  band?: MoradaBand
  /** Preço proposto pela régua, ainda não conferido. */
  review?: true
  /**
   * Só na comunidade adulta: no Kids não aparece no Meu quarto e não se compra (as peças de
   * cassino, decisão da dona de 14/11/2026, como o chapéu de cerveja do avatar).
   */
  adultOnly?: true
}

/** A peça é só do adulto (no Kids não aparece nem se compra). */
export function isMoradaAdultOnly(
  pieceId: string,
  prices: Readonly<Record<string, MoradaPrice>> = MORADA_PRICES,
): boolean {
  return prices[pieceId]?.adultOnly === true
}

/**
 * A estante de troféus (a "Vitrine de troféus" da arte): vem de graça com o primeiro troféu, como
 * a `estante-trofeus` do quarto antigo, aparece na aba Troféus e é a primeira oferecida para pôr um
 * troféu (os troféus continuam podendo ir em outras superfícies).
 */
export const MORADA_TROPHY_SHELF = 'moveis/escola/vitrine_trofeus'
/** O id da estante no inventário antigo (`room_inventory`), dado com o primeiro troféu. */
export const LEGACY_TROPHY_SHELF = 'estante-trofeus'

const GRATIS: MoradaPrice = { tier: 'free', price: 0 }
const TROFEU: MoradaPrice = { tier: 'trophy', price: 0 }

/** O preço de uma peça (grátis quando não há entrada, ou é construção). */
export function moradaPrice(
  pieceId: string,
  catalog: MoradaCatalog = MORADA_CATALOG,
  prices: Readonly<Record<string, MoradaPrice>> = MORADA_PRICES,
): MoradaPrice {
  const piece: MoradaPiece | undefined = catalog.pieces[pieceId]
  if (pieceId === MORADA_TROPHY_SHELF || piece?.tags.includes('trophy')) return TROFEU
  if (!piece || piece.kind === 'construction') return GRATIS
  return prices[pieceId] ?? GRATIS
}

export function isMoradaFree(pieceId: string, catalog?: MoradaCatalog): boolean {
  return moradaPrice(pieceId, catalog).tier === 'free'
}

/** Troféu ou a estante de troféus: só por conquista. */
export function isMoradaTrophyTier(pieceId: string, catalog?: MoradaCatalog): boolean {
  return moradaPrice(pieceId, catalog).tier === 'trophy'
}

/**
 * A régua única de posse (o editor da plataforma, o serviço e o jogo): a peça existe e é grátis,
 * ou está em `owned` (comprada, conquistada ou que a criança já tinha na casa).
 */
export function moradaPieceAllowed(
  pieceId: string,
  owned: readonly string[] | ReadonlySet<string>,
  catalog: MoradaCatalog = MORADA_CATALOG,
): boolean {
  if (!catalog.pieces[pieceId]) return false
  if (isMoradaFree(pieceId, catalog)) return true
  return Array.isArray(owned)
    ? owned.includes(pieceId)
    : (owned as ReadonlySet<string>).has(pieceId)
}

/**
 * Uma instância da casa: as funções do jogo (`behavior: objeto:<id>`, a geladeira, o fliperama, o
 * museu…) chegam pela conquista no jogo, que o serviço do jogo confere; as outras seguem a posse.
 */
export function moradaInstanceAllowed(
  instance: Pick<MoradaInstance, 'pieceId' | 'behavior'>,
  owned: readonly string[] | ReadonlySet<string>,
  catalog: MoradaCatalog = MORADA_CATALOG,
): boolean {
  if (!catalog.pieces[instance.pieceId]) return false
  if (instance.behavior?.startsWith('objeto:') && !isMoradaTrophyTier(instance.pieceId, catalog))
    return true
  return moradaPieceAllowed(instance.pieceId, owned, catalog)
}
