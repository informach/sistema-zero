interface PointerDragListeners {
  onMove(event: PointerEvent): void
  onEnd(event: PointerEvent): void
}

/** Instala o gesto no document e devolve cleanup idempotente para unmount. */
export function addPointerDragListeners(
  target: Document,
  listeners: PointerDragListeners,
): () => void {
  let active = true
  const cleanup = (): void => {
    if (!active) return
    active = false
    target.removeEventListener('pointermove', listeners.onMove)
    target.removeEventListener('pointerup', finish)
    target.removeEventListener('pointercancel', finish)
  }
  const finish = (event: PointerEvent): void => {
    cleanup()
    listeners.onEnd(event)
  }
  target.addEventListener('pointermove', listeners.onMove)
  target.addEventListener('pointerup', finish)
  target.addEventListener('pointercancel', finish)
  return cleanup
}
