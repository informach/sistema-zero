import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { LojaDoJogo } from './loja'

/** O nome do painel do filhote do Vale na loja do jogo. */
export const PAINEL_DO_FILHOTE = 'filhote'

/**
 * O painel do filhote e o filhote no mundo conversam por aqui (uma loja por montagem, como a do
 * bicho adotado): a última fala e a reação (cada número novo toca `pular` no modelo).
 */
export interface EstadoDoFilhote {
  fala: string | null
  reacao: number
  abrir(): void
  responder(fala: string, comemora: boolean): void
}

export type LojaDoFilhote = StoreApi<EstadoDoFilhote>

const lojas = new WeakMap<LojaDoJogo, LojaDoFilhote>()

export function lojaDoFilhote(loja: LojaDoJogo): LojaDoFilhote {
  let filhote = lojas.get(loja)
  if (!filhote) {
    filhote = createStore<EstadoDoFilhote>((set, get) => ({
      fala: null,
      reacao: 0,
      abrir() {
        set({ fala: null })
      },
      responder(fala, comemora) {
        set({ fala, reacao: comemora ? get().reacao + 1 : get().reacao })
      },
    }))
    lojas.set(loja, filhote)
  }
  return filhote
}

export function useFilhote<T>(filhote: LojaDoFilhote, seletor: (s: EstadoDoFilhote) => T): T {
  return useStore(filhote, seletor)
}
