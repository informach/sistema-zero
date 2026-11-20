import { createStore, type StoreApi } from 'zustand/vanilla'

/**
 * A janela da medida da aba Desempenho (proposta aprovada em 20/11/2026,
 * `docs/estudio-evolucao/paineis-proposta.md`). Só a ponte (`preview/devtoolsBridge.ts`) e o
 * painel importam este módulo, os dois baixados quando a criança liga a medida: no pacote de
 * abertura do modo Blocos fica só a chave `measuring` da store da interface.
 *
 * Uma janela por instância do Estúdio; a chave é a store da interface dessa instância.
 */

/** Uma fatia de meio segundo, como o jogo mediu. */
export interface PerfSlice {
  /** Quadros por segundo nesta fatia. */
  fps: number
  frameMsAvg: number
  frameMsMax: number
  /** Sprites desenhados no último quadro, quando o motor conta. */
  sprites: number | null
  /** A página tem um `<canvas>`; sem ele, não há quadros de jogo para medir. */
  canvas: boolean
}

/** 60 fatias de meio segundo: os últimos 30 segundos. */
export const PERF_HISTORY_SLICES = 60

export interface PerfWindow {
  /** Quando a medida começou (relógio da página do editor). */
  since: number
  slices: readonly PerfSlice[]
  push(slice: PerfSlice): void
  /** O jogo recomeçou (Rodar de novo, edição): as fatias antigas eram de outro jogo. */
  clear(): void
}

const windows = new WeakMap<object, StoreApi<PerfWindow>>()

export function createPerfWindow(now = Date.now()): StoreApi<PerfWindow> {
  return createStore<PerfWindow>((set, get) => ({
    since: now,
    slices: [],
    push: (slice) => {
      const slices = [...get().slices, slice]
      set({
        slices: slices.length > PERF_HISTORY_SLICES ? slices.slice(-PERF_HISTORY_SLICES) : slices,
      })
    },
    clear: () => set({ slices: [] }),
  }))
}

/** A janela da instância; a primeira leitura depois de `forgetPerfWindow` começa uma nova. */
export function perfWindowFor(instance: object): StoreApi<PerfWindow> {
  let window = windows.get(instance)
  if (!window) {
    window = createPerfWindow()
    windows.set(instance, window)
  }
  return window
}

/** A medida desligou (ou vai recomeçar): a próxima janela começa do zero. */
export function forgetPerfWindow(instance: object): void {
  windows.delete(instance)
}
