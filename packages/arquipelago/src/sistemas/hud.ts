import type { Canteiro, IlhaId } from '@sistemazero/arquipelago-contracts'
import { estagio } from './horta'
import type { Necessidades } from './necessidades'
import type { Quadro } from './quadro-das-cores'

/**
 * As contas do HUD (regras puras, sem React): em que ilha a pessoa está, quanto do Quadro das
 * Cores dela já acendeu, os lembretes do "Agora" e os atalhos de 1 a 5 da mochila. Nada aqui é
 * guardado nem cria regra de jogo: tudo sai do que o jogo já sabe.
 */

/**
 * A ilha onde a pessoa está: a mais perto entre a sua ilha (no meio do mundo) e as do anel. Na
 * ponte, vale a ponta mais perto.
 */
export function ilhaMaisPerto(
  p: { x: number; z: number },
  anel: readonly { id: IlhaId; x: number; z: number }[],
): IlhaId {
  let escolhida: IlhaId = 'sua-ilha'
  let menor = p.x * p.x + p.z * p.z
  for (const i of anel) {
    const d = (i.x - p.x) ** 2 + (i.z - p.z) ** 2
    if (d < menor) {
      menor = d
      escolhida = i.id
    }
  }
  return escolhida
}

/** Quanto do Quadro das Cores da ilha acendeu; `null` quando a ilha não tem nenhum desafio. */
export function progressoDoQuadro(
  quadros: readonly Quadro[],
): { feitos: number; total: number; acesos: boolean[] } | null {
  if (quadros.every((q) => q.estado === 'vazio')) return null
  const acesos = quadros.map((q) => q.estado === 'feito')
  return { feitos: acesos.filter(Boolean).length, total: quadros.length, acesos }
}

/** Abaixo disto, a necessidade vira lembrete no "Agora" (a mesma faixa da barra que avermelha). */
export const NECESSIDADE_BAIXA = 25

/** Quantos lembretes o "Agora" mostra de uma vez (no celular, só o primeiro). */
export const LEMBRETES_NA_TELA = 3

export interface Lembrete {
  id: 'porta' | 'fome' | 'energia' | 'regar' | 'colher' | 'desafio' | 'primeiro-pedido'
  texto: string
}

/**
 * O "Agora": o que já está esperando no jogo, do mais urgente ao que pode esperar. Só lembra o
 * que existe (a porta nova, a fome, a horta, o desafio de hoje); não dá prêmio nem cria tarefa.
 */
export function lembretesDeAgora(e: {
  portaNova: boolean
  necessidades: Necessidades
  horta: readonly Canteiro[]
  agoraMs: number
  desafioDeHoje: 'pronto' | 'feito' | 'nenhum' | null
  primeiroPedido?: string | null
}): Lembrete[] {
  const lista: Lembrete[] = []
  if (!e.portaNova) lista.push({ id: 'porta', texto: 'Abrir a porta nova do quarto' })
  if (e.necessidades.fome < NECESSIDADE_BAIXA)
    lista.push({ id: 'fome', texto: 'Comer alguma coisa' })
  if (e.necessidades.energia < NECESSIDADE_BAIXA)
    lista.push({ id: 'energia', texto: 'Descansar um pouco na cama' })
  if (e.portaNova && e.primeiroPedido)
    lista.push({ id: 'primeiro-pedido', texto: e.primeiroPedido })
  let semAgua = 0
  let maduros = 0
  for (const c of e.horta) {
    const fase = estagio(c, e.agoraMs)
    if (fase === 'semente') semAgua++
    if (fase === 'maduro') maduros++
  }
  if (semAgua > 0 && !e.primeiroPedido)
    lista.push({
      id: 'regar',
      texto:
        semAgua === 1 ? 'Regar o canteiro plantado' : `Regar os ${semAgua} canteiros plantados`,
    })
  if (maduros > 0 && !e.primeiroPedido)
    lista.push({ id: 'colher', texto: 'Colher o que amadureceu na horta' })
  if (e.desafioDeHoje === 'pronto')
    lista.push({ id: 'desafio', texto: 'Fazer o desafio de hoje no Quadro das Cores' })
  return lista.slice(0, LEMBRETES_NA_TELA)
}

/** Os atalhos da mochila: as teclas de 1 a 5 vão para os itens que fazem alguma coisa. */
export const ATALHOS_DA_MOCHILA = 5

/** Os itens que fazem alguma coisa vêm primeiro, cada um com o número da tecla (até 5). */
export function comAtalhos<T>(
  itens: readonly T[],
  usavel: (item: T) => boolean,
): { item: T; tecla: number | null }[] {
  const usaveis = itens.filter(usavel)
  const resto = itens.filter((i) => !usavel(i))
  return [
    ...usaveis.map((item, i) => ({ item, tecla: i < ATALHOS_DA_MOCHILA ? i + 1 : null })),
    ...resto.map((item) => ({ item, tecla: null })),
  ]
}

/** A tecla de atalho (1 a 5, na fileira de cima ou no teclado numérico) ou `null`. */
export function teclaDoAtalho(code: string): number | null {
  const m = /^(?:Digit|Numpad)([1-9])$/.exec(code)
  if (!m) return null
  const n = Number(m[1])
  return n <= ATALHOS_DA_MOCHILA ? n : null
}
