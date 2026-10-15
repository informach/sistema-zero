import { type Camera, Plane, Raycaster, Vector2, Vector3 } from 'three'
import type { Vec3 } from '../core/model'

type Axis = 0 | 1 | 2 | 'plane'
type HandleKind = 'move' | 'pivot' | 'scale' | 'rotate'
const NS = 'http://www.w3.org/2000/svg'
const COLORS = [
  'var(--mld-axis-x, #e5484d)',
  'var(--mld-axis-y, #30a46c)',
  'var(--mld-axis-z, #3e63dd)',
]

/** Screen-sized handles backed by ray/axis geometry, independent of zoom and device pixel ratio. */
export class SceneAxisHandles {
  readonly element: SVGSVGElement
  private readonly handles = new Map<Axis, SVGGElement>()
  private point: Vec3 | null = null
  private axes: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  private enabled = false
  private readonly pointers = new Set<number>()
  private active: {
    id: number
    axis: Axis
    start: Vector3
    point: Vec3
    axes: Vec3[]
    target: SVGGElement
    last: Vec3
    screen: [number, number]
    angle: number
    turn: number
  } | null = null
  private readonly ray = new Raycaster()
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: () => Camera,
    private readonly kind: HandleKind,
    private readonly actions: {
      begin(): boolean
      preview(delta: Vec3): boolean
      end(commit: boolean): void
    },
    private readonly request: () => void,
    private readonly activity: (dragging: boolean) => void,
  ) {
    this.element = canvas.ownerDocument.createElementNS(NS, 'svg')
    this.element.setAttribute('class', 'mld-axis-handles')
    const label = { pivot: 'Pivô', move: 'Mover', scale: 'Tamanho', rotate: 'Girar' }[kind]
    this.element.setAttribute(
      'aria-label',
      kind === 'pivot'
        ? 'Alças do pivô'
        : kind === 'move'
          ? 'Alças para mover'
          : `Alças de ${label.toLowerCase()}`,
    )
    const create = (name: string, attrs: Record<string, string | number>) => {
      const node = canvas.ownerDocument.createElementNS(NS, name)
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value))
      return node
    }
    for (const axis of [0, 1, 2, ...(kind === 'rotate' ? [] : ['plane'])] as Axis[]) {
      const group = create('g', {
        role: 'button',
        tabindex: '0',
        'aria-label':
          axis === 'plane'
            ? kind === 'pivot'
              ? 'Mover pivô no plano local X/Z'
              : kind === 'scale'
                ? 'Mudar tamanho em todos os eixos'
                : 'Mover no chão, mantendo a altura'
            : `${label} no eixo ${'XYZ'[axis]}`,
      }) as SVGGElement
      group.style.pointerEvents = 'auto'
      group.style.touchAction = 'none'
      if (kind === 'pivot' && axis === 1) group.style.display = 'none'
      if (kind === 'rotate' && axis !== 'plane') {
        group.style.pointerEvents = 'stroke'
        group.append(
          create('path', { class: 'mld-axis-hit-line', fill: 'none', stroke: 'transparent' }),
          create('path', { fill: 'none', stroke: '#fff', 'stroke-width': 9 }),
          create('path', { fill: 'none', stroke: COLORS[axis]!, 'stroke-width': 5 }),
        )
      } else if (axis !== 'plane') {
        group.append(
          create('line', {
            class: 'mld-axis-hit-line',
            stroke: 'transparent',
            'stroke-linecap': 'round',
          }),
          create('line', { stroke: '#fff', 'stroke-width': 9, 'stroke-linecap': 'round' }),
          create('line', { stroke: COLORS[axis]!, 'stroke-width': 5, 'stroke-linecap': 'round' }),
          kind === 'scale'
            ? create('rect', {
                class: 'mld-axis-tip',
                width: 24,
                height: 24,
                rx: 5,
                fill: COLORS[axis]!,
                stroke: '#fff',
                'stroke-width': 3,
              })
            : create('circle', {
                class: 'mld-axis-tip',
                r: kind === 'pivot' ? 11 : 12,
                fill: COLORS[axis]!,
                stroke: '#fff',
                'stroke-width': 3,
              }),
          create('rect', { class: 'mld-axis-hit-tip', width: 44, height: 44, fill: 'transparent' }),
        )
      } else {
        group.append(
          create('rect', { x: -22, y: -22, width: 44, height: 44, fill: 'transparent' }),
          create('circle', {
            r: kind === 'pivot' ? 20 : 8,
            fill: kind === 'pivot' ? 'var(--mld-pivot, #8b3fd9)' : '#fff',
            stroke: kind === 'pivot' ? '#fff' : '#91a1b7',
            'stroke-width': 3,
          }),
        )
        if (kind === 'pivot') {
          group.append(
            create('circle', {
              cx: 0,
              cy: 0,
              r: 9,
              fill: 'none',
              stroke: '#fff',
              'stroke-width': 2,
            }),
            create('path', {
              d: 'M -12 0 H -5 M 5 0 H 12 M 0 -12 V -5 M 0 5 V 12',
              stroke: '#fff',
              'stroke-width': 2,
            }),
          )
          group.append(
            create('rect', {
              x: 26,
              y: 18,
              width: 47,
              height: 28,
              rx: 8,
              fill: 'var(--mld-pivot, #8b3fd9)',
              'pointer-events': 'none',
            }),
          )
          const text = create('text', {
            x: 49.5,
            y: 37,
            'text-anchor': 'middle',
            fill: '#fff',
            'pointer-events': 'none',
            'font-size': 13,
            'font-weight': 800,
          })
          text.textContent = 'Pivô'
          group.append(text)
        }
      }
      group.addEventListener('pointerdown', (event) => this.begin(event, axis, group))
      group.addEventListener('keydown', (event) => {
        if (
          !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
          !this.enabled ||
          !this.point
        )
          return
        event.preventDefault()
        event.stopPropagation()
        const index =
          axis === 'plane' ? (event.key === 'ArrowUp' || event.key === 'ArrowDown' ? 2 : 0) : axis
        const sign = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1
        if (this.actions.begin()) {
          const value: Vec3 = kind === 'scale' ? [1, 1, 1] : [0, 0, 0]
          if (kind === 'rotate') value[index] = (sign * (event.shiftKey ? 15 : 1) * Math.PI) / 180
          else if (kind === 'scale') {
            for (const i of [0, 1, 2] as const)
              if (axis === 'plane' || i === index)
                value[i] = Math.exp(sign * (event.shiftKey ? 0.1 : 0.01))
          } else
            for (const i of [0, 1, 2] as const)
              value[i] = this.axes[index]![i] * sign * (event.shiftKey ? 1 : 0.1)
          const accepted = this.actions.preview(value)
          this.actions.end(accepted)
          this.request()
        }
      })
      this.handles.set(axis, group)
      this.element.append(group)
    }
    this.element.addEventListener('pointermove', this.move)
    this.element.addEventListener('pointerup', this.up)
    this.element.addEventListener('pointercancel', this.cancel)
    this.element.addEventListener('lostpointercapture', this.cancel)
    canvas.ownerDocument.defaultView?.addEventListener('blur', this.cancel)
    canvas.ownerDocument.defaultView?.addEventListener('keydown', this.key)
    canvas.ownerDocument.addEventListener('pointerdown', this.otherPointer, true)
    canvas.ownerDocument.addEventListener('pointerup', this.releasePointer, true)
    canvas.ownerDocument.addEventListener('pointercancel', this.releasePointer, true)
    canvas.ownerDocument.addEventListener('visibilitychange', this.visibility)
    canvas.parentElement?.append(this.element)
    this.draw()
  }
  get dragging() {
    return this.active !== null
  }
  setTarget(point: Vec3 | null, axes?: Vec3[]) {
    this.point = point
    this.axes = axes ?? [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]
    if (!point) this.cancel()
  }
  setEnabled(enabled: boolean) {
    if (!enabled) this.cancel()
    this.enabled = enabled
    this.draw()
  }
  /** Precision mode exposes Y without changing the pivot's basic X/Z affordance. */
  setVerticalVisible(visible: boolean) {
    const y = this.handles.get(1)
    if (this.kind === 'pivot' && y) y.style.display = visible ? '' : 'none'
  }
  draw() {
    const point = this.point,
      camera = this.camera(),
      width = this.canvas.clientWidth,
      height = this.canvas.clientHeight
    this.element.style.display = this.enabled && point && width > 0 && height > 0 ? '' : 'none'
    if (!this.enabled || !point || !width || !height) return
    camera.updateMatrixWorld(true)
    const origin = new Vector3(...point),
      projected = origin.clone().project(camera)
    this.element.style.visibility = Math.abs(projected.z) <= 1 ? 'visible' : 'hidden'
    const x = ((projected.x + 1) * width) / 2,
      y = ((1 - projected.y) * height) / 2
    for (const [axis, group] of this.handles) {
      group.setAttribute('transform', `translate(${x} ${y})`)
      if (axis === 'plane') continue
      if (this.kind === 'rotate') {
        const a = new Vector3(...this.axes[(axis + 1) % 3]!),
          b = new Vector3(...this.axes[(axis + 2) % 3]!),
          samples: [number, number][] = []
        let scale =
          projected
            .clone()
            .add(new Vector3(236 / width, 0, 0))
            .unproject(camera)
            .distanceTo(origin) / Math.max(a.length(), b.length())
        let radius = 0
        for (let pass = 0; pass < 5; pass++) {
          samples.length = 0
          for (let i = 0; i <= 96; i++) {
            const angle = (i * Math.PI) / 48
            const p = origin
              .clone()
              .addScaledVector(a, Math.cos(angle) * scale)
              .addScaledVector(b, Math.sin(angle) * scale)
              .project(camera)
            samples.push([((p.x - projected.x) * width) / 2, ((projected.y - p.y) * height) / 2])
          }
          radius = Math.max(...samples.map(([px, py]) => Math.hypot(px, py)))
          if (!Number.isFinite(radius) || radius <= 0 || Math.abs(radius - 118) < 0.05) break
          scale *= 118 / radius
        }
        // Ring hit testing uses the corresponding world plane; hide a plane viewed edge-on.
        this.ray.setFromCamera(new Vector2(projected.x, projected.y), camera)
        const direction = this.ray.ray.direction
        const normal = a.clone().cross(b).normalize()
        group.style.visibility =
          Number.isFinite(radius) && radius > 0 && Math.abs(normal.dot(direction)) > 0.04
            ? 'visible'
            : 'hidden'
        const path =
          Number.isFinite(radius) && radius > 0
            ? `${samples.map(([px, py], i) => `${i ? 'L' : 'M'}${px} ${py}`).join(' ')} Z`
            : ''
        for (const node of group.querySelectorAll('path')) node.setAttribute('d', path)
        continue
      }
      const end = origin
        .clone()
        .add(new Vector3(...this.axes[axis]!))
        .project(camera)
      const dx = ((end.x - projected.x) * width) / 2,
        dy = ((projected.y - end.y) * height) / 2,
        length = Math.hypot(dx, dy)
      group.style.visibility = length > 0.2 ? 'visible' : 'hidden'
      const reach = this.kind === 'pivot' ? 106 : axis === 1 ? 129 : 175
      const ex = (dx / Math.max(length, 1e-8)) * reach,
        ey = (dy / Math.max(length, 1e-8)) * reach
      for (const line of group.querySelectorAll('line')) {
        line.setAttribute('x2', String(ex))
        line.setAttribute('y2', String(ey))
      }
      const tip = group.querySelector('.mld-axis-tip')!
      tip.setAttribute(
        this.kind === 'scale' ? 'x' : 'cx',
        String(ex - (this.kind === 'scale' ? 12 : 0)),
      )
      tip.setAttribute(
        this.kind === 'scale' ? 'y' : 'cy',
        String(ey - (this.kind === 'scale' ? 12 : 0)),
      )
      const hit = group.querySelector('.mld-axis-hit-tip')!
      hit.setAttribute('x', String(ex - 22))
      hit.setAttribute('y', String(ey - 22))
    }
  }
  private sample(event: PointerEvent, axis: Axis, point: Vec3, axes: Vec3[]) {
    const rect = this.canvas.getBoundingClientRect()
    this.ray.setFromCamera(
      new Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((event.clientY - rect.top) / rect.height) * 2,
      ),
      this.camera(),
    )
    const origin = new Vector3(...point)
    if (this.kind === 'scale' && axis === 'plane') return origin
    if (axis === 'plane' || this.kind === 'rotate') {
      const a = axis === 'plane' ? 0 : (axis + 1) % 3,
        b = axis === 'plane' ? 2 : (axis + 2) % 3
      const normal = new Vector3(...axes[a]!).cross(new Vector3(...axes[b]!)).normalize()
      if (Math.abs(normal.dot(this.ray.ray.direction)) < 0.04) return null
      return this.ray.ray.intersectPlane(
        new Plane().setFromNormalAndCoplanarPoint(normal, origin),
        new Vector3(),
      )
    }
    const direction = new Vector3(...axes[axis]!).normalize(),
      ray = this.ray.ray,
      cos = direction.dot(ray.direction),
      denominator = 1 - cos * cos
    if (denominator < 0.0025) return null
    const delta = ray.origin.clone().sub(origin)
    const distance = (delta.dot(direction) - cos * delta.dot(ray.direction)) / denominator
    return origin.addScaledVector(direction, distance)
  }
  private begin(event: PointerEvent, axis: Axis, target: SVGGElement) {
    if (this.active) {
      this.cancel()
      return
    }
    if (!this.enabled || !this.point || event.button !== 0 || this.pointers.size !== 1) return
    event.preventDefault()
    event.stopPropagation()
    const start = this.sample(event, axis, this.point, this.axes)
    if (!start || !this.actions.begin()) return
    this.active = {
      id: event.pointerId,
      axis,
      start,
      point: [...this.point],
      axes: this.axes.map((a) => [...a]),
      target,
      last: this.kind === 'scale' ? [1, 1, 1] : [0, 0, 0],
      screen: [event.clientX, event.clientY],
      angle: this.angle(start, axis, this.point, this.axes),
      turn: 0,
    }
    target.setPointerCapture(event.pointerId)
    this.activity(true)
  }
  private angle(point: Vector3, axis: Axis, origin: Vec3, axes: Vec3[]) {
    if (axis === 'plane' || this.kind !== 'rotate') return 0
    const a = new Vector3(...axes[(axis + 1) % 3]!),
      b = new Vector3(...axes[(axis + 2) % 3]!)
    const p = point.clone().sub(new Vector3(...origin)),
      aa = a.dot(a),
      ab = a.dot(b),
      bb = b.dot(b),
      pa = p.dot(a),
      pb = p.dot(b)
    return Math.atan2(pb * aa - pa * ab, pa * bb - pb * ab)
  }
  private readonly move = (event: PointerEvent) => {
    const active = this.active
    if (!active || event.pointerId !== active.id) return
    const next = this.sample(event, active.axis, active.point, active.axes)
    if (!next) return
    let delta: Vec3
    if (this.kind === 'rotate' && active.axis !== 'plane') {
      const angle = this.angle(next, active.axis, active.point, active.axes)
      active.turn += Math.atan2(Math.sin(angle - active.angle), Math.cos(angle - active.angle))
      active.angle = angle
      delta = [0, 0, 0]
      delta[active.axis] = active.turn
    } else if (this.kind === 'scale') {
      delta = [1, 1, 1]
      let amount: number
      if (active.axis === 'plane')
        amount = (event.clientX - active.screen[0] - event.clientY + active.screen[1]) / 175
      else {
        const direction = new Vector3(...active.axes[active.axis]!).normalize()
        const reach = Math.abs(
          active.start
            .clone()
            .sub(new Vector3(...active.point))
            .dot(direction),
        )
        if (reach < 1e-12) return
        amount = next.sub(active.start).dot(direction) / reach
      }
      // Exponential scaling stays strictly positive across the pivot, without a sign flip.
      const factor = Math.exp(Math.max(-9, Math.min(9, amount)))
      for (const i of [0, 1, 2] as const)
        if (active.axis === 'plane' || i === active.axis) delta[i] = factor
    } else delta = next.sub(active.start).toArray() as Vec3
    if (delta.every((n, i) => n === active.last[i])) return
    active.last = delta
    if (!this.actions.preview(delta)) this.cancel()
    this.request()
  }
  private readonly up = (event: PointerEvent) => {
    if (this.active?.id === event.pointerId) {
      this.move(event)
      this.end(true)
    }
  }
  private readonly key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.cancel()
  }
  private readonly otherPointer = (event: PointerEvent) => {
    this.pointers.add(event.pointerId)
    if (this.active && event.pointerId !== this.active.id) this.end(false)
  }
  private readonly releasePointer = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId)
  }
  private readonly visibility = () => {
    if (this.canvas.ownerDocument.hidden) this.cancel()
  }
  readonly cancel = () => {
    this.pointers.clear()
    this.end(false)
  }
  private end(commit: boolean) {
    const active = this.active
    this.active = null
    if (!active) return
    if (active.target.hasPointerCapture(active.id)) active.target.releasePointerCapture(active.id)
    this.actions.end(commit)
    this.activity(false)
    this.request()
  }
  dispose() {
    this.cancel()
    this.element.remove()
    this.canvas.ownerDocument.defaultView?.removeEventListener('blur', this.cancel)
    this.canvas.ownerDocument.defaultView?.removeEventListener('keydown', this.key)
    this.canvas.ownerDocument.removeEventListener('pointerdown', this.otherPointer, true)
    this.canvas.ownerDocument.removeEventListener('pointerup', this.releasePointer, true)
    this.canvas.ownerDocument.removeEventListener('pointercancel', this.releasePointer, true)
    this.canvas.ownerDocument.removeEventListener('visibilitychange', this.visibility)
  }
}
