import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { descobriuNaPraia, PEIXES_DA_PRAIA } from './colecoes-da-praia'

/**
 * A cor da sua ilha (§6.28, A17): quando a criança chega, só o quarto tem cor ("Só o seu quarto
 * ainda tem cor", diz o Zappy). A casa, a horta e o píer começam desbotados e cada um ganha cor
 * quando a criança faz a coisa dele, pelo que o salvamento já guarda (nada novo é gravado):
 * - a casa, ao abrir a porta nova;
 * - a horta, na primeira colheita (é ela que dá o projeto da geladeira);
 * - o píer, no primeiro peixe pescado.
 * Na casa de um irmão (visita), tudo aparece com cor.
 */
export interface CorDaSuaIlha {
  casa: boolean
  horta: boolean
  pier: boolean
}

export function corDaSuaIlha(s: Salvamento, visitando = false): CorDaSuaIlha {
  if (visitando) return { casa: true, horta: true, pier: true }
  return {
    casa: s.casa.portaNova,
    horta: Boolean(s.projetos.geladeira),
    pier: PEIXES_DA_PRAIA.some((p) => descobriuNaPraia(s, p.id)),
  }
}

/** Quanto o desbotado puxa para o cinza (o mesmo do Farol apagado). */
export const QUANTO_DESBOTADO = 0.92
/** A cor volta escorrendo neste tempo (s); com menos movimento, na hora. */
export const DURACAO_DA_COR_S = 1.6

/** Um passo da cor em direção ao alvo (0 com cor, `QUANTO_DESBOTADO` desbotado). */
export function passoDaCor(atual: number, alvo: number, dt: number, naHora: boolean): number {
  if (naHora) return alvo
  const passo = (QUANTO_DESBOTADO / DURACAO_DA_COR_S) * Math.max(0, dt)
  return atual < alvo ? Math.min(alvo, atual + passo) : Math.max(alvo, atual - passo)
}
