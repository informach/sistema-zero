import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import { chaveDaAbertura, PAINEL_DA_ABERTURA } from '../sistemas/abertura'
import type { LojaDoJogo } from './loja'

/**
 * A marca de "já viu a abertura" no aparelho, por público e perfil (`sistemas/abertura.ts`).
 * `null` quando o aparelho não guarda nada (aba anônima, bloqueado).
 */
export function lerAberturaVista(publico: string, perfil: string): boolean | null {
  try {
    return localStorage.getItem(chaveDaAbertura(publico, perfil)) === '1'
  } catch {
    return null
  }
}

export function marcarAberturaVista(publico: string, perfil: string): void {
  try {
    localStorage.setItem(chaveDaAbertura(publico, perfil), '1')
  } catch {
    // Sem armazenamento: ela aparece de novo só num jogo novo.
  }
}

/**
 * A abertura de UMA montagem: de onde ela veio (a primeira vez, aberta pelo jogo, ou rever, pelo
 * diário: só a primeira termina com a fala do Zappy e a marca de vista) e se está saindo (a cena 3D
 * volta a desenhar já no começo da saída, para o mundo estar lá quando a tela clareia).
 */
export interface EstadoDaAbertura {
  origem: 'primeira' | 'rever'
  saindo: boolean
  abrir(origem: EstadoDaAbertura['origem']): void
  sair(): void
}

export type LojaDaAbertura = StoreApi<EstadoDaAbertura>

const lojas = new WeakMap<LojaDoJogo, LojaDaAbertura>()

export function lojaDaAbertura(loja: LojaDoJogo): LojaDaAbertura {
  let feita = lojas.get(loja)
  if (!feita) {
    feita = createStore<EstadoDaAbertura>((set) => ({
      origem: 'rever',
      saindo: false,
      abrir(origem) {
        set({ origem, saindo: false })
      },
      sair() {
        set({ saindo: true })
      },
    }))
    lojas.set(loja, feita)
  }
  return feita
}

export function useAbertura<T>(loja: LojaDaAbertura, ler: (s: EstadoDaAbertura) => T): T {
  return useStore(loja, ler)
}

/** Abre a abertura (a primeira vez pelo jogo, ou para rever pelo diário). */
export function abrirAbertura(loja: LojaDoJogo, origem: EstadoDaAbertura['origem']): void {
  lojaDaAbertura(loja).getState().abrir(origem)
  loja.getState().abrirPainel(PAINEL_DA_ABERTURA)
}
