import type { CartasDoJogador, Plataforma } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  lerCartas,
  type MotivoDoCadernoFechado,
  motivoDoCadernoFechado,
} from '../sistemas/caderno-dos-lumis'
import type { LojaDoJogo } from './loja'

/** O valor de `painelAberto` do caderno dos Lumis. */
export const PAINEL_DO_CADERNO = 'caderno'

/**
 * Os cartões dos Lumis de UMA montagem, à parte da loja principal: a coleção vem do serviço
 * (`GET /cartas`) cada vez que o caderno abre, porque um curso concluído no meio do jogo libera
 * cartões novos.
 */
export interface EstadoDasCartas {
  dados: CartasDoJogador | null
  carregando: boolean
  fechado: MotivoDoCadernoFechado | null
  carregar(): Promise<void>
}

export type LojaDasCartas = StoreApi<EstadoDasCartas>

const lojas = new WeakMap<LojaDoJogo, LojaDasCartas>()

/** A loja dos cartões desta montagem (uma por loja do jogo, criada na primeira vez). */
export function lojaDasCartas(loja: LojaDoJogo, plataforma: Plataforma): LojaDasCartas {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDasCartas(plataforma)
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDasCartas(plataforma: Plataforma): LojaDasCartas {
  let pedido = 0
  return createStore<EstadoDasCartas>((set) => ({
    dados: null,
    carregando: false,
    fechado: null,
    async carregar() {
      const meu = ++pedido
      set({ carregando: true })
      try {
        const r = await plataforma.servico.buscar('/cartas')
        if (meu !== pedido) return
        const dados = r.status === 200 ? lerCartas(r.corpo) : null
        // Uma leitura que falha não apaga a coleção já mostrada: o caderno avisa por cima dela.
        if (!dados) set({ carregando: false, fechado: motivoDoCadernoFechado(r.status) })
        else set({ dados, carregando: false, fechado: null })
      } catch (erro) {
        if (meu !== pedido) return
        plataforma.relatarErro(erro, 'cartas')
        set({ carregando: false, fechado: 'fora-do-ar' })
      }
    },
  }))
}

export function useCartas<T>(loja: LojaDasCartas, seletor: (s: EstadoDasCartas) => T): T {
  return useStore(loja, seletor)
}
