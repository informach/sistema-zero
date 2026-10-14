'use client'

import {
  ANNOTATION_WIDTHS,
  type AnnotationBoardTheme,
  type AnnotationLayer,
  type AnnotationPoint,
  type AnnotationShape,
  type AnnotationSize,
  type AnnotationSurface,
  type AnnotationText,
  type AnnotationTool,
  type AnnotationWidth,
  addShape,
  arrowHead,
  BOARD_BACKGROUND,
  clearLayer,
  commitErase,
  containedBox,
  EMPTY_LAYER,
  ERASER_RADIUS,
  eraseAt,
  HIGHLIGHTER_ALPHA,
  isMeaningfulShape,
  type LaserPoint,
  laserFade,
  liveLaser,
  pointsAlong,
  shouldAppendPoint,
  strokeWidthFor,
  undoLayer,
} from './annotation'

/**
 * O compositor do desenho sobre a tela (14/10/2026).
 *
 * Um `<canvas>` que, a cada quadro, pinta a tela capturada (ou o fundo do quadro branco) e por
 * cima o desenho da professora. `canvas.captureStream()` é a trilha PUBLICADA como `demo` desde o
 * começo do compartilhamento: sem desenho ele só repassa a tela. Assim o desenho entra na imagem
 * que a turma vê e na gravação (feita das trilhas publicadas), e trocar entre tela e quadro não
 * mexe na transmissão (o transporte não troca trilha no meio).
 *
 * ⚠️ O relógio mora num Worker (`screen-annotation-clock.worker.ts`): com a aba da sala em
 * segundo plano, um `setInterval` daqui cai para 1 quadro por segundo.
 */

export const ANNOTATION_FPS = 15
/** Teto do quadro do compositor (a aba capturada chega a 1600x1000). */
export const ANNOTATION_MAX_SIZE: AnnotationSize = { width: 1920, height: 1080 }
/** O quadro de quem começa direto no quadro branco, sem tela. */
export const BOARD_SIZE: AnnotationSize = { width: 1600, height: 900 }
const SCREEN_BACKDROP = '#000000'

export interface AnnotationStyle {
  color: string
  width: AnnotationWidth
}

export interface ScreenAnnotationState {
  surface: AnnotationSurface
  boardTheme: AnnotationBoardTheme
  hasScreen: boolean
  canUndo: boolean
  shapeCount: number
}

export interface ScreenAnnotation {
  readonly canvas: HTMLCanvasElement
  /** A trilha composta, que vai para a sala. */
  readonly stream: MediaStream
  readonly width: number
  readonly height: number
  getState(): ScreenAnnotationState
  subscribe(listener: () => void): () => void
  setSurface(surface: AnnotationSurface): void
  setBoardTheme(theme: AnnotationBoardTheme): void
  /** Liga (ou troca) a tela capturada. A anterior é solta. */
  attachScreen(screen: MediaStream): void
  /** Começa um gesto: traço, forma arrastada ou borracha. */
  begin(tool: DrawingTool, point: AnnotationPoint, style: AnnotationStyle): void
  move(point: AnnotationPoint): void
  end(): void
  cancel(): void
  addText(at: AnnotationPoint, text: string, style: AnnotationStyle): void
  /** Um ponto da luz mágica. `newTrail` começa um rastro separado do anterior. */
  pointLaser(point: AnnotationPoint, color: string, newTrail?: boolean): void
  undo(): void
  clear(): void
  /** Pinta já (o relógio pinta sozinho; a prévia pede para o traço aparecer sem esperar). */
  render(): void
  /** Para o relógio e solta a tela, o vídeo e a trilha composta. */
  close(): void
}

export type DrawingTool = Exclude<AnnotationTool, 'text' | 'laser'>

/** O que o compositor pede ao navegador. Os testes trocam tudo isto. */
export interface ScreenAnnotationEnvironment {
  createCanvas(): HTMLCanvasElement
  createVideo(): HTMLVideoElement
  startClock(fps: number, tick: () => void): () => void
  now(): number
}

/** Fonte do texto (a mesma mede e desenha). */
export function annotationFont(size: number): string {
  return `700 ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`
}

/** O tamanho do compositor: o da tela capturada (até 1920x1080), em números pares. */
export function compositorSize(settings?: { width?: number; height?: number }): AnnotationSize {
  const width = settings?.width
  const height = settings?.height
  if (!width || !height) return BOARD_SIZE
  const scale = Math.min(1, ANNOTATION_MAX_SIZE.width / width, ANNOTATION_MAX_SIZE.height / height)
  const even = (value: number) => Math.max(2, Math.round((value * scale) / 2) * 2)
  return { width: even(width), height: even(height) }
}

