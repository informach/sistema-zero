import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { ReacaoDoBicho } from '../sistemas/cuidar'
import type { LojaDoJogo } from './loja'

/** O nome do painel de cuidar do bicho adotado na loja do jogo. */
export const PAINEL_DO_BICHO = 'bicho'

/**
 * O painel de cuidar e o bicho no mundo conversam por aqui (uma loja por montagem, como a da
 * conversa com a Capi): a última fala do cuidado, a tela aberta e a reação que o modelo toca.
 */
export interface EstadoDoBicho {
  falas: string[]
  tela: 'cuidar' | 'comida'
  /** Conta as reações: cada número novo toca `tipo` no modelo. */
  reacao: { n: number; tipo: Exclude<ReacaoDoBicho, null> }
  abrir(): void
  responder(falas: string[], reacao: ReacaoDoBicho): void
  escolherComida(): void
  voltar(): void
}

export type LojaDoBicho = StoreApi<EstadoDoBicho>

const lojas = new WeakMap<LojaDoJogo, LojaDoBicho>()

export function lojaDoBicho(loja: LojaDoJogo): LojaDoBicho {
  let bicho = lojas.get(loja)
  if (!bicho) {
    bicho = createStore<EstadoDoBicho>((set, get) => ({
      falas: [],
      tela: 'cuidar',
      reacao: { n: 0, tipo: 'feliz' },
      abrir() {
        set({ falas: [], tela: 'cuidar' })
      },
      responder(falas, reacao) {
        set({
          falas,
          tela: 'cuidar',
          ...(reacao ? { reacao: { n: get().reacao.n + 1, tipo: reacao } } : {}),
        })
      },
      escolherComida() {
        set({ tela: 'comida' })
      },
      voltar() {
        set({ tela: 'cuidar' })
      },
    }))
    lojas.set(loja, bicho)
  }
  return bicho
}

export function useBicho<T>(bicho: LojaDoBicho, seletor: (s: EstadoDoBicho) => T): T {
  return useStore(bicho, seletor)
}
