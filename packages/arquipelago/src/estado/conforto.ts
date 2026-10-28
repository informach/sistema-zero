import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { type Conforto, lerConforto } from '../sistemas/conforto'
import type { LojaDoJogo } from './loja'

/** Onde as preferências de conforto ficam no aparelho (valem para todos os perfis dele). */
export const CHAVE_DO_CONFORTO = 'arquipelago:conforto'

export interface EstadoDoConforto {
  conforto: Conforto
  mudar(parte: Partial<Conforto>): void
}

export type LojaDoConforto = StoreApi<EstadoDoConforto>

const lojas = new WeakMap<LojaDoJogo, LojaDoConforto>()

function lerGuardado(): string | null {
  try {
    return localStorage.getItem(CHAVE_DO_CONFORTO)
  } catch {
    return null
  }
}

/**
 * As preferências de conforto da câmera (`sistemas/conforto.ts`), uma loja por montagem como as
 * outras, lidas do aparelho ao abrir e guardadas a cada mudança. Sem armazenamento (aba anônima,
 * bloqueado), valem só enquanto o jogo está aberto.
 */
export function lojaDoConforto(loja: LojaDoJogo): LojaDoConforto {
  let conforto = lojas.get(loja)
  if (!conforto) {
    conforto = createStore<EstadoDoConforto>((set, get) => ({
      conforto: lerConforto(lerGuardado()),
      mudar(parte) {
        const novo = { ...get().conforto, ...parte }
        set({ conforto: novo })
        try {
          localStorage.setItem(CHAVE_DO_CONFORTO, JSON.stringify(novo))
        } catch {
          // Sem armazenamento: vale até fechar.
        }
      },
    }))
    lojas.set(loja, conforto)
  }
  return conforto
}

export function useConforto<T>(loja: LojaDoConforto, ler: (s: EstadoDoConforto) => T): T {
  return useStore(loja, ler)
}
