interface PointerDragListeners {
  pointerId: number
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
    target.removeEventListener('pointermove', move)
    target.removeEventListener('pointerup', finish)
    target.removeEventListener('pointercancel', finish)
  }
  const move = (event: PointerEvent): void => {
    if (event.pointerId === listeners.pointerId) listeners.onMove(event)
  }
  const finish = (event: PointerEvent): void => {
    if (event.pointerId !== listeners.pointerId) return
    cleanup()
    listeners.onEnd(event)
  }
  target.addEventListener('pointermove', move)
  target.addEventListener('pointerup', finish)
  target.addEventListener('pointercancel', finish)
  return cleanup
}
