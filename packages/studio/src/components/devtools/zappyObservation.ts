import { investigationWindowFor, perfWindowFor } from '../../state/devtools'
import type { StudioTutorInvestigation, StudioTutorPerformance } from '../../studio/tutor'
import { summarizePerf } from './perfSummary'

/**
 * Lote 5 da missão (seção 15, 21/11/2026): o que as abas Investigar e Desempenho mostram, no
 * formato do contexto do Zappy. Lido NA HORA da pergunta e só da aba que a criança ligou: o
 * Zappy não observa o jogo sozinho, nem a cada quadro. Baixado sob demanda pelo painel do Zappy
 * (só quando uma das abas está ligada), junto da store das abas.
 */
export interface ZappyObservation {
  investigation?: StudioTutorInvestigation
  performance?: StudioTutorPerformance
}

export function readZappyObservation(
  ui: object,
  flags: { measuring: boolean; investigating: boolean },
): ZappyObservation {
  const observation: ZappyObservation = {}
  if (flags.investigating) {
    const window = investigationWindowFor(ui).getState()
    if (window.ready && (window.values.length > 0 || window.stopped)) {
      observation.investigation = {
        frame: window.frame,
        paused: window.paused,
        values: window.values.map(({ name, text }) => ({ name, text })),
        ...(window.stopped
          ? {
              stopped: {
                frame: window.stopped.frame,
                values: window.stopped.values.map(({ name, text }) => ({ name, text })),
              },
            }
          : {}),
      }
    }
  }
  if (flags.measuring) {
    const window = perfWindowFor(ui).getState()
    const summary = summarizePerf(window.slices)
    if (!window.refused && summary.latest) {
      observation.performance = {
        seconds: summary.seconds,
        fpsNow: summary.latest.fps,
        fpsMin: Math.min(...window.slices.map((slice) => slice.fps)),
        slowEpisodes: summary.slowEpisodes,
        slowestFrameMs: summary.slowestFrameMs,
        sprites: summary.latest.sprites,
        objects: summary.latest.objects,
        draws: summary.latest.draws,
      }
    }
  }
  return observation
}
