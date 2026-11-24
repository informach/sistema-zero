import { useEffect, useRef } from 'react'
import { useLogsStore } from '../../state/logsStore'
import { useUIStore, useUIStoreApi } from '../../state/uiStore'

/**
 * As abas Desempenho e Investigar no Pro (proposta aprovada em 20/11/2026): a prévia do Pro
 * (no WebContainer ou montada no servidor) conversa com a ponte que roda na página do jogo
 * (`buildProHostBridgeScript`, do core). Ligada a medida, a prévia pede `sz:perf` à página e
 * recebe os quadros por segundo e o tempo de cada quadro; o erro que parou o jogo chega como
 * `sz:pro-error`, com a pilha (na prévia do WebContainer, o erro já chega pelo `preview-message`).
 * O jogo da criança não muda: a ponte é a mesma da prévia de sempre.
 */

export interface ProPerfMessage {
  fps: number
  frameMsAvg: number
  frameMsMax: number
  canvas: boolean
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const bounded = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max

/** A fatia da medida que a página mandou (vem do contexto do jogo: só a forma é conferida). */
export function readProPerfMessage(data: unknown): ProPerfMessage | null {
  if (
    !record(data) ||
    data.type !== 'sz:perf' ||
    !bounded(data.fps, 1000) ||
    !bounded(data.frameMsAvg, 60_000) ||
    !bounded(data.frameMsMax, 60_000) ||
    typeof data.canvas !== 'boolean'
  )
    return null
  return {
    fps: data.fps,
    frameMsAvg: data.frameMsAvg,
    frameMsMax: data.frameMsMax,
    canvas: data.canvas,
  }
}

/** O erro que a página mandou, com a pilha. */
export function readProErrorMessage(data: unknown): { message: string; stack: string } | null {
  if (
    !record(data) ||
    data.type !== 'sz:pro-error' ||
    typeof data.message !== 'string' ||
    typeof data.stack !== 'string'
  )
    return null
  return { message: data.message.slice(0, 2000), stack: data.stack.slice(0, 4000) }
}

export function useProPreviewDevtools(options: {
  frame: () => HTMLIFrameElement | null
  /** A origem da página do jogo; `null` quando ela é opaca (o sandbox sem `allow-same-origin`). */
  origin: () => string | null
  /** A prévia montada no servidor recebe o erro por aqui; a do WebContainer, pelo `preview-message`. */
  errors: boolean
  active: boolean
  /** Muda quando o documento da prévia troca: o pedido da medida vai de novo à página nova. */
  documentKey: unknown
}): void {
  const ui = useUIStoreApi()
  const measuring = useUIStore((state) => state.measuring)
  const pushLog = useLogsStore((state) => state.push)
  const latest = useRef(options)
  latest.current = options
  const devtools = useRef<Promise<typeof import('../../state/devtools')> | null>(null)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `documentKey` é o GATILHO (a página nova recebe o pedido de novo)
  useEffect(() => {
    if (!options.active) return
    const frame = latest.current.frame()
    if (!frame) return
    const send = (on: boolean) =>
      frame.contentWindow?.postMessage({ type: 'sz:perf', on }, latest.current.origin() ?? '*')
    if (measuring) {
      devtools.current ??= import('../../state/devtools')
      send(true)
    }
    // A página recarregou (Atualizar, a casca de novo): o pedido vai à página nova.
    const reload = () => {
      if (measuring) send(true)
    }
    frame.addEventListener('load', reload)
    return () => {
      frame.removeEventListener('load', reload)
      if (measuring) send(false)
    }
  }, [measuring, options.active, options.documentKey])

  useEffect(() => {
    if (!options.active) return
    const receive = (event: MessageEvent) => {
      const current = latest.current
      if (event.source !== current.frame()?.contentWindow) return
      if (event.origin !== (current.origin() ?? 'null')) return
      const perf = readProPerfMessage(event.data)
      if (perf) {
        if (!ui.getState().measuring) return
        devtools.current ??= import('../../state/devtools')
        void devtools.current.then(({ perfWindowFor }) =>
          perfWindowFor(ui)
            .getState()
            .push({ ...perf, sprites: null, objects: null, draws: null }),
        )
        return
      }
      const error = current.errors ? readProErrorMessage(event.data) : null
      if (error)
        pushLog({
          source: 'sz-preview',
          kind: 'runtimeError',
          parts: [error.message],
          error: { message: error.message, stack: error.stack },
          timestamp: Date.now(),
        })
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [options.active, ui, pushLog])
}
