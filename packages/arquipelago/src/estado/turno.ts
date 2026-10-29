import type { PostoDaVila } from '@sistemazero/arquipelago-contracts'
import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'
import {
  comecarTurno,
  entregarBandeja,
  fecharTurno,
  porNaBandeja,
  type TurnoEmAndamento,
  terminou,
  tirarDaBandeja,
} from '../sistemas/turnos'
import type { LojaDoJogo } from './loja'

/** O nome do painel do turno na loja do jogo (o jogo para enquanto ele está aberto). */
export const PAINEL_DO_TURNO = 'turno'

/**
 * O turno num balcão da Vila Doce (uma loja por montagem, como a da conversa): o convite, o
 * balcão com o freguês da vez e o fim com as estrelas. As regras ficam em `sistemas/turnos.ts`;
 * o salvamento só muda ao fechar o turno.
 */
export interface EstadoDoTurno {
  posto: PostoDaVila
  tela: 'convite' | 'balcao' | 'fim'
  turno: TurnoEmAndamento | null
  /** A última resposta do freguês (o obrigado ou o "não era bem isso"). */
  resposta: string | null
  fim: { estrelas: 1 | 2 | 3; pagou: boolean; falas: string[] } | null
  abrir(posto: PostoDaVila): void
  comecar(dia: string, vez: number): void
  por(id: string): void
  tirar(id: string): void
  /** Entrega a bandeja; no último freguês, fecha o turno no salvamento da loja do jogo. */
  entregar(dia: string): void
}

export type LojaDoTurno = StoreApi<EstadoDoTurno>

const lojas = new WeakMap<LojaDoJogo, LojaDoTurno>()

export function lojaDoTurno(loja: LojaDoJogo): LojaDoTurno {
  let turno = lojas.get(loja)
  if (turno) return turno
  turno = createStore<EstadoDoTurno>((set, get) => ({
    posto: 'padaria',
    tela: 'convite',
    turno: null,
    resposta: null,
    fim: null,
    abrir(posto) {
      set({ posto, tela: 'convite', turno: null, resposta: null, fim: null })
    },
    comecar(dia, vez) {
      set({ tela: 'balcao', turno: comecarTurno(get().posto, dia, vez), resposta: null, fim: null })
    },
    por(id) {
      const t = get().turno
      if (t) set({ turno: porNaBandeja(t, id) })
    },
    tirar(id) {
      const t = get().turno
      if (t) set({ turno: tirarDaBandeja(t, id) })
    },
    entregar(dia) {
      const t = get().turno
      // Turno já fechado (um toque a mais no Entregar): nada a fazer.
      if (!t || terminou(t)) return
      const r = entregarBandeja(t)
      if (!terminou(r.turno)) {
        set({ turno: r.turno, resposta: r.fala })
        return
      }
      const jogo = loja.getState()
      const fechado = fecharTurno(jogo.salvamento, r.turno, dia)
      if (!fechado) return
      jogo.mudar(() => fechado.salvamento)
      set({
        turno: r.turno,
        resposta: r.fala,
        tela: 'fim',
        fim: { estrelas: fechado.estrelas, pagou: fechado.pagou, falas: fechado.falas },
      })
    },
  }))
  lojas.set(loja, turno)
  return turno
}

export function useTurno<T>(turno: LojaDoTurno, escolher: (s: EstadoDoTurno) => T): T {
  return useStore(turno, escolher)
}
