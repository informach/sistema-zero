/**
 * A mensagem da ponte da aba Desempenho (`devtoolsBridge.ts`), separada da ponte: o editor
 * confere a mensagem sempre, mas só baixa o texto da ponte quando a criança liga a medida.
 */

/** O tipo da mensagem de uma fatia medida. */
export const DEVTOOLS_PERF_MESSAGE = 'sz:devtools:perf'
/** A largura de uma fatia, em milissegundos. */
export const DEVTOOLS_PERF_SLICE_MS = 500

export interface DevtoolsPerfMessage {
  type: typeof DEVTOOLS_PERF_MESSAGE
  /** Quanto tempo a fatia cobriu de verdade (pode passar de 500 quando um quadro demora). */
  ms: number
  /** Quantos quadros o navegador desenhou na fatia. */
  frames: number
  frameMsAvg: number
  frameMsMax: number
  /** Sprites desenhados no último quadro, quando o motor conta; `null` quando não conta. */
  sprites: number | null
  /** A página tem um `<canvas>`: sem ele é uma página de HTML e CSS, sem quadros de jogo. */
  canvas: boolean
  /**
   * O número do documento que mediu (cresce a cada jogo montado). Número novo = jogo novo, e a
   * janela da medida recomeça; número velho = mensagem atrasada do jogo anterior, ignorada.
   */
  doc: number
}

const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max

/**
 * A mensagem vem de dentro do jogo, que roda o código da criança: tudo é conferido aqui (tipo,
 * faixa de cada número). Um jogo pode forjar uma fatia; o pior que acontece é um número errado
 * no painel, que nunca vale nota.
 */
export function isDevtoolsPerfMessage(value: unknown): value is DevtoolsPerfMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  return (
    m.type === DEVTOOLS_PERF_MESSAGE &&
    finite(m.ms, 1, 60_000) &&
    finite(m.frames, 0, 10_000) &&
    finite(m.frameMsAvg, 0, 60_000) &&
    finite(m.frameMsMax, 0, 60_000) &&
    (m.sprites === null || (finite(m.sprites, 0, 1_000_000) && Number.isInteger(m.sprites))) &&
    typeof m.canvas === 'boolean' &&
    finite(m.doc, 1, Number.MAX_SAFE_INTEGER) &&
    Number.isInteger(m.doc)
  )
}
