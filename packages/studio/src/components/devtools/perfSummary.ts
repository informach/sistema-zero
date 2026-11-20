import type { PerfSlice } from '../../state/devtools'

/**
 * O resumo da aba Desempenho, tirado das fatias que o jogo mediu. Mora com o painel (que só
 * baixa quando a aba abre), não na store: no pacote de abertura do modo Blocos ele pesaria à toa.
 */

/** Abaixo disso o jogo parece travado (a frase da aba usa o mesmo número). */
export const PERF_SLOW_FPS = 30
/** O que o jogo pede e o tempo que cabe num quadro liso (60 por segundo). */
export const PERF_TARGET_FPS = 60
export const PERF_SMOOTH_FRAME_MS = 16

/** O que a aba mostra, tirado das fatias. Puro, para testar sem a tela. */
export interface PerfSummary {
  /** A última fatia (o número grande dos cartões); `null` antes da primeira. */
  latest: PerfSlice | null
  /** Quantas vezes o jogo ficou lento: cada sequência de fatias lentas conta uma vez. */
  slowEpisodes: number
  /** O maior intervalo entre dois quadros em toda a janela. */
  slowestFrameMs: number
  /** Quantos segundos a janela cobre. */
  seconds: number
}

export function isSlowSlice(slice: PerfSlice): boolean {
  return slice.fps < PERF_SLOW_FPS
}

export function summarizePerf(slices: readonly PerfSlice[]): PerfSummary {
  let slowEpisodes = 0
  let slowestFrameMs = 0
  let previousSlow = false
  for (const slice of slices) {
    const slow = isSlowSlice(slice)
    if (slow && !previousSlow) slowEpisodes++
    previousSlow = slow
    if (slice.frameMsMax > slowestFrameMs) slowestFrameMs = slice.frameMsMax
  }
  return {
    latest: slices.at(-1) ?? null,
    slowEpisodes,
    slowestFrameMs,
    seconds: slices.length / 2,
  }
}
