import type { StudioRuntimeImage } from '../types'

/** Existing public-stage protocol, restricted to the parent/origin that completed
 * the authenticated frame handshake. It never accepts source or runtime commands.
 */
export function installPythonPlayerBridge(options: {
  parent: Window
  origin: string
  signal: AbortSignal
  canvas(): HTMLCanvasElement | null
  capture(): Promise<StudioRuntimeImage | null>
}) {
  let capturePending = false
  let windowStarted = performance.now()
  let received = 0
  const receive = (event: MessageEvent<unknown>) => {
    if (
      options.signal.aborted ||
      event.source !== options.parent ||
      event.origin !== options.origin
    )
      return
    const value = event.data
    if (!value || typeof value !== 'object' || !('type' in value)) return
    const now = performance.now()
    if (now - windowStarted >= 1000) {
      windowStarted = now
      received = 0
    }
    if (++received > 256) return
    const canvas = options.canvas()
    if (value.type === 'sz:stage?' && canvas) {
      options.parent.postMessage(
        { type: 'sz:stage', w: canvas.width, h: canvas.height },
        options.origin,
      )
    } else if (
      value.type === 'sz:gamepad' &&
      canvas &&
      'action' in value &&
      (value.action === 'keydown' || value.action === 'keyup') &&
      'key' in value &&
      typeof value.key === 'string' &&
      value.key.length > 0 &&
      value.key.length <= 80 &&
      'code' in value &&
      typeof value.code === 'string' &&
      value.code.length <= 80
    ) {
      canvas.dispatchEvent(
        new KeyboardEvent(value.action, { key: value.key, code: value.code, bubbles: true }),
      )
    } else if (value.type === 'sz:screenshot' && !capturePending) {
      capturePending = true
      void options
        .capture()
        .then((image) => {
          if (image && !options.signal.aborted)
            options.parent.postMessage(
              { type: 'sz:screenshot:result', dataUrl: image.dataUrl },
              options.origin,
            )
        })
        .catch(() => {})
        .finally(() => {
          capturePending = false
        })
    }
  }
  if (!options.signal.aborted)
    window.addEventListener('message', receive, { signal: options.signal })
}
