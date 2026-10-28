import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { LojaDoJogo } from './loja'

/** O nome do painel da conversa com a Capi na loja do jogo. */
export const PAINEL_DA_CAPI = 'capi'

/**
 * A conversa com a Capi (uma loja por montagem, como a dos desafios). O painel mostra as falas uma
 * a uma e depois as escolhas; o modelo dela fala enquanto o painel está aberto e comemora a cada
 * número novo em `alegria`.
 */
export interface EstadoDaConversa {
  falas: string[]
  /** A fala na tela; passou da última, o painel mostra as escolhas. */
  indice: number
  /** O que está aberto embaixo das falas. */
  tela: 'falas' | 'escolhas' | 'presente' | 'adotar'
  /** Conta as comemorações (presente de que ela gostou, pedido entregue). */
  alegria: number
  abrir(falas: string[]): void
  /** Uma resposta dela no meio da conversa (o presente, a entrega). */
  responder(falas: readonly string[], comemorar: boolean): void
  avancar(): void
  escolherPresente(): void
  escolherAdotar(): void
  voltarAsEscolhas(): void
}

export type LojaDaConversa = StoreApi<EstadoDaConversa>

const lojas = new WeakMap<LojaDoJogo, LojaDaConversa>()

export function lojaDaConversa(loja: LojaDoJogo): LojaDaConversa {
  let conversa = lojas.get(loja)
  if (!conversa) {
    conversa = createStore<EstadoDaConversa>((set, get) => ({
      falas: [],
      indice: 0,
      tela: 'falas',
      alegria: 0,
      abrir(falas) {
        set({ falas, indice: 0, tela: falas.length > 0 ? 'falas' : 'escolhas' })
      },
      responder(falas, comemorar) {
        set({
          falas: [...falas],
          indice: 0,
          tela: 'falas',
          alegria: comemorar ? get().alegria + 1 : get().alegria,
        })
      },
      avancar() {
        const indice = get().indice + 1
        set(indice < get().falas.length ? { indice } : { indice, tela: 'escolhas' })
      },
      escolherPresente() {
        set({ tela: 'presente' })
      },
      escolherAdotar() {
        set({ tela: 'adotar' })
      },
      voltarAsEscolhas() {
        set({ tela: 'escolhas' })
      },
    }))
    lojas.set(loja, conversa)
  }
  return conversa
}

export function useConversa<T>(conversa: LojaDaConversa, seletor: (s: EstadoDaConversa) => T): T {
  return useStore(conversa, seletor)
}
