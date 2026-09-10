import type { Vec2 } from '../scene/document'
import type { SceneSelectionRegion } from '../scene/regionSelection'

export type SceneAreaTool = 'point' | 'box' | 'lasso'

/** One captured pointer; region is session-only and bounded independently of document size. */
export class SceneAreaSelection {
  private tool: SceneAreaTool = 'point'
  private enabled = true
  private disposed = false
  private active: {
    owner: number
    tool: Exclude<SceneAreaTool, 'point'>
    additive: boolean
    points: Vec2[]
    x: number
    y: number
    moved: boolean
  } | null = null
  private readonly pointers = new Set<number>()
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly preview: (points: readonly Vec2[]) => void,
    private readonly commit: (region: SceneSelectionRegion, additive: boolean) => void,
    private readonly activity: (active: boolean) => void,
  ) {
    canvas.addEventListener('pointerdown', this.onDown, true)
    canvas.addEventListener('pointermove', this.onMove, true)
    canvas.addEventListener('pointerup', this.onUp, true)
    canvas.addEventListener('pointercancel', this.onCancel, true)
    canvas.addEventListener('lostpointercapture', this.onLostCapture)
  }
  setTool(tool: SceneAreaTool) {
    if (!this.disposed && tool !== this.tool) {
      this.cancel()
      this.tool = tool
    }
  }
  setEnabled(enabled: boolean) {
    if (this.disposed) return
    if (!enabled) {
      this.cancel()
      this.pointers.clear()
    }
    this.enabled = enabled
  }
  get selecting() {
    return this.active !== null
  }
  private point(event: PointerEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect()
    const clamp = (value: number) => Math.max(0, Math.min(1, value))
    return [
      clamp((event.clientX - rect.left) / Math.max(1, rect.width)),
      clamp((event.clientY - rect.top) / Math.max(1, rect.height)),
    ]
  }
  private readonly onDown = (event: PointerEvent) => {
    if (this.disposed || !this.enabled || this.tool === 'point' || event.button !== 0) return
    event.preventDefault()
    event.stopImmediatePropagation()
    this.pointers.add(event.pointerId)
    if (this.pointers.size > 1) {
      this.cancel()
      return
    }
    this.canvas.focus({ preventScroll: true })
    this.active = {
      owner: event.pointerId,
      tool: this.tool,
      additive: event.shiftKey || event.ctrlKey || event.metaKey,
      points: [this.point(event)],
      x: event.clientX,
      y: event.clientY,
      moved: false,
    }
    this.canvas.setPointerCapture(event.pointerId)
    this.activity(true)
  }
  private readonly onMove = (event: PointerEvent) => {
    const active = this.active
    if (!active || active.owner !== event.pointerId) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (Math.hypot(event.clientX - active.x, event.clientY - active.y) > 6) active.moved = true
    const point = this.point(event)
    if (active.tool === 'box') {
      const from = active.points[0]
      if (!from) return
      active.points[1] = point
      this.preview([from, [point[0], from[1]], point, [from[0], point[1]]])
    } else {
      const previous = active.points.at(-1)
      if (previous && Math.hypot(point[0] - previous[0], point[1] - previous[1]) < 0.002) return
      if (active.points.length >= 512)
        active.points = active.points.filter((_value, i) => i % 2 === 0)
      active.points.push(point)
      this.preview([...active.points])
    }
  }
  private readonly onUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    const active = this.active
    if (!active || active.owner !== event.pointerId) return
    this.onMove(event)
    this.active = null
    this.release(active.owner)
    this.preview([])
    this.activity(false)
    const from = active.points[0]
    if (!active.moved || !from) return
    this.commit(
      active.tool === 'box'
        ? { kind: 'box', from, to: this.point(event) }
        : { kind: 'lasso', points: active.points },
      active.additive,
    )
  }
  private release(owner: number) {
    if (this.canvas.hasPointerCapture?.(owner)) this.canvas.releasePointerCapture(owner)
  }
  private readonly onCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
    if (this.active?.owner === event.pointerId) this.cancel()
  }
  private readonly onLostCapture = (event: PointerEvent) => {
    if (event.buttons !== 0) this.onCancel(event)
  }
  cancel() {
    if (this.disposed) return
    const active = this.active
    this.active = null
    if (active) {
      this.release(active.owner)
      this.preview([])
      this.activity(false)
    }
  }
  dispose() {
    if (this.disposed) return
    this.cancel()
    this.disposed = true
    this.canvas.removeEventListener('pointerdown', this.onDown, true)
    this.canvas.removeEventListener('pointermove', this.onMove, true)
    this.canvas.removeEventListener('pointerup', this.onUp, true)
    this.canvas.removeEventListener('pointercancel', this.onCancel, true)
    this.canvas.removeEventListener('lostpointercapture', this.onLostCapture)
    this.pointers.clear()
  }
}
