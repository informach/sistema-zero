import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

/**
 * O retrato do avatar da HUD (pedido dela, 29/10/2026: "a foto do avatar igual aparece na
 * plataforma"): `mundo/retrato-do-avatar.tsx` tira de dentro do `<Canvas>` e a HUD mostra
 * (`QuemJoga`). Sem retrato ainda, a HUD fica com a inicial. Uma loja por montagem do jogo.
 */
export interface EstadoDoRetrato {
  /** A imagem (data URL PNG, fundo transparente), ou `null` enquanto não tirou. */
  imagem: string | null
}

const lojas = new WeakMap<object, StoreApi<EstadoDoRetrato>>()

export function lojaDoRetrato(loja: object): StoreApi<EstadoDoRetrato> {
  let feita = lojas.get(loja)
  if (!feita) {
    feita = createStore<EstadoDoRetrato>(() => ({ imagem: null }))
    lojas.set(loja, feita)
  }
  return feita
}

export function useRetrato<T>(loja: object, escolher: (s: EstadoDoRetrato) => T): T {
  return useStore(lojaDoRetrato(loja), escolher)
}
