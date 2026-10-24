import type { ExecutionMotionSample } from '@sistemazero/core/learning'
import type { StudioPythonPlaytestRecipe } from '@sistemazero/core/studio/python-playtest'
import { STUDIO_SNAPSHOT_LIMITS } from '../../snapshotImage'
import type { StudioRuntimeImage } from '../../types'
import { createPythonMissionPoseTracker } from '../missionPose'
import {
  TURTLE_GRAPHICS_LIMITS as LIMITS,
  readTurtleGraphicsRequest,
  type TurtleFont,
  type TurtleInputEvent,
  type TurtleOperation,
  type TurtlePatch,
  type TurtlePoint,
} from './graphicsProtocol'
import { decodeTurtleImage, readTurtleImage, TurtleImageError } from './images'
import { canvasTurtleFont, layoutTurtleText } from './text'

// Below one 60 Hz frame, so a steady 60 Hz program never waits a whole frame for its paint.
const IMMEDIATE_PAINT_AFTER_MS = 12
// Items unchanged for this many paints join the retained layer, in runs of at least this size.
const RETAIN_AFTER_PAINTS = 2
const RETAIN_MIN_ITEMS = 64
const OPAQUE_COLOR = /^#[0-9a-f]{6}$/i
const KEY_NAMES: Record<string, string> = {
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ' ': 'space',
  Space: 'space',
  Enter: 'Return',
  Escape: 'Escape',
  Backspace: 'BackSpace',
  Delete: 'Delete',
  Tab: 'Tab',
}

interface SceneItem extends TurtlePatch {
  kind: 'polygon' | 'line' | 'image' | 'text'
  text?: string
  align?: 'left' | 'center' | 'right'
  font?: TurtleFont
  bindings: Set<string>
  layout?: ReturnType<typeof layoutTurtleText>
  /** Paints completed before this item last changed its look or its place in the order. */
  changedAt: number
}
export interface TurtleRenderer {
  readonly readyForActivityControls: boolean
  prepareActivityControls(): Promise<void>
  dispatchActivityControls(recipe: Pick<StudioPythonPlaytestRecipe, 'keys' | 'clicks'>): void
  /** Host-owned cooperative wake; does not synthesize a learner input event. */
  requestCheckpoint(): void
  exchange(raw: string, images: { id: number; bytes: Uint8Array<ArrayBuffer> }[]): Promise<string>
  dispose(): void
  capture(): Promise<StudioRuntimeImage | null>
  missionPose(objectId: number): ExecutionMotionSample | null
}