/**
 * O relógio de verdade: um Worker que bate `fps` vezes por segundo, mesmo com a aba escondida.
 * Sem Worker (ou se ele não carregar), cai no `setInterval`, que só vale com a aba à vista.
 */
export function startAnnotationClock(fps: number, tick: () => void): () => void {
  let interval: ReturnType<typeof setInterval> | undefined
  let worker: Worker | undefined
  const fallback = () => {
    interval ??= setInterval(tick, 1000 / fps)
  }
  if (typeof Worker === 'function') {
    try {
      worker = new Worker(new URL('./screen-annotation-clock.worker.ts', import.meta.url), {
        type: 'module',
        name: 'sz-screen-annotation-clock',
      })
      worker.addEventListener('message', () => tick())
      worker.addEventListener('error', () => {
        worker?.terminate()
        worker = undefined
        fallback()
      })
      worker.postMessage({ fps })
    } catch {
      worker = undefined
      fallback()
    }
  } else fallback()
  return () => {
    worker?.terminate()
    worker = undefined
    clearInterval(interval)
    interval = undefined
  }
}

const browserEnvironment: ScreenAnnotationEnvironment = {
  createCanvas: () => document.createElement('canvas'),
  createVideo: () => document.createElement('video'),
  startClock: startAnnotationClock,
  now: () => performance.now(),
}

function isLightColor(color: string): boolean {
  const match = /^#([0-9a-f]{6})$/i.exec(color)
  if (!match) return false
  const value = Number.parseInt(match[1]!, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 160
}

/** Desenha uma forma guardada (ou o rascunho do gesto) no contexto do compositor. */
export function drawAnnotationShape(context: CanvasRenderingContext2D, shape: AnnotationShape) {
  context.save()
  context.globalAlpha = 1
  context.strokeStyle = shape.color
  context.fillStyle = shape.color
  context.lineCap = 'round'
  context.lineJoin = 'round'
  switch (shape.kind) {
    case 'pen':
    case 'highlighter': {
      if (shape.kind === 'highlighter') context.globalAlpha = HIGHLIGHTER_ALPHA
      context.lineWidth = shape.width
      const [first, ...rest] = shape.points
      if (!first) break
      context.beginPath()
      if (!rest.length) {
        // Um toque com a caneta deixa um ponto.
        context.arc(first.x, first.y, shape.width / 2, 0, Math.PI * 2)
        context.fill()
        break
      }
      context.moveTo(first.x, first.y)
      for (const point of rest) context.lineTo(point.x, point.y)
      context.stroke()
      break
    }
    case 'rect':
      context.lineWidth = shape.width
      context.strokeRect(
        Math.min(shape.from.x, shape.to.x),
        Math.min(shape.from.y, shape.to.y),
        Math.abs(shape.to.x - shape.from.x),
        Math.abs(shape.to.y - shape.from.y),
      )
      break
    case 'ellipse':
      context.lineWidth = shape.width
      context.beginPath()
      context.ellipse(
        (shape.from.x + shape.to.x) / 2,
        (shape.from.y + shape.to.y) / 2,
        Math.abs(shape.to.x - shape.from.x) / 2,
        Math.abs(shape.to.y - shape.from.y) / 2,
        0,
        0,
        Math.PI * 2,
      )
      context.stroke()
      break
    case 'arrow': {
      const [left, tip, right] = arrowHead(shape.from, shape.to, shape.width)
      context.lineWidth = shape.width
      // A haste para antes da ponta, senão a ponta grossa fica arredondada.
      const back = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 }
      context.beginPath()
      context.moveTo(shape.from.x, shape.from.y)
      context.lineTo(back.x, back.y)
      context.stroke()
      context.beginPath()
      context.moveTo(left.x, left.y)
      context.lineTo(tip.x, tip.y)
      context.lineTo(right.x, right.y)
      context.closePath()
      context.fill()
      break
    }
    case 'text':
      context.font = annotationFont(shape.size)
      context.textBaseline = 'top'
      // Contorno do lado oposto da cor: o texto se lê sobre qualquer tela.
      context.lineWidth = Math.max(3, shape.size / 10)
      context.strokeStyle = isLightColor(shape.color)
        ? 'rgba(17, 24, 39, 0.85)'
        : 'rgba(255, 255, 255, 0.85)'
      context.strokeText(shape.text, shape.at.x, shape.at.y)
      context.fillText(shape.text, shape.at.x, shape.at.y)
      break
  }
  context.restore()
}

