/**
 * Os patins (fase2-05): o prêmio da primeira entrega pelos telhados da Vila Doce. Ficam na mochila
 * (o item `patins`) e calçam com um toque nele; calçados, o corpo desliza no chão: anda e corre
 * mais rápido, acelera mais devagar e demora mais para parar (o perfil `PERFIS.patins` de
 * `sistemas/movimento.ts`). Na água e no cipó, na escada e no tronco, os patins não mudam nada.
 * Calçar não é salvo: o jogo abre sempre descalço.
 */
import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { adicionar, type Inventario, quantidade } from './itens'

export const ID_DOS_PATINS = 'patins'

/** Calçados, as velocidades de andar e correr (`CORPO`) vão vezes isto. */
export const RAPIDEZ_DOS_PATINS = 1.3

export const FALA_DOS_PATINS =
  'O Bento mandou um presente pela entrega: um par de patins. Toque neles na mochila para calçar.'
export const FALA_DE_CALCAR = 'Patins calçados. Solte o controle e o corpo segue deslizando.'
export const FALA_DE_DESCALCAR = 'Patins guardados na mochila.'

export function temPatins(inv: Inventario): boolean {
  return quantidade(inv, ID_DOS_PATINS) > 0
}

/** Os patins valem só calçados E na mochila (dados de presente, saem dos pés). */
export function comPatins(calcados: boolean, inv: Inventario): boolean {
  return calcados && temPatins(inv)
}

/**
 * A chegada da entrega pelos telhados: quem ainda não tem patins ganha um par (uma vez; só volta a
 * ganhar se não estiverem mais na mochila). Devolve `null` quando não há nada a entregar.
 */
export function receberPatins(s: Salvamento): { salvamento: Salvamento; fala: string } | null {
  if (temPatins(s.inventario)) return null
  return {
    salvamento: { ...s, inventario: adicionar(s.inventario, ID_DOS_PATINS) },
    fala: FALA_DOS_PATINS,
  }
}
