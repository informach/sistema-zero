import type { IlhaId } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { LojaDoJogo } from './loja'

/** O painel que a cena da subida de posto ocupa (o personagem e o tempo param, como num painel). */
export const PAINEL_DA_CHEGADA = 'chegada-da-ponte'

/**
 * A cena da subida de posto em curso (N02): qual ilha, há quantos segundos e se a pessoa pediu
 * para pular. `ilha` nula: nenhuma cena. Uma por montagem do jogo, como a loja do Farol.
 */
export interface EstadoDaChegada {
  ilha: IlhaId | null
  tempo: number
  menosMovimento: boolean
  pular: boolean
}

function criar() {
  return createStore<EstadoDaChegada>(() => ({
    ilha: null,
    tempo: 0,
    menosMovimento: false,
    pular: false,
  }))
}

const lojas = new WeakMap<LojaDoJogo, ReturnType<typeof criar>>()

export function lojaDaChegada(loja: LojaDoJogo) {
  let chegada = lojas.get(loja)
  if (!chegada) {
    chegada = criar()
    lojas.set(loja, chegada)
  }
  return chegada
}

export function useChegada<T>(loja: LojaDoJogo, seletor: (s: EstadoDaChegada) => T): T {
  return useStore(lojaDaChegada(loja), seletor)
}
