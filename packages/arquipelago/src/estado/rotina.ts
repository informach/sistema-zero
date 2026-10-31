import type { CartaoDaRotina, LumiId } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import type { LojaDoJogo } from './loja'

/** O valor de `painelAberto` do painel "Rotina". */
export const PAINEL_DA_ROTINA = 'rotina'

/** Uma rotina para o Lumi fazer no mundo: pelo "Testar" do painel ou pelo QUANDO. */
export interface PedidoDeRotina {
  lumi: LumiId
  cartoes: readonly CartaoDaRotina[]
  origem: 'testar' | 'quando'
}

/** Como foi a última vez de cada Lumi (o painel mostra, com o motivo se parou no meio). */
export interface UltimaVez {
  /** `fechado`: rodou ao abrir, pela virada que passou com o jogo fechado (A12). */
  origem: PedidoDeRotina['origem'] | 'fechado'
  registro: string[]
  erro: string | null
}

/**
 * A rotina de UMA montagem, à parte da loja principal (fase2-07): o Lumi escolhido no painel, a
 * fila das rotinas para fazer no mundo (uma de cada vez), o que o Lumi faz agora (para o HUD) e a
 * última vez de cada um. Nada disto é salvo: a rotina guardada fica em `salvamento.rotinas`.
 */
export interface EstadoDaRotina {
  lumi: LumiId | null
  fila: PedidoDeRotina[]
  /** O Lumi fazendo a rotina agora e o que ele faz ("regando o canteiro 2"). */
  andando: { lumi: LumiId; texto: string } | null
  ultimas: Partial<Record<LumiId, UltimaVez>>
  /** Sobe a cada "Parar" (o Lumi no mundo para e devolve o que carregava). */
  paradas: number
  escolher(lumi: LumiId | null): void
  pedir(pedido: PedidoDeRotina): void
  tirarDaFila(): PedidoDeRotina | null
  mostrarAndando(andando: EstadoDaRotina['andando']): void
  registrar(lumi: LumiId, vez: UltimaVez): void
  parar(): void
}

export type LojaDaRotina = StoreApi<EstadoDaRotina>

const lojas = new WeakMap<LojaDoJogo, LojaDaRotina>()

export function lojaDaRotina(loja: LojaDoJogo): LojaDaRotina {
  const feita = lojas.get(loja)
  if (feita) return feita
  const nova = criarLojaDaRotina()
  lojas.set(loja, nova)
  return nova
}

export function criarLojaDaRotina(): LojaDaRotina {
  return createStore<EstadoDaRotina>((set, get) => ({
    lumi: null,
    fila: [],
    andando: null,
    ultimas: {},
    paradas: 0,
    escolher(lumi) {
      set({ lumi })
    },
    pedir(pedido) {
      // Um Lumi só entra uma vez na fila: o pedido novo troca o que esperava.
      set({ fila: [...get().fila.filter((p) => p.lumi !== pedido.lumi), pedido] })
    },
    tirarDaFila() {
      const [primeiro, ...resto] = get().fila
      if (!primeiro) return null
      set({ fila: resto })
      return primeiro
    },
    mostrarAndando(andando) {
      const atual = get().andando
      if (atual?.lumi === andando?.lumi && atual?.texto === andando?.texto) return
      set({ andando })
    },
    registrar(lumi, vez) {
      set({ ultimas: { ...get().ultimas, [lumi]: vez } })
    },
    parar() {
      set({ paradas: get().paradas + 1, fila: [] })
    },
  }))
}

export function useRotina<T>(loja: LojaDaRotina, seletor: (s: EstadoDaRotina) => T): T {
  return useStore(loja, seletor)
}

/** Abre o painel "Rotina" (pelo caderno ou perto de um Lumi), com o Lumi escolhido se houver. */
export function abrirRotina(loja: LojaDoJogo, lumi: LumiId | null): void {
  const rotina = lojaDaRotina(loja)
  if (lumi) rotina.getState().escolher(lumi)
  loja.getState().abrirMenu(false)
  loja.getState().abrirPainel(PAINEL_DA_ROTINA)
}
