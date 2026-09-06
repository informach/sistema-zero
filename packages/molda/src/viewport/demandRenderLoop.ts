interface ResizableRenderer {
  setSize(width: number, height: number, updateStyle: boolean): void
}

interface PerspectiveProjection {
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
  private frameHandle: number | null = null
  private disposed = false

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly renderer: ResizableRenderer,
    private readonly camera: PerspectiveProjection,
    private readonly renderFrame: () => boolean,
  ) {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(canvas.parentElement ?? canvas)
    } else {
      this.resizeObserver = null
    }
    this.resize()
  }

  request(): void {
    if (this.disposed || this.frameHandle !== null) return
    this.frameHandle = requestAnimationFrame(() => {
      this.frameHandle = null
      if (this.disposed) return
      if (this.renderFrame()) this.request()
    })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.frameHandle !== null) cancelAnimationFrame(this.frameHandle)
    this.frameHandle = null
    this.resizeObserver?.disconnect()
  }

  private resize(): void {
    if (this.disposed) return
    const parent = this.canvas.parentElement ?? this.canvas
    const width = parent.clientWidth
    const height = parent.clientHeight
    if (width === 0 || height === 0) return
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.request()
  }
}
