import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import type { LojaDoJogo } from './loja'

export type EtapaDoFarol = 'fora' | 'carregando' | 'sala' | 'pagina' | 'fachos' | 'fim'
export interface EstadoDoFarol {
  etapa: EtapaDoFarol
  pagina: number
  tempo: number
  corte: number | null
  varanda: { x: number; y: number; z: number } | null
  menosMovimento: boolean
  /** Callback instalado pelo mundo, para UI e Escape usarem a mesma saída. */
  sair: (() => void) | null
  mostrarLuz: (() => void) | null
}
function criar() {
  return createStore<EstadoDoFarol>(() => ({
    etapa: 'fora',
    pagina: 0,
    tempo: 0,
    corte: null,
    varanda: null,
    menosMovimento: false,
    sair: null,
    mostrarLuz: null,
  }))
}
const lojas = new WeakMap<LojaDoJogo, ReturnType<typeof criar>>()
export function lojaDoFarol(loja: LojaDoJogo) {
  let farol = lojas.get(loja)
  if (!farol) {
    farol = criar()
    lojas.set(loja, farol)
  }
  return farol
}
export function useFarol<T>(loja: LojaDoJogo, seletor: (s: EstadoDoFarol) => T): T {
  return useStore(lojaDoFarol(loja), seletor)
}
