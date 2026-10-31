import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { adicionar, quantidade, remover } from './itens'

/**
 * As iscas da pesca (30/10/2026), a arte de `arte/itens/iscas.py`: a latinha de minhocas e a isca
 * colorida de penas. A pesca continua tranquila e sem sorte: a isca só ajuda. A minhoca faz o peixe
 * chegar mais rápido; a pena deixa mais tempo para recolher a linha. A criança escolhe a isca pela
 * mochila, e ela só é gasta quando um peixe vem. Perder a janela não gasta nada.
 *
 * De onde vêm: a feira (compra de insumos) e, de graça, quando a mochila não tem nenhuma: a latinha
 * aparece no canto da horta e a pena aparece no píer, uma de cada vez.
 */
export const ISCAS = ['isca-minhoca', 'isca-pena'] as const
export type Isca = (typeof ISCAS)[number]

export function ehIsca(id: string): id is Isca {
  return (ISCAS as readonly string[]).includes(id)
}

/** Espera e janela da pesca (segundos) com cada isca; sem isca, os números de sempre. */
export const PESCA_COM_ISCA: Readonly<
  Record<Isca | 'nenhuma', { esperar: number; janela: number }>
> = {
  nenhuma: { esperar: 3, janela: 5 },
  'isca-minhoca': { esperar: 1, janela: 5 },
  'isca-pena': { esperar: 3, janela: 10 },
}

export const NOME_NA_FALA: Readonly<Record<Isca, string>> = {
  'isca-minhoca': 'a minhoca',
  'isca-pena': 'a isca de penas',
}

/** A isca escolhida só vale se ainda estiver na mochila. */
export function iscaValendo(escolhida: Isca | null, inv: Record<string, number>): Isca | null {
  return escolhida && quantidade(inv, escolhida) > 0 ? escolhida : null
}

/** Gasta uma isca, só quando um peixe veio. Sem ela na mochila, nada muda. */
export function gastarIsca(s: Salvamento, isca: Isca | null): Salvamento {
  if (!isca) return s
  const resto = remover(s.inventario, isca)
  return resto ? { ...s, inventario: resto } : s
}

/** A isca de graça só aparece quando a mochila não tem nenhuma daquele tipo. */
export function iscaDeGracaAparece(s: Salvamento, isca: Isca): boolean {
  return quantidade(s.inventario, isca) === 0
}

/** Pega a isca de graça (uma). Com ela já na mochila, nada muda. */
export function pegarIscaDeGraca(s: Salvamento, isca: Isca): Salvamento {
  if (!iscaDeGracaAparece(s, isca)) return s
  return { ...s, inventario: adicionar(s.inventario, isca) }
}

export function falaDaIscaEscolhida(isca: Isca | null): string {
  if (!isca) return 'Sem isca: a pesca continua do jeito de sempre.'
  return isca === 'isca-minhoca'
    ? 'A minhoca vai no anzol na próxima pesca. O peixe chega mais rápido.'
    : 'A isca de penas vai no anzol na próxima pesca. Você terá mais tempo para recolher a linha.'
}

export function falaDaIscaDeGraca(isca: Isca): string {
  return isca === 'isca-minhoca'
    ? 'Uma latinha de minhocas foi para a mochila. Escolha a isca na mochila antes de pescar.'
    : 'Uma isca de penas foi para a mochila. Escolha a isca na mochila antes de pescar.'
}
