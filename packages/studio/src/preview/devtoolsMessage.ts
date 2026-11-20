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

/** O que a aba Investigar recebe do jogo (o estado, os valores e, quando para, o caminho). */
export const DEVTOOLS_STATE_MESSAGE = 'sz:devtools:state'
/** O comando do editor para o jogo (Pausar, Continuar, Avançar 1 quadro, olhar de novo). */
export const DEVTOOLS_COMMAND_MESSAGE = 'sz:devtools'
export type DevtoolsCommand = 'pause' | 'resume' | 'step' | 'look'

/** Quantos valores e quantas linhas do caminho a aba aceita (o resto é cortado no jogo). */
export const DEVTOOLS_MAX_VALUES = 40
export const DEVTOOLS_MAX_PATH = 12

export interface DevtoolsValueReading {
  name: string
  text: string
}

export interface DevtoolsStateMessage {
  type: typeof DEVTOOLS_STATE_MESSAGE
  doc: number
  /** O quadro do motor (o Jogo 2D conta); `null` quando o motor não conta. */
  frame: number | null
  paused: boolean
  /** O motor tem a pausa que o Estúdio sabe chamar, e ela vale agora. */
  canPause: boolean
  /**
   * O motor tem a pausa, mas não agora: o Jogo 2D Avançado só pausa com a partida rolando (no
   * menu, no fim ou numa batalha, não).
   */
  pauseLater: boolean
  values: DevtoolsValueReading[]
  /** O jogo parou com erro: as linhas do script da criança, de dentro para fora. */
  error: { lines: number[] } | null
}

const shortText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= max

export function isDevtoolsStateMessage(value: unknown): value is DevtoolsStateMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as Record<string, unknown>
  if (m.type !== DEVTOOLS_STATE_MESSAGE) return false
  if (!finite(m.doc, 1, Number.MAX_SAFE_INTEGER) || !Number.isInteger(m.doc)) return false
  if (
    m.frame !== null &&
    !(finite(m.frame, 0, Number.MAX_SAFE_INTEGER) && Number.isInteger(m.frame))
  )
    return false
  if (
    typeof m.paused !== 'boolean' ||
    typeof m.canPause !== 'boolean' ||
    typeof m.pauseLater !== 'boolean'
  )
    return false
  if (!Array.isArray(m.values) || m.values.length > DEVTOOLS_MAX_VALUES) return false
  for (const item of m.values) {
    if (!item || typeof item !== 'object') return false
    const v = item as Record<string, unknown>
    if (!shortText(v.name, 60) || !shortText(v.text, 80)) return false
  }
  if (m.error === null) return true
  if (!m.error || typeof m.error !== 'object') return false
  const lines = (m.error as Record<string, unknown>).lines
  return (
    Array.isArray(lines) &&
    lines.length <= DEVTOOLS_MAX_PATH &&
    lines.every((line) => finite(line, 1, 1_000_000) && Number.isInteger(line))
  )
}
