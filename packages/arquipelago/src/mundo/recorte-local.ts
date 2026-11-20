import type { WebGLRenderer } from 'three'

type Renderer = Pick<WebGLRenderer, 'localClippingEnabled'>
const usos = new WeakMap<Renderer, { referencias: number; original: boolean }>()

/** Várias ilhas compartilham o renderer; a última libera somente a opção que adquiriram. */
export function usarRecorteLocal(renderer: Renderer) {
  let uso = usos.get(renderer)
  if (!uso) {
    uso = { referencias: 0, original: renderer.localClippingEnabled }
    usos.set(renderer, uso)
  }
  uso.referencias++
  renderer.localClippingEnabled = true
  let liberado = false
  return () => {
    if (liberado) return
    liberado = true
    if (--uso.referencias) return
    if (renderer.localClippingEnabled) renderer.localClippingEnabled = uso.original
    usos.delete(renderer)
  }
}