/** A luz mágica: o rastro brilha e apaga com a idade de cada ponto. */
export function drawLaser(
  context: CanvasRenderingContext2D,
  points: readonly LaserPoint[],
  now: number,
) {
  if (!points.length) return
  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.shadowBlur = 24
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!
    const point = points[index]!
    if (previous.trail !== point.trail) continue
    const fade = laserFade(point, now)
    if (fade <= 0) continue
    context.globalAlpha = fade
    context.strokeStyle = point.color
    context.shadowColor = point.color
    context.lineWidth = 4 + 8 * fade
    context.beginPath()
    context.moveTo(previous.x, previous.y)
    context.lineTo(point.x, point.y)
    context.stroke()
  }
  const head = points.at(-1)!
  const fade = laserFade(head, now)
  if (fade > 0) {
    context.globalAlpha = fade
    context.shadowColor = head.color
    context.fillStyle = head.color
    context.beginPath()
    context.arc(head.x, head.y, 14, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#ffffff'
    context.beginPath()
    context.arc(head.x, head.y, 6, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

type Draft =
  | {
      kind: 'pen' | 'highlighter'
      id: string
      color: string
      width: number
      points: AnnotationPoint[]
    }
  | {
      kind: 'arrow' | 'rect' | 'ellipse'
      id: string
      color: string
      width: number
      from: AnnotationPoint
      to: AnnotationPoint
    }

export function createScreenAnnotation(
  options: {
    /** A aba capturada. Sem ela o compositor nasce no quadro branco. */
    screen?: MediaStream | null
    surface?: AnnotationSurface
    boardTheme?: AnnotationBoardTheme
    /** A tela parou (o "Parar de compartilhar" do navegador): quem chamou solta tudo. */
    onScreenEnded?(): void
    fps?: number
  } = {},
  environment: ScreenAnnotationEnvironment = browserEnvironment,
): ScreenAnnotation {
  const size = compositorSize(options.screen?.getVideoTracks()[0]?.getSettings())
  const canvas = environment.createCanvas()
  canvas.width = size.width
  canvas.height = size.height
  const found = canvas.getContext('2d', { alpha: false }) as CanvasRenderingContext2D | null
  if (!found || typeof canvas.captureStream !== 'function')
    throw new Error('Este navegador não consegue desenhar sobre a tela. Use o Chrome atualizado.')
  const context: CanvasRenderingContext2D = found
  const video = environment.createVideo()
  video.muted = true
  video.playsInline = true
  video.autoplay = true

  let surface: AnnotationSurface = options.surface ?? (options.screen ? 'screen' : 'board')
  let boardTheme: AnnotationBoardTheme = options.boardTheme ?? 'light'
  const layers: Record<AnnotationSurface, AnnotationLayer> = {
    screen: EMPTY_LAYER,
    board: EMPTY_LAYER,
  }
  let screen: MediaStream | null = null
  let draft: Draft | null = null
  let erasing: { before: readonly AnnotationShape[]; last: AnnotationPoint } | null = null
  let laser: readonly LaserPoint[] = []
  let trail = 0
  let sequence = 0
  let closed = false
  const listeners = new Set<() => void>()
  let state: ScreenAnnotationState = snapshot()

  function snapshot(): ScreenAnnotationState {
    const layer = layers[surface]
    return {
      surface,
      boardTheme,
      hasScreen: screen !== null,
      canUndo: layer.history.length > 0,
      shapeCount: layer.shapes.length,
    }
  }
  function changed() {
    state = snapshot()
    for (const listener of [...listeners]) listener()
  }

  function onScreenTrackEnded(this: MediaStreamTrack) {
    if (closed || !screen?.getTracks().includes(this)) return
    options.onScreenEnded?.()
  }
  function releaseScreen() {
    if (!screen) return
    for (const track of screen.getTracks()) {
      track.removeEventListener('ended', onScreenTrackEnded)
      track.stop()
    }
    screen = null
    video.pause()
    video.srcObject = null
  }

  function render() {
    if (closed) return
    const now = environment.now()
    context.save()
    context.globalAlpha = 1
    context.shadowBlur = 0
    if (surface === 'board') {
      context.fillStyle = BOARD_BACKGROUND[boardTheme]
      context.fillRect(0, 0, size.width, size.height)
    } else {
      context.fillStyle = SCREEN_BACKDROP
      context.fillRect(0, 0, size.width, size.height)
      if (screen && video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        const box = containedBox(
          { left: 0, top: 0, width: size.width, height: size.height },
          { width: video.videoWidth, height: video.videoHeight },
        )
        context.drawImage(video, box.left, box.top, box.width, box.height)
      }
    }
    context.restore()
    for (const shape of layers[surface].shapes) drawAnnotationShape(context, shape)
    if (draft) drawAnnotationShape(context, draft)
    laser = liveLaser(laser, now)
    drawLaser(context, laser, now)
  }

  function eraseHere(point: AnnotationPoint) {
    const layer = layers[surface]
    const shapes = eraseAt(layer.shapes, point, ERASER_RADIUS)
    if (shapes !== layer.shapes) {
      layers[surface] = { shapes, history: layer.history }
      changed()
    }
  }

  function cancel() {
    if (erasing) {
      const layer = layers[surface]
      layers[surface] = { shapes: erasing.before, history: layer.history }
      erasing = null
      changed()
    }
    draft = null
  }

  if (options.screen) attachScreen(options.screen)
  const stream = canvas.captureStream(options.fps ?? ANNOTATION_FPS)
  render()
  const stopClock = environment.startClock(options.fps ?? ANNOTATION_FPS, render)

  function attachScreen(next: MediaStream) {
    if (closed) {
      for (const track of next.getTracks()) track.stop()
      return
    }
    if (screen === next) return
    releaseScreen()
    screen = next
    for (const track of next.getVideoTracks())
      track.addEventListener('ended', onScreenTrackEnded, { once: true })
    video.srcObject = next
    void video.play()?.catch(() => undefined)
    changed()
  }

  return {
    canvas,
    stream,
    width: size.width,
    height: size.height,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setSurface(next) {
      if (next === surface) return
      cancel()
      surface = next
      changed()
      render()
    },
    setBoardTheme(theme) {
      if (theme === boardTheme) return
      boardTheme = theme
      changed()
      render()
    },
    attachScreen,
    begin(tool, point, style) {
      if (closed) return
      cancel()
      if (tool === 'eraser') {
        erasing = { before: layers[surface].shapes, last: point }
        eraseHere(point)
        return
      }
      const id = `a${++sequence}`
      const width = strokeWidthFor(tool, style.width)
      draft =
        tool === 'pen' || tool === 'highlighter'
          ? { kind: tool, id, color: style.color, width, points: [point] }
          : { kind: tool, id, color: style.color, width, from: point, to: point }
    },
    move(point) {
      if (closed) return
      if (erasing) {
        for (const step of pointsAlong(erasing.last, point, ERASER_RADIUS / 2)) eraseHere(step)
        erasing.last = point
        return
      }
      const current = draft
      if (!current) return
      if ('points' in current) {
        if (shouldAppendPoint(current.points, point)) current.points.push(point)
      } else current.to = point
    },
    end() {
      if (erasing) {
        layers[surface] = commitErase(layers[surface], erasing.before)
        erasing = null
        changed()
        return
      }
      const finished = draft
      draft = null
      if (!finished || closed) return
      const shape: AnnotationShape =
        'points' in finished ? { ...finished, points: [...finished.points] } : { ...finished }
      if (!isMeaningfulShape(shape)) return
      layers[surface] = addShape(layers[surface], shape)
      changed()
    },
    cancel,
    addText(at, text, style) {
      if (closed) return
      const textSize = ANNOTATION_WIDTHS[style.width].text
      context.save()
      context.font = annotationFont(textSize)
      const textWidth = context.measureText(text).width
      context.restore()
      const shape: AnnotationText = {
        kind: 'text',
        id: `a${++sequence}`,
        color: style.color,
        size: textSize,
        at,
        text: text.trim(),
        textWidth,
      }
      if (!isMeaningfulShape(shape)) return
      layers[surface] = addShape(layers[surface], shape)
      changed()
    },
    pointLaser(point, color, newTrail = false) {
      if (closed) return
      if (newTrail) trail += 1
      const now = environment.now()
      laser = [...liveLaser(laser, now), { x: point.x, y: point.y, at: now, trail, color }]
    },
    undo() {
      if (closed) return
      cancel()
      const next = undoLayer(layers[surface])
      if (next === layers[surface]) return
      layers[surface] = next
      changed()
    },
    clear() {
      if (closed) return
      cancel()
      const next = clearLayer(layers[surface])
      if (next === layers[surface]) return
      layers[surface] = next
      changed()
    },
    render,
    close() {
      if (closed) return
      closed = true
      stopClock()
      releaseScreen()
      for (const track of stream.getTracks()) track.stop()
      draft = null
      erasing = null
      laser = []
      listeners.clear()
    },
  }
}