/** One instance per frame generation. Never exposes learner objects or callback code to DOM APIs. */
export function createTurtleRenderer(
  container: HTMLElement,
  options: { activityPresentation?: boolean } = {},
): TurtleRenderer {
  const scene = new Map<number, SceneItem>()
  const mission = createPythonMissionPoseTracker(LIMITS.turtles)
  const actorItems = new Map<number, number[]>()
  const images = new Map<number, ImageBitmap>()
  const inputs: TurtleInputEvent[] = []
  let listeners = new AbortController()
  let canvas: HTMLCanvasElement | undefined
  let context: CanvasRenderingContext2D | undefined
  let background = '#ffffff'
  let width = 640
  let height = 480
  let imagePixels = 0
  let pointCount = 0
  let textChars = 0
  let disposed = false
  let closed = false
  let busy = false
  let dirty = true
  let frameSequence = 0
  let presentedWidth = 0
  let presentedHeight = 0
  let capturing = false
  let raf: number | undefined
  let lastPaintAt: number | undefined
  // The retained layer holds the background and the scene's first items as pixels, so a long
  // drawing repaints only what still changes. A composite over an opaque background is exact;
  // any change to a retained item, its order, the background or the size drops the layer.
  let layer: { ctx: CanvasRenderingContext2D; items: Set<number> } | undefined
  let layerSurface: HTMLCanvasElement | undefined
  let lastId: number | undefined
  let presentationTimer: ReturnType<typeof setTimeout> | undefined
  let pendingPresent: { resolve(): void; reject(error: Error): void } | undefined
  let drag: { item: number; button: number } | undefined
  let inputError: Error | undefined
  let pendingWait: { resolve(): void; reject(error: Error): void } | undefined
  let waitTimer: ReturnType<typeof setTimeout> | undefined
  let checkpointPending = false
  let activityEventLoopReady = false
  const activityReadiness = new Set<{ resolve(): void; reject(error: Error): void }>()

  function settleActivityReadiness(error?: Error) {
    for (const waiting of activityReadiness) {
      if (error) waiting.reject(error)
      else waiting.resolve()
    }
    activityReadiness.clear()
  }

  function active() {
    if (disposed) throw new Error('A execução Turtle foi encerrada.')
  }
  function queue(event: TurtleInputEvent) {
    if (disposed || closed) return
    // Mouse motion is replaceable, but key/release order is not silently dropped.
    const last = inputs.at(-1)
    if (
      event.type === 'drag' &&
      last?.type === 'drag' &&
      event.item === last.item &&
      event.button === last.button
    )
      inputs[inputs.length - 1] = event
    else if (inputs.length < LIMITS.inputEvents) inputs.push(event)
    else if (event.type === 'keypress' || event.type === 'drag') {
      // A held key or a moving mouse while Python is busy: drop the extra repeats instead of
      // ending the program. Presses already queued still reach the callbacks in order.
    } else {
      // Releases and clicks must not be lost: make room by dropping the oldest repeat.
      const replaceable = inputs.findIndex(
        (item) => item.type === 'keypress' || item.type === 'drag',
      )
      if (replaceable >= 0) {
        inputs.splice(replaceable, 1)
        inputs.push(event)
      } else {
        inputs.length = 0
        inputError = new Error('A fila de entrada Turtle excedeu o limite.')
        listeners.abort()
      }
    }
    wake()
  }
  function wake(error?: Error) {
    if (waitTimer !== undefined) clearTimeout(waitTimer)
    waitTimer = undefined
    const waiting = pendingWait
    pendingWait = undefined
    if (error) waiting?.reject(error)
    else waiting?.resolve()
  }
  function wait(timeoutMs: number | null) {
    active()
    if (checkpointPending) {
      checkpointPending = false
      return Promise.resolve()
    }
    if (inputs.length || closed || inputError) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      pendingWait = { resolve, reject }
      if (timeoutMs !== null) waitTimer = setTimeout(() => wake(), timeoutMs)
    })
  }
  function changes(current: SceneItem, patch: TurtlePatch) {
    for (const [key, value] of Object.entries(patch) as [keyof TurtlePatch, unknown][]) {
      if (key !== 'points') {
        if (current[key] !== value) return true
        continue
      }
      const before = current.points
      const after = value as TurtlePoint[]
      if (!before || before.length !== after.length) return true
      for (let index = 0; index < after.length; index++)
        if (before[index]![0] !== after[index]![0] || before[index]![1] !== after[index]![1])
          return true
    }
    return false
  }
  function path(points: TurtlePoint[], close: boolean) {
    const result = new Path2D()
    if (points.length) {
      result.moveTo(...points[0]!)
      for (let index = 1; index < points.length; index++) result.lineTo(...points[index]!)
      if (close) result.closePath()
    }
    return result
  }
  function measure(item: SceneItem) {
    item.layout ??= layoutTurtleText(
      ensureCanvas(),
      item.text!,
      item.font!,
      item.align!,
      item.x!,
      item.y!,
    )
    return item.layout
  }
  function hit(x: number, y: number) {
    const ctx = ensureCanvas()
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    try {
      for (const [id, item] of [...scene].reverse()) {
        // Tk picks the topmost geometric item before looking up its binding.
        // Even an unfilled polygon owns its interior and occludes lower items.
        if (
          item.kind === 'polygon' &&
          item.points?.length &&
          ctx.isPointInPath(path(item.points, true), x, y)
        )
          return id
        if ((item.kind === 'line' || item.kind === 'polygon') && item.points?.length) {
          ctx.lineWidth = (item.width ?? 1) + 2 // Tk canvas closeenough defaults to one pixel.
          if (ctx.isPointInStroke(path(item.points, item.kind === 'polygon'), x, y)) return id
        }
        if (item.kind === 'text') {
          const bounds = measure(item).bounds
          if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom)
            return id
        }
        if (item.kind === 'image' && item.image) {
          const image = images.get(item.image)
          if (
            image &&
            Math.abs(x - (item.x ?? 0)) <= image.width / 2 &&
            Math.abs(y - (item.y ?? 0)) <= image.height / 2
          )
            return id
        }
      }
      return undefined
    } finally {
      ctx.restore()
    }
  }
  function pointer(event: PointerEvent, type: 'click' | 'release' | 'drag') {
    if (closed || disposed || !canvas) return
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const x = ((event.clientX - bounds.left) * width) / bounds.width - width / 2
    const y = ((event.clientY - bounds.top) * height) / bounds.height - height / 2
    const button = type === 'drag' ? drag?.button : [1, 2, 3][event.button]
    if (!button) return
    const item = type === 'click' ? hit(x, y) : drag?.item
    if (type === 'click') {
      canvas.focus({ preventScroll: true })
      if (item !== undefined) drag = { item, button }
      canvas.setPointerCapture(event.pointerId)
    }
    if (type !== 'drag' || item !== undefined)
      queue({ type, button, x, y, ...(item === undefined ? {} : { item }) })
    if (type === 'release') drag = undefined
    event.preventDefault()
  }
  function ensureCanvas() {
    active()
    if (context) return context
    canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.tabIndex = 0
    canvas.setAttribute('aria-label', 'Desenho Turtle. Clique para usar o teclado.')
    canvas.style.cssText =
      'display:block;max-width:100%;max-height:100%;object-fit:contain;touch-action:none;outline-offset:-2px'
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D não está disponível neste navegador.')
    context = ctx
    const settings = { signal: listeners.signal }
    for (const [dom, type] of [
      ['keydown', 'keypress'],
      ['keyup', 'keyrelease'],
    ] as const) {
      canvas.addEventListener(
        dom,
        (event) => {
          if (event.key.length > 80 || closed || disposed) return
          // Browser navigation shortcuts remain available; game keys stay in the canvas.
          if (event.ctrlKey || event.metaKey || event.altKey) return
          const key = KEY_NAMES[event.key] ?? event.key
          // Auto-repeat of a key whose press is still waiting adds nothing for Python.
          if (
            event.repeat &&
            inputs.some((item) => item.type === type && 'key' in item && item.key === key)
          ) {
            if (event.key !== 'Tab') event.preventDefault()
            return
          }
          queue({ type, key })
          if (event.key !== 'Tab') event.preventDefault()
        },
        settings,
      )
    }
    canvas.addEventListener('pointerdown', (event) => pointer(event, 'click'), settings)
    canvas.addEventListener('pointermove', (event) => pointer(event, 'drag'), settings)
    canvas.addEventListener('pointerup', (event) => pointer(event, 'release'), settings)
    canvas.addEventListener(
      'pointercancel',
      () => {
        drag = undefined
      },
      settings,
    )
    canvas.addEventListener('contextmenu', (event) => event.preventDefault(), settings)
    container.append(canvas)
    return ctx
  }
  function draw(ctx: CanvasRenderingContext2D, item: SceneItem) {
    if (item.kind === 'line' || item.kind === 'polygon') {
      if (!item.points?.length) return
      const shape = path(item.points, item.kind === 'polygon')
      if (item.kind === 'polygon' && item.fill) {
        ctx.fillStyle = item.fill
        ctx.fill(shape)
      }
      const stroke = item.kind === 'line' ? item.fill : item.outline
      if (stroke && (item.width ?? 1) > 0) {
        const [x, y] = item.points[0]!
        if (item.kind === 'line' && item.points.every(([px, py]) => px === x && py === y)) {
          // Canvas prunes zero-length segments, so their round caps paint nothing. Tk draws
          // them as a disc, and turtle.dot() is exactly such a line: paint the disc.
          ctx.fillStyle = stroke
          ctx.beginPath()
          ctx.arc(x, y, (item.width ?? 1) / 2, 0, Math.PI * 2)
          ctx.fill()
          return
        }
        ctx.strokeStyle = stroke
        ctx.lineWidth = item.width ?? 1
        ctx.stroke(shape)
      }
    } else if (item.kind === 'image' && item.image) {
      const image = images.get(item.image)
      if (image)
        ctx.drawImage(image, (item.x ?? 0) - image.width / 2, (item.y ?? 0) - image.height / 2)
    } else if (item.kind === 'text' && item.fill) {
      const layout = measure(item)
      ctx.font = canvasTurtleFont(item.font!)
      ctx.fillStyle = item.fill
      ctx.textAlign = 'left'
      ctx.textBaseline = 'alphabetic'
      const styles = item.font![2].split(/\s+/)
      for (const [index, line] of layout.lines.entries()) {
        const baseline = layout.top + layout.ascent + index * layout.lineHeight
        for (const chunk of line.chunks)
          ctx.fillText(chunk.text, layout.left + chunk.left, baseline)
        const thickness = Math.max(1, layout.size / 16)
        if (styles.includes('underline'))
          ctx.fillRect(layout.left, baseline + layout.descent / 2, line.width, thickness)
        if (styles.includes('overstrike'))
          ctx.fillRect(layout.left, baseline - layout.ascent / 3, line.width, thickness)
      }
    }
  }
  function sceneSpace(ctx: CanvasRenderingContext2D) {
    ctx.translate(width / 2, height / 2)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }
  /** Extends the retained layer with the next items that stayed unchanged; returns its size. */
  function retain() {
    if (!OPAQUE_COLOR.test(background)) {
      layer = undefined
      return 0
    }
    const retained = layer?.items.size ?? 0
    const stable: [number, SceneItem][] = []
    let index = 0
    for (const entry of scene) {
      if (index++ < retained) continue
      if (entry[1].changedAt > frameSequence - RETAIN_AFTER_PAINTS) break
      stable.push(entry)
    }
    if (stable.length < RETAIN_MIN_ITEMS) return retained
    if (!layer) {
      layerSurface ??= document.createElement('canvas')
      layerSurface.width = width
      layerSurface.height = height
      const ctx = layerSurface.getContext('2d')
      if (!ctx) return 0
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
      sceneSpace(ctx)
      layer = { ctx, items: new Set() }
    }
    for (const [id, item] of stable) {
      draw(layer.ctx, item)
      layer.items.add(id)
    }
    return layer.items.size
  }
  function dropLayer(id?: number) {
    if (id === undefined || layer?.items.has(id)) layer = undefined
  }
  function paint() {
    if (!dirty || closed) return
    const ctx = ensureCanvas()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const retained = retain()
    if (retained) ctx.drawImage(layerSurface!, 0, 0)
    else if (background) {
      ctx.fillStyle = background
      ctx.fillRect(0, 0, width, height)
    }
    sceneSpace(ctx)
    let index = 0
    for (const item of scene.values()) if (index++ >= retained) draw(ctx, item)
    dirty = false
    frameSequence++
    mission.present()
    presentedWidth = width
    presentedHeight = height
    lastPaintAt = performance.now()
  }
  function present() {
    active()
    if (closed || !dirty) return Promise.resolve()
    // Like Tk's update(), a program presenting no faster than the display paints now: waiting
    // for the next animation frame there only stalls Python for up to a whole frame. A program
    // that already painted within this frame, and the first paint, still wait for the frame,
    // which keeps faster producers paced by the display.
    if (
      !options.activityPresentation &&
      raf === undefined &&
      lastPaintAt !== undefined &&
      performance.now() - lastPaintAt >= IMMEDIATE_PAINT_AFTER_MS
    ) {
      paint()
      return Promise.resolve()
    }
    return new Promise<void>((resolve, reject) => {
      pendingPresent = { resolve, reject }
      const render = () => {
        raf = undefined
        presentationTimer = undefined
        pendingPresent = undefined
        try {
          active()
          paint()
          resolve()
        } catch (error) {
          reject(error)
        }
      }
      // Offscreen activity frames have no visible animation frame budget. Keep
      // their cooperative presentation bounded at 60Hz without skipping paints
      // or advancing the Python clock. Interactive players retain browser RAF.
      if (options.activityPresentation) presentationTimer = setTimeout(render, 16)
      else raf = requestAnimationFrame(render)
    })
  }
  function item(id: number) {
    const value = scene.get(id)
    if (!value) throw new Error('Objeto Turtle ausente.')
    return value
  }
  function remove(id: number) {
    const previous = scene.get(id)
    pointCount -= previous?.points?.length ?? 0
    textChars -= previous?.text?.length ?? 0
    scene.delete(id)
    if (lastId === id) lastId = undefined
    dropLayer(id)
    if (drag?.item === id) drag = undefined
  }
  function apply(operation: Exclude<TurtleOperation, { op: 'image' }>) {
    if (closed && operation.op !== 'close' && operation.op !== 'open')
      throw new Error('A tela Turtle foi fechada.')
    if (!['bind', 'title', 'focus'].includes(operation.op)) dirty = true
    switch (operation.op) {
      case 'actor':
        if (!actorItems.has(operation.id) && actorItems.size >= LIMITS.turtles)
          throw new Error('Muitas tartarugas para observar.')
        if (operation.items.some((id) => !scene.has(id)))
          throw new Error('A tartaruga observada não possui desenho no motor gráfico.')
        actorItems.set(operation.id, operation.items)
        mission.stage(operation.id, operation.x, operation.y, operation.visible)
        break
      case 'open':
        mission.clearStage()
        actorItems.clear()
        releaseScreen()
        activityEventLoopReady = false
        listeners = new AbortController()
        closed = false
        width = 640
        height = 480
        background = '#ffffff'
        break
      case 'create': {
        if (scene.has(operation.id) || scene.size >= LIMITS.items)
          throw new Error('Limite de objetos Turtle atingido.')
        const { op: _op, id, ...data } = operation
        if (data.kind === 'text') {
          textChars += data.text.length
          if (textChars > 1_000_000) throw new Error('Limite de texto Turtle atingido.')
        }
        scene.set(id, { ...data, bindings: new Set(), changedAt: frameSequence })
        lastId = id
        break
      }
      case 'patch': {
        const current = item(operation.id)
        if (operation.points) {
          if (current.kind !== 'line' && current.kind !== 'polygon')
            throw new Error('Tipo de desenho inválido.')
          pointCount += operation.points.length - (current.points?.length ?? 0)
          if (pointCount > LIMITS.points) throw new Error('Limite de pontos Turtle atingido.')
        }
        if (operation.image && !images.has(operation.image))
          throw new Error('Imagem Turtle não carregada.')
        const { op: _op, id: _id, ...patch } = operation
        // Turtle redraws every turtle on update(); an identical patch changes nothing.
        if (!changes(current, patch)) break
        Object.assign(current, patch)
        current.layout = undefined
        current.changedAt = frameSequence
        dropLayer(operation.id)
        break
      }
      case 'delete':
        if (operation.id === 'all') {
          scene.clear()
          actorItems.clear()
          mission.clearStage()
          pointCount = textChars = 0
          drag = undefined
          lastId = undefined
          dropLayer()
        } else remove(operation.id)
        break
      case 'raise': {
        const value = item(operation.id)
        lastId ??= [...scene.keys()].at(-1)
        if (operation.id === lastId) break
        scene.delete(operation.id)
        scene.set(operation.id, value)
        value.changedAt = frameSequence
        lastId = operation.id
        dropLayer(operation.id)
        break
      }
      case 'lower': {
        const value = item(operation.id)
        value.changedAt = frameSequence
        if (lastId === operation.id) lastId = undefined
        dropLayer()
        const rest = [...scene].filter(([id]) => id !== operation.id)
        scene.clear()
        scene.set(operation.id, value)
        for (const [id, entry] of rest) scene.set(id, entry)
        break
      }
      case 'background':
        if (operation.color !== background) dropLayer()
        background = operation.color
        break
      case 'size':
        width = operation.width
        height = operation.height
        presentedWidth = presentedHeight = 0
        dropLayer()
        if (canvas) {
          canvas.width = width
          canvas.height = height
        }
        break
      case 'title':
        ensureCanvas()
        canvas!.setAttribute('aria-label', operation.text)
        break
      case 'focus':
        ensureCanvas()
        canvas!.focus({ preventScroll: true })
        break
      case 'bind': {
        const binding = `${operation.event}:${operation.button}`
        const target = item(operation.id).bindings
        if (operation.enabled) target.add(binding)
        else target.delete(binding)
        break
      }
      case 'close':
        closed = true
        actorItems.clear()
        mission.clearStage()
        settleActivityReadiness(new Error('A tela Turtle foi fechada.'))
        releaseScreen()
        break
    }
  }
  function releaseScreen() {
    listeners.abort()
    wake()
    for (const image of images.values()) image.close()
    images.clear()
    scene.clear()
    layer = lastId = undefined
    inputs.length = 0
    imagePixels = pointCount = textChars = 0
    presentedWidth = presentedHeight = 0
    drag = undefined
    canvas?.remove()
    canvas = undefined
    context = undefined
  }
  return {
    missionPose(objectId) {
      if (disposed || closed || !actorItems.get(objectId)?.every((id) => scene.has(id))) return null
      return mission.read(objectId)
    },
    get readyForActivityControls() {
      return !disposed && !closed && activityEventLoopReady && !!canvas && frameSequence > 0
    },
    prepareActivityControls() {
      active()
      if (closed) return Promise.reject(new Error('A tela Turtle foi fechada.'))
      if (activityEventLoopReady && canvas && frameSequence > 0) return Promise.resolve()
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          activityReadiness.delete(waiting)
          reject(new Error('A tela Turtle não ficou pronta dentro do prazo da tarefa.'))
        }, 10_000)
        const waiting = {
          resolve() {
            clearTimeout(timer)
            resolve()
          },
          reject(error: Error) {
            clearTimeout(timer)
            reject(error)
          },
        }
        activityReadiness.add(waiting)
      })
    },
    dispatchActivityControls(recipe) {
      active()
      if (!canvas || closed || !frameSequence || !activityEventLoopReady)
        throw new Error('A tela Turtle ainda não está pronta para os controles da tarefa.')
      // Host-owned, schema-checked recipe. No controls are accepted from worker data.
      for (const key of recipe.keys) {
        queue({ type: 'keypress', key: KEY_NAMES[key] ?? key })
        queue({ type: 'keyrelease', key: KEY_NAMES[key] ?? key })
      }
      for (const click of recipe.clicks) {
        const x = click.x * width - width / 2
        const y = click.y * height - height / 2
        const button = { left: 1, middle: 2, right: 3 }[click.button]
        const target = hit(x, y)
        const item = target === undefined ? {} : { item: target }
        queue({ type: 'click', x, y, button, ...item })
        queue({ type: 'release', x, y, button, ...item })
      }
    },
    requestCheckpoint() {
      active()
      checkpointPending = !pendingWait
      wake()
    },
    async capture() {
      active()
      if (capturing) throw new Error('Uma captura Turtle já está em andamento.')
      if (
        closed ||
        !canvas ||
        !frameSequence ||
        canvas.width !== presentedWidth ||
        canvas.height !== presentedHeight
      )
        return null
      const scale = Math.min(
        1,
        STUDIO_SNAPSHOT_LIMITS.width / canvas.width,
        STUDIO_SNAPSHOT_LIMITS.height / canvas.height,
      )
      const image = document.createElement('canvas')
      image.width = Math.max(1, Math.round(canvas.width * scale))
      image.height = Math.max(1, Math.round(canvas.height * scale))
      const ctx = image.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(canvas, 0, 0, image.width, image.height)
      // Copy the presented frame now; encoding may finish after another frame paints.
      const capturedSequence = frameSequence
      const capturedCanvas = canvas
      capturing = true
      try {
        const blob = await new Promise<Blob | null>((resolve) => image.toBlob(resolve, 'image/png'))
        active()
        if (!blob || closed || canvas !== capturedCanvas) return null
        if (blob.size > Math.floor(((STUDIO_SNAPSHOT_LIMITS.dataUrlChars - 22) * 3) / 4))
          return null
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () =>
            typeof reader.result === 'string'
              ? resolve(reader.result)
              : reject(new Error('Não foi possível ler a captura.'))
          reader.onerror = () =>
            reject(reader.error ?? new Error('Não foi possível ler a captura.'))
          reader.onabort = () => reject(new DOMException('Captura cancelada.', 'AbortError'))
          reader.readAsDataURL(blob)
        })
        active()
        if (closed || canvas !== capturedCanvas) return null
        if (
          !dataUrl.startsWith('data:image/png;base64,') ||
          dataUrl.length > STUDIO_SNAPSHOT_LIMITS.dataUrlChars
        )
          return null
        return {
          dataUrl,
          width: image.width,
          height: image.height,
          frameSequence: capturedSequence,
        }
      } finally {
        capturing = false
      }
    },
    async exchange(raw, attachments) {
      active()
      if (inputError) throw inputError
      if (busy) throw new Error('Uma atualização Turtle já está em andamento.')
      busy = true
      try {
        const request = readTurtleGraphicsRequest(raw)
        const requestedImages = request.operations.filter((operation) => operation.op === 'image')
        if (
          !Array.isArray(attachments) ||
          attachments.length !== requestedImages.length ||
          attachments.length + images.size > LIMITS.images
        )
          throw new Error('Imagens Turtle inválidas.')
        const supplied = new Map<number, Uint8Array<ArrayBuffer>>()
        for (const attachment of attachments) {
          if (supplied.has(attachment.id)) throw new Error('Imagem Turtle duplicada.')
          supplied.set(attachment.id, attachment.bytes)
        }
        for (const operation of request.operations) {
          active()
          if (operation.op !== 'image') {
            apply(operation)
            continue
          }
          if (images.has(operation.id)) throw new Error('Imagem Turtle duplicada.')
          const source = readTurtleImage(supplied.get(operation.id))
          const pixels = source.width * source.height
          if (imagePixels + pixels > LIMITS.totalImagePixels)
            throw new Error('Limite de imagens Turtle atingido.')
          const decoded = await decodeTurtleImage(source)
          if (disposed || closed) {
            decoded.close()
            active()
            throw new Error('A tela Turtle foi fechada.')
          }
          imagePixels += pixels
          images.set(operation.id, decoded)
        }
        let value: unknown = null
        if (request.query?.type === 'viewport') {
          const availableWidth = container.clientWidth
          const availableHeight = container.clientHeight
          // A hidden/unmeasured host is not a one-pixel desktop. Keep the logical
          // canvas size until layout exists; fractional Screen.setup defaults
          // otherwise turn that temporary viewport into an invalid zero-sized screen.
          value =
            availableWidth > 1 && availableHeight > 1
              ? [availableWidth, availableHeight]
              : [width, height]
        } else if (request.query?.type === 'text-bounds') {
          const target = item(request.query.id)
          if (target.kind !== 'text') throw new Error('Medição Turtle exige texto.')
          value = measure(target).bounds
        } else if (request.query?.type === 'activity-turn') {
          await present()
          activityEventLoopReady = true
          settleActivityReadiness()
        } else if (request.query?.type === 'present') await present()
        else if (request.query?.type === 'wait') {
          await present()
          activityEventLoopReady = true
          settleActivityReadiness()
          await wait(request.query.timeoutMs)
        }
        active()
        if (inputError) throw inputError
        mission.advance()
        return JSON.stringify({ events: inputs.splice(0), value })
      } catch (error) {
        active()
        if (error instanceof TurtleImageError)
          return JSON.stringify({
            // Python raises the image exception before importing response events.
            // Keep input for the next successful exchange in this generation.
            events: [],
            error: { kind: 'image', message: error.message },
          })
        throw error
      } finally {
        busy = false
      }
    },
    dispose() {
      mission.retire()
      actorItems.clear()
      if (disposed) return
      disposed = true
      settleActivityReadiness(new Error('A execução Turtle foi encerrada.'))
      wake(new Error('A execução Turtle foi encerrada.'))
      listeners.abort()
      if (raf !== undefined) cancelAnimationFrame(raf)
      raf = undefined
      if (presentationTimer !== undefined) clearTimeout(presentationTimer)
      presentationTimer = undefined
      pendingPresent?.reject(new Error('A execução Turtle foi encerrada.'))
      pendingPresent = undefined
      for (const image of images.values()) image.close()
      images.clear()
      scene.clear()
      layer = layerSurface = lastId = undefined
      inputs.length = 0
      canvas?.remove()
      canvas = undefined
      context = undefined
    },
  }
}
