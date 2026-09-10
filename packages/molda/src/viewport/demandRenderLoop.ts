interface ResizableRenderer {
  setSize(width: number, height: number, updateStyle: boolean): void
}

interface ResizableProjection {
  aspect: number
  updateProjectionMatrix(): void
}

/**
 * Compartilha o ciclo de render sob demanda dos palcos WebGL.
 *
 * O callback devolve `true` enquanto ainda existe animação amortecida. Assim,
 * cada palco continua dono da sua cena e este objeto cuida apenas de
 * coalescer frames, observar tamanho e encerrar recursos do agendamento.
 */
export class DemandRenderLoop {
  private readonly resizeObserver: ResizeObserver | null
  private readonly intersectionObserver: IntersectionObserver | null
  private frameHandle: number | null = null
  private disposed = false
  private inView = true
  private contextAvailable = true
  private dirty = false
  private width = 0
  private height = 0

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: ResizableRenderer,
    private readonly camera: ResizableProjection,
    private readonly renderFrame: () => boolean,
  ) {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(canvas.parentElement ?? canvas)
    } else {
      this.resizeObserver = null
    }
    this.intersectionObserver =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            const entry = entries.find((item) => item.target === canvas)
            if (!entry) return
            this.inView = entry.isIntersecting
            this.onVisibilityChange()
          })
    this.intersectionObserver?.observe(canvas)
    canvas.ownerDocument.addEventListener('visibilitychange', this.onVisibilityChange)
    canvas.addEventListener('webglcontextlost', this.onContextLost)
    canvas.addEventListener('webglcontextrestored', this.onContextRestored)
    this.resize()
  }

  request(): void {
    if (this.disposed) return
    this.dirty = true
    this.schedule()
  }

  private canRender(): boolean {
    const parent = this.canvas.parentElement ?? this.canvas
    return (
      !this.disposed &&
      this.inView &&
      this.contextAvailable &&
      !this.canvas.ownerDocument.hidden &&
      parent.clientWidth > 0 &&
      parent.clientHeight > 0
    )
  }

  private schedule(): void {
    if (!this.dirty || !this.canRender() || this.frameHandle !== null) return
    this.frameHandle = requestAnimationFrame(() => {
      this.frameHandle = null
      if (!this.canRender()) return
      this.dirty = false
      if (this.renderFrame()) this.request()
    })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stopFrame()
    this.resizeObserver?.disconnect()
    this.intersectionObserver?.disconnect()
    this.canvas.ownerDocument.removeEventListener('visibilitychange', this.onVisibilityChange)
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost)
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored)
  }

  private stopFrame(): void {
    if (this.frameHandle !== null) cancelAnimationFrame(this.frameHandle)
    this.frameHandle = null
  }

  private readonly onVisibilityChange = (): void => {
    if (!this.canRender()) {
      this.stopFrame()
      return
    }
    this.resize()
    this.schedule()
  }

  private readonly onContextLost = (): void => {
    this.contextAvailable = false
    this.stopFrame()
  }

  private readonly onContextRestored = (): void => {
    this.contextAvailable = true
    this.width = this.height = 0
    this.request()
    this.onVisibilityChange()
  }

  private resize(): void {
    if (!this.canRender()) return
    const parent = this.canvas.parentElement ?? this.canvas
    const width = parent.clientWidth
    const height = parent.clientHeight
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.request()
  }
}
