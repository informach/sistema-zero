import { QUADROS_POR_ILHA } from '@sistemazero/arquipelago-contracts'
import type { Quadro } from './quadro-das-cores'

/**
 * A cor de cada ilha do anel (regra pura). A ilha é dividida em seis pedaços, como fatias em volta
 * do centro; o pedaço 1 fica do lado da chegada da ponte e os outros seguem em volta. Cada quadro
 * do Quadro das Cores pinta o seu pedaço:
 * - ponte fechada: tudo cinza;
 * - ponte aberta: um pouco de cor na ilha inteira (`COR_AO_ABRIR`);
 * - quadro feito: o pedaço dele com a cor inteira;
 * - quadro sem desafio publicado ou leitura desconhecida: conserva a cor-base da ponte;
 * - conclusão histórica: o pedaço continua colorido, mesmo com a publicação arquivada.
 */

/** Quanto de cor a ilha ganha quando a ponte abre, antes de qualquer quadro (0 a 1). */
export const COR_AO_ABRIR = 0.3
/** A tinta de um pedaço novo escorre por este tempo na festa da cor. */
export const DURACAO_DA_TINTA_S = 2.4
/** A borda entre dois pedaços (fração de um pedaço, de cada lado): sem linha dura. */
export const BORDA_DOS_PEDACOS = 0.18

/**
 * Quais pedaços estão pintados (1) e quais esperam o desafio (0), na ordem dos quadros.
 * `null` = sem a lista: só as posições anteriormente confirmadas recebem a cor inteira.
 */
export function pedacosPintados(
  quadros: readonly Quadro[] | null,
  conquistados: readonly number[] = [],
): number[] {
  return Array.from({ length: QUADROS_POR_ILHA }, (_, i) => {
    const q = quadros?.find((q) => q.numero === i + 1)
    return conquistados.includes(i + 1) || q?.estado === 'feito' ? 1 : 0
  })
}

/** A cor final de um ponto (0 cinza, 1 cor inteira): a chegada da ponte vezes o pedaço. */
export function corDoPonto(chegada: number, pedaco: number): number {
  return chegada * (COR_AO_ABRIR + (1 - COR_AO_ABRIR) * pedaco)
}

/** A cor média da ilha (para as formas simples, que não têm pedaços). */
export function corMedia(chegada: number, pedacos: readonly number[]): number {
  const media = pedacos.reduce((a, b) => a + b, 0) / (pedacos.length || 1)
  return corDoPonto(chegada, media)
}

/**
 * Em que pedaço cai um ponto da ilha (mesma conta do shader): `x` e `z` no referencial do modelo
 * (a chegada da ponte no +x). Devolve o pedaço (0 a 5) e a posição dentro dele (0 a 1).
 */
export function pedacoDoPonto(x: number, z: number): { pedaco: number; dentro: number } {
  const t = Math.atan2(z, x) / ((2 * Math.PI) / QUADROS_POR_ILHA) + 0.5
  const i = Math.floor(t)
  return {
    pedaco: ((i % QUADROS_POR_ILHA) + QUADROS_POR_ILHA) % QUADROS_POR_ILHA,
    dentro: t - i,
  }
}

/**
 * Anda os pedaços até o alvo: o que acabou de ser pintado escorre em `DURACAO_DA_TINTA_S`; o que
 * já foi confirmado não perde a cor numa atualização. A primeira leitura de uma montagem
 * substitui tudo, para não carregar pintura de outro perfil. Muda `atual`.
 */
export function andarPedacos(
  atual: number[],
  alvo: readonly number[],
  dt: number,
  naHora: boolean,
): void {
  for (let i = 0; i < atual.length; i++) {
    const a = atual[i] ?? 0
    const b = alvo[i] ?? 0
    atual[i] = naHora ? b : Math.max(a, Math.min(b, a + dt / DURACAO_DA_TINTA_S))
  }
}
