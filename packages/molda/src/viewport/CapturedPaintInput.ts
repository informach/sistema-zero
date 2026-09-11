import type { PaintPointerPoint } from './paintPointerPath'

export interface CapturedPaintActions<Sample> {
  begin(sample: Sample): boolean
  move(sample: Sample | null): void
  end(commit: boolean): void
}

/**
 * One captured pointer owns one paint gesture. Sampling remains specific to the active medium.
 *
 * `claimMisses` (padrão `true`, o de sempre, que a pintura de pesos usa): todo toque primário no
 * palco é da pintura, acerte ou não. Com `false`, só o toque que acerta onde pintar é engolido;
 * o resto segue para a câmera e para a escolha de peça, que ouvem depois.
 */
export class CapturedPaintInput<Sample> {
  private enabled = false
  private disposed = false
  private owner: { pointerId: number; previous: PaintPointerPoint; started: boolean } | null = null
  private readonly pointers = new Set<number>()
  /**
   * Os dedos cujo `pointerdown` foi nosso. A câmera nunca viu esses toques, então o resto deles
   * (mover, soltar, cancelar) também é nosso até o dedo sair do vidro: o OrbitControls ouve o
   * `pointermove` do documento sem olhar o `pointerId`, e um dedo engolido que vazasse depois do
   * traço (o balde, o segundo dedo, o traço cancelado) virava o dedo que gira, e a câmera pulava.
   */
  private readonly swallowed = new Set<number>()
  private claimMisses: boolean
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly pick: (event: PaintPointerPoint) => Sample | null,
    private readonly actions: CapturedPaintActions<Sample>,
    private readonly path?: (
      from: PaintPointerPoint,
      to: PaintPointerPoint,
    ) => Iterable<PaintPointerPoint>,
    options: { claimMisses?: boolean } = {},
  ) {
    this.claimMisses = options.claimMisses ?? true
    canvas.addEventListener('pointerdown', this.down, true)
    canvas.addEventListener('pointermove', this.move, true)
    canvas.addEventListener('pointerup', this.up, true)
    canvas.addEventListener('pointercancel', this.lost, true)
    canvas.addEventListener('lostpointercapture', this.lost)
    canvas.ownerDocument.addEventListener('pointerup', this.released, true)
    canvas.ownerDocument.addEventListener('pointercancel', this.released, true)
  }
  setEnabled(enabled: boolean) {
    if (this.disposed) return
    this.enabled = enabled
    if (!enabled) this.cancel()
  }
  setClaimMisses(value: boolean) {
    this.claimMisses = value
  }
  private readonly down = (event: PointerEvent) => {
    if (this.disposed || !this.enabled || event.button !== 0) return
    const claim = () => {
      event.preventDefault()
      event.stopImmediatePropagation()
      this.swallowed.add(event.pointerId)
    }
    // Com um dedo engolido ainda no vidro, o novo também é nosso: a câmera nunca começa um
    // gesto com só uma parte dos dedos.
    if (this.claimMisses || this.swallowed.size > 0) claim()
    this.pointers.add(event.pointerId)
    if (this.pointers.size > 1) {
      // O segundo dedo de um traço nosso também é nosso; o de um giro de câmera é da câmera.
      if (!this.claimMisses && this.owner?.started) claim()
      this.finish(false)
      return
    }
    if (this.owner) return
    const owner = {
      pointerId: event.pointerId,
      previous: { clientX: event.clientX, clientY: event.clientY },
      started: false,
    }
    // Picking and begin can both reenter: reserve ownership before either callback.
    this.owner = owner
    const sample = this.pick(owner.previous)
    if (this.owner !== owner) return
    if (!sample) {
      this.owner = null
      return
    }
    if (!this.claimMisses) claim()
    owner.started = true
    if (!this.actions.begin(sample)) {
      if (this.owner === owner) this.owner = null
      return
    }
    if (this.owner !== owner) return
    this.canvas.focus({ preventScroll: true })
    if (this.owner !== owner) return
    try {
      this.canvas.setPointerCapture(event.pointerId)
    } catch {
      if (this.owner === owner) this.cancel()
    }
  }
  private readonly move = (event: PointerEvent) => {
    const owner = this.owner
    if (!owner?.started || owner.pointerId !== event.pointerId) {
      if (this.swallowed.has(event.pointerId)) this.stop(event)
      return
    }
    this.stop(event)
    // Use recorded subevents OR their summary, never both. Up still supplies its final position.
    const coalesced = event.type === 'pointermove' ? event.getCoalescedEvents?.() : undefined,
      events = coalesced?.length ? coalesced : [event]
    for (const point of events) {
      if (this.owner !== owner) return
      if (point.pointerId !== owner.pointerId) continue
      const endpoint = { clientX: point.clientX, clientY: point.clientY }
      const path = this.path?.(owner.previous, endpoint) ?? [endpoint]
      for (const position of path) {
        if (this.owner !== owner) return
        const sample = this.pick(position)
        if (this.owner !== owner) return
        this.actions.move(sample)
      }
      owner.previous = endpoint
    }
  }
  private readonly up = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    const owner = this.owner
    if (owner?.pointerId !== event.pointerId) {
      if (this.swallowed.delete(event.pointerId)) this.stop(event)
      return
    }
    this.move(event)
    this.swallowed.delete(event.pointerId)
    if (this.owner === owner) this.finish(true)
  }
  private readonly lost = (event: PointerEvent) => {
    // Losing capture is not lifting a finger. Other contacts must remain excluded until release.
    if (event.type === 'pointercancel') {
      this.pointers.delete(event.pointerId)
      if (this.swallowed.delete(event.pointerId)) this.stop(event)
    }
    if (this.owner?.pointerId === event.pointerId) this.finish(false)
  }
  private readonly released = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    // Soltar FORA do palco não passa pelo `up` dele (o toque tem captura implícita no palco, então
    // é o caso do mouse): o dedo engolido sai daqui. No palco, quem tira é o `up`, depois de
    // engolir o evento.
    if (event.target !== this.canvas) this.swallowed.delete(event.pointerId)
  }
  private stop(event: PointerEvent) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }
  private finish(commit: boolean) {
    const owner = this.owner
    this.owner = null
    if (!owner?.started) return
    // Release before callbacks: a newly opened owner may capture the same pointer again.
    if (this.canvas.hasPointerCapture(owner.pointerId))
      this.canvas.releasePointerCapture(owner.pointerId)
    this.actions.end(commit)
  }
  /**
   * Cancela o traço, não os dedos: um quadro da pintura que se mexe, o espelho ou outra peça
   * cancelam no meio de um giro, e os contatos continuam valendo até sair do vidro.
   */
  cancel() {
    this.finish(false)
  }
  /** Navigation invalidates the stroke, not the physical contacts still held on the canvas. */
  interrupt() {
    this.finish(false)
  }
  /** A janela perdeu o foco (ou a aba sumiu): os `pointerup` podem nunca chegar. */
  forget() {
    this.finish(false)
    this.pointers.clear()
    this.swallowed.clear()
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.forget()
    this.canvas.removeEventListener('pointerdown', this.down, true)
    this.canvas.removeEventListener('pointermove', this.move, true)
    this.canvas.removeEventListener('pointerup', this.up, true)
    this.canvas.removeEventListener('pointercancel', this.lost, true)
    this.canvas.removeEventListener('lostpointercapture', this.lost)
    this.canvas.ownerDocument.removeEventListener('pointerup', this.released, true)
    this.canvas.ownerDocument.removeEventListener('pointercancel', this.released, true)
  }
}
