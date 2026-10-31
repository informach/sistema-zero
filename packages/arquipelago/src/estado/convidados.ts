import { useStore } from 'zustand'
import { createStore } from 'zustand/vanilla'
import { diaDe } from '../sistemas/moradores'
import { salvamentoPausado } from '../sistemas/pausa'
import {
  type ConvidadoNaCasa,
  encontroNaCasa,
  type TipoDeEncontro,
} from '../sistemas/visitas-dos-moradores'
import { PAINEL_DE_CONSTRUIR } from './construcao'
import type { EstadoDoJogo, LojaDoJogo } from './loja'

export function podeReceberMoradores(s: EstadoDoJogo) {
  return (
    s.acesso.liberado &&
    !s.acesso.somenteLeitura &&
    !s.visita &&
    !s.tempoAcabou &&
    !s.tempoPausado &&
    !s.tempoSincronizando &&
    !salvamentoPausado(s.salvamentoSituacao) &&
    s.painelAberto !== PAINEL_DE_CONSTRUIR
  )
}
interface EstadoDosConvidados {
  tipo: TipoDeEncontro | 'descanso'
  convidados: readonly ConvidadoNaCasa[]
  convidar(tipo: TipoDeEncontro, perfil: string): boolean
  dispensar(): void
  colocar(convidados: readonly ConvidadoNaCasa[]): void
}
const lojas = new WeakMap<LojaDoJogo, ReturnType<typeof criarLojaDosConvidados>>()
function criarLojaDosConvidados(jogo: LojaDoJogo) {
  return createStore<EstadoDosConvidados>((set, get) => ({
    tipo: 'visita',
    convidados: [],
    convidar(tipo, perfil) {
      const s = jogo.getState()
      if (!podeReceberMoradores(s) || !s.dentroDeCasa) return false
      const r = encontroNaCasa(s.salvamento, s.quarto, s.jornada, perfil, diaDe(new Date()), tipo)
      if (r.motivo !== 'pronto') return false
      set({ tipo })
      return true
    },
    dispensar() {
      set({ tipo: 'descanso', convidados: [] })
    },
    colocar(convidados) {
      if (JSON.stringify(get().convidados) !== JSON.stringify(convidados)) set({ convidados })
    },
  }))
}
export function lojaDosConvidados(jogo: LojaDoJogo) {
  let loja = lojas.get(jogo)
  if (!loja) {
    loja = criarLojaDosConvidados(jogo)
    lojas.set(jogo, loja)
  }
  return loja
}
export function useConvidados<T>(
  loja: ReturnType<typeof lojaDosConvidados>,
  seletor: (s: EstadoDosConvidados) => T,
): T {
  return useStore(loja, seletor)
}
