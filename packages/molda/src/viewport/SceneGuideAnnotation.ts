import { type Camera, Vector3 } from 'three'
import type { Vec3 } from '../core/model'
import type { ScenePreviewGuideState } from './ScenePreviewGuide'

/** View-only label anchored to the first picked cut point; never part of a capture or export. */
export class SceneGuideAnnotation {
  private readonly element: HTMLDivElement
  private readonly ghost: HTMLDivElement
  private readonly ghostText: HTMLSpanElement
  private readonly knife: SVGSVGElement
  private pointer: { x: number; y: number } | null = null
  private state: ScenePreviewGuideState | null = null
  constructor(private readonly canvas: HTMLCanvasElement) {
    this.element = canvas.ownerDocument.createElement('div')
    this.element.className = 'mld-cut-point-count'
    this.element.setAttribute('aria-hidden', 'true')
    this.element.hidden = true
    canvas.parentElement?.append(this.element)
    this.ghost = canvas.ownerDocument.createElement('div')
    this.ghost.className = 'mld-pivot-ghost-label'
    this.ghost.setAttribute('aria-hidden', 'true')
    this.ghost.hidden = true
    canvas.parentElement?.append(this.ghost)
    const ns = 'http://www.w3.org/2000/svg'
    const rotate = canvas.ownerDocument.createElementNS(ns, 'svg')
    rotate.setAttribute('viewBox', '0 0 24 24')
    rotate.setAttribute('width', '14')
    rotate.setAttribute('height', '14')
    rotate.setAttribute('fill', 'none')
    rotate.setAttribute('stroke', 'currentColor')
    rotate.setAttribute('stroke-width', '2')
    rotate.setAttribute('stroke-linecap', 'round')
    rotate.setAttribute('stroke-linejoin', 'round')
    const rotationPath = canvas.ownerDocument.createElementNS(ns, 'path')
    rotationPath.setAttribute('d', 'M3 11a9 9 0 1 1 9 9 9.75 9.75 0 0 1-6.74-2.74L3 15 M3 3v8h8')
    rotate.append(rotationPath)
    this.ghostText = canvas.ownerDocument.createElement('span')
    this.ghost.append(rotate, this.ghostText)
    this.knife = canvas.ownerDocument.createElementNS(ns, 'svg')
    this.knife.setAttribute('viewBox', '0 0 34 34')
    this.knife.setAttribute('class', 'mld-cut-cursor')
    this.knife.setAttribute('aria-hidden', 'true')
    for (const [d, fill] of [
      ['M3 30 7 18 21 4 30 13 16 27Z', '#fff'],
      ['m17 8 9 9 4-4-9-9Z', 'currentColor'],
    ]) {
      const path = canvas.ownerDocument.createElementNS(ns, 'path')
      path.setAttribute('d', d!)
      path.setAttribute('fill', fill!)
      path.setAttribute('stroke', 'currentColor')
      path.setAttribute('stroke-width', '2')
      path.setAttribute('stroke-linejoin', 'round')
      this.knife.append(path)
    }
    this.knife.style.display = 'none'
    canvas.parentElement?.append(this.knife)
  }
  update(state: ScenePreviewGuideState | null) {
    this.state = state
  }
  setPointer(pointer: { x: number; y: number } | null) {
    this.pointer = pointer
    if (!pointer) this.knife.style.display = 'none'
  }
  draw(camera: Camera, ghostPoints: readonly Vec3[]) {
    const width = this.canvas.clientWidth,
      height = this.canvas.clientHeight
    const project = (point: Vec3) => {
      const p = new Vector3(...point).project(camera)
      return {
        x: ((p.x + 1) * width) / 2,
        y: ((1 - p.y) * height) / 2,
        visible: Math.abs(p.z) <= 1,
      }
    }
    this.knife.style.display = this.state?.cut && this.pointer ? '' : 'none'
    if (this.state?.cut && this.pointer) {
      const point = this.state.hover ? project(this.state.hover) : this.pointer
      this.knife.style.left = `${point.x + 14}px`
      this.knife.style.top = `${point.y + 8}px`
    }
    const label = this.state?.ghost?.label
    this.ghost.hidden = !label || !width || !height || !ghostPoints.length
    if (!this.ghost.hidden) {
      const top = ghostPoints
        .map(project)
        .filter((p) => p.visible)
        .sort((a, b) => a.y - b.y || a.x - b.x)[0]
      this.ghost.hidden = !top
      if (top) {
        this.ghostText.textContent = label!
        this.ghost.style.left = `${Math.max(8, Math.min(width - 163, top.x - 155))}px`
        this.ghost.style.top = `${Math.max(8, Math.min(height - 36, top.y - 36))}px`
      }
    }
    const points = this.state?.cut ? this.state.points : null,
      point = points?.[0]
    if (!point) {
      this.element.hidden = true
      return
    }
    const p = new Vector3(...point).project(camera)
    this.element.hidden =
      !width || !height || Math.abs(p.z) > 1 || Math.abs(p.x) > 1 || Math.abs(p.y) > 1
    if (this.element.hidden) return
    this.element.textContent = `${points.length} ${points.length === 1 ? 'ponto marcado' : 'pontos marcados'}`
    this.element.style.left = `${Math.max(8, Math.min(width - 146, ((p.x + 1) * width) / 2 - 118))}px`
    this.element.style.top = `${Math.max(8, Math.min(height - 36, ((1 - p.y) * height) / 2 - 44))}px`
  }
  dispose() {
    this.state = null
    this.element.remove()
    this.ghost.remove()
    this.knife.remove()
  }
}
