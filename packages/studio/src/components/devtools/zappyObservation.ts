import { investigationWindowFor, perfWindowFor, programTimeFor } from '../../state/devtools'
import type {
  StudioTutorInvestigation,
  StudioTutorObservedTabs,
  StudioTutorPerformance,
} from '../../studio/tutor'
import { summarizePerf } from './perfSummary'

/**
 * Lote 5 da missão (seção 15, 21/11/2026): o que as abas Investigar e Desempenho mostram, no
 * formato do contexto do Zappy. Lido NA HORA da pergunta e só da aba que a criança ligou: o
 * Zappy não observa o jogo sozinho, nem a cada quadro. Baixado sob demanda pelo painel do Zappy
 * (só quando uma das abas está ligada), junto da store das abas.
 *
 * ⚠️ Manda só o que a aba MOSTRA (revisão do lote 5): as mesmas condições de tela do
 * `InvestigatePanel` e do `PerformancePanel`. Valor guardado de uma execução que já parou, erro de
 * uma execução anterior ou quadros por segundo de um programa sem tela não são leitura.
 */
export interface ZappyObservation {
  investigation?: StudioTutorInvestigation
  performance?: StudioTutorPerformance
  observing?: StudioTutorObservedTabs
}

/** A execução de agora, como as abas a leem do `proRun` da instância. */
export interface ZappyObservedRun {
  phase: string | null
  /** O jogo parou com erro de execução (`phase === 'error'` e `errorKind === 'runtime'`). */
  runtimeError: boolean
  python: boolean
}

const plain = (values: readonly { name: string; text: string }[]) =>
  values.map(({ name, text }) => ({ name, text }))

export function readZappyObservation(
  ui: object,
  flags: { measuring: boolean; investigating: boolean },
  run: ZappyObservedRun,
): ZappyObservation {
  const observation: ZappyObservation = {
    observing: { investigate: flags.investigating, performance: flags.measuring },
  }
  if (flags.investigating) {
    const reading = investigationWindowFor(ui).getState()
    // No Python, esperar a entrada é rodar, e o programa que terminou mostra os valores do fim.
    const running = run.phase === 'running' || (run.python && run.phase === 'waiting')
    const done = run.python && run.phase === 'done'
    if (run.runtimeError && reading.stopped) {
      // A aba mostra o cartão "parou com erro" e o caminho até ele, com os valores daquele momento.
      observation.investigation = {
        frame: reading.stopped.frame,
        paused: false,
        values: [],
        stopped: { frame: reading.stopped.frame, values: plain(reading.stopped.values) },
      }
    } else if ((running || done) && reading.ready && reading.values.length > 0) {
      observation.investigation = {
        frame: reading.frame,
        paused: reading.paused,
        values: plain(reading.values),
      }
    }
  }
  // O programa Python sem tela mostra o tempo que levou, não quadros por segundo.
  if (flags.measuring && programTimeFor(ui).getState().canvas !== false) {
    const window = perfWindowFor(ui).getState()
    const summary = summarizePerf(window.slices)
    // Sem `<canvas>` a aba diz que a página não tem quadros de jogo para medir.
    const frames = window.slices.filter((slice) => slice.canvas)
    if (!window.refused && summary.latest?.canvas && frames.length > 0) {
      observation.performance = {
        seconds: summary.seconds,
        fpsNow: summary.latest.fps,
        fpsMin: Math.min(...frames.map((slice) => slice.fps)),
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
