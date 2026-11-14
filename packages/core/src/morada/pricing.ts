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
 * As peças de cada função do jogo (`behavior: objeto:<id>`): a de sempre e as duas aparências da
 * galeria. ⚠️ Espelho de `MORADA_FUNCTION` e `MORADA_VARIANTS` do arquipelago (um teste de lá
 * confere que são iguais): o serviço precisa saber, sem o jogo, que peça cada função pode usar.
 */
export const MORADA_PECAS_DAS_FUNCOES: Readonly<Record<string, readonly string[]>> = {
  geladeira: [
    'moveis/cozinha_eletros/geladeira_duplex_branca',
    'moveis/cozinha_eletros/geladeira_retro_pes_rosa',
    'moveis/cozinha_eletros/geladeira_duas_portas_lilas',
  ],
  forno: [
    'moveis/cozinha_eletros/forno_eletrico_creme',
    'moveis/cozinha_eletros/forno_eletrico_vermelho',
    'moveis/cozinha_moveis/fogao_modulo_moderna',
  ],
  aquario: [
    'moveis/armarios/armario_vitrine_turquesa',
    'moveis/armarios/armario_vitrine_rosa',
    'moveis/armarios/armario_vitrine_amarelo',
  ],
  lareira: [
    'moveis/lareiras/lareira_branca_tampo_amarelo',
    'moveis/lareiras/lareira_tijolo_chamine',
    'moveis/lareiras/lareira_canto_coifa',
  ],
  banda: [
    'moveis/objetos/piano_armario_chocolate',
    'moveis/objetos/piano_armario_branco',
    'moveis/objetos/piano_cauda_preto',
  ],
  fliperama: [
    'moveis/jogos/fliperama_foguete_estelar',
    'moveis/jogos/fliperama_pista_turbo',
    'moveis/jogos/fliperama_abelha_zumzum',
  ],
  museu: [
    'moveis/estantes/estante_nichos_8_azul',
    'moveis/estantes/estante_escada_branca',
    'moveis/estantes/estante_tubos_3_laranja',
  ],
  casinha: [
    'moveis/objetos/arranhador_torre_casinha',
    'moveis/brinquedos/cabana_casinha_pano',
    'cidade/fazenda/casinha_ferramentas',
  ],
  'planta-interior': [
    'moveis/plantas/planta_costela_de_adao',
    'moveis/plantas/planta_jiboia',
    'moveis/plantas/planta_palmeira_areca',
  ],
}

/** A instância é uma função do jogo de verdade: o `objeto:<id>` numa peça daquela função. */
export function isMoradaFunctionInstance(
  instance: Pick<MoradaInstance, 'pieceId' | 'behavior'>,
): boolean {
  const id = instance.behavior?.startsWith('objeto:') ? instance.behavior.slice(7) : null
  return !!id && (MORADA_PECAS_DAS_FUNCOES[id]?.includes(instance.pieceId) ?? false)
}

/**
 * Uma instância da casa: as funções do jogo (a geladeira, o fliperama, o museu…, cada uma só nas
 * peças dela) chegam pela conquista no jogo, que o serviço do jogo confere; as outras seguem a
 * posse. Um `behavior` numa peça que não é daquela função não libera nada (pedido montado à mão).
 */
export function moradaInstanceAllowed(
  instance: Pick<MoradaInstance, 'pieceId' | 'behavior'>,
  owned: readonly string[] | ReadonlySet<string>,
  catalog: MoradaCatalog = MORADA_CATALOG,
): boolean {
  if (!catalog.pieces[instance.pieceId]) return false
  if (isMoradaFunctionInstance(instance) && !isMoradaTrophyTier(instance.pieceId, catalog))
    return true
  return moradaPieceAllowed(instance.pieceId, owned, catalog)
}
