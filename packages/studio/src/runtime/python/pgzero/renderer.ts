import { STUDIO_SNAPSHOT_LIMITS } from '../../snapshotImage'
import type { StudioRuntimeImage } from '../../types'
import { createPgzeroInputQueue, readPgzeroKey } from './inputQueue'
import { PGZERO_KEY_MODS } from './keyCodes.generated'
import { createPgzeroFramePacer } from './pacing'
import {
  PGZERO_DEFAULT_FONT_ATTACHMENT,
  PGZERO_FONT_ATTACHMENT_BASE,
  PGZERO_LIMITS,
  PGZERO_LIST_ATTACHMENT,
  PGZERO_OP,
  PGZERO_OP_ARITY,
  type PgzeroAudioCommand,
  type PgzeroTextStyle,
  readPgzeroFrameHeader,
} from './protocol'

/** A loaded image: pixels (PNG, GIF, JPG, BMP) or a vector drawing (SVG) at its module size. */
interface Sprite {
  source: CanvasImageSource
  width: number
  height: number
  vector: boolean
  close(): void
}

/** A reply with bytes: the pixels of a vector image, sent as a transferable buffer. */
export interface PgzeroBinaryReply {
  text: string
  bytes: Uint8Array<ArrayBuffer>
}

export interface PgzeroRenderer {
  exchange(
    raw: string,
    attachments: { id: number; bytes: Uint8Array<ArrayBuffer> }[],
  ): Promise<string | PgzeroBinaryReply>
  capture(): Promise<StudioRuntimeImage | null>
  dispose(): void
}

/** ptext constants (Pygame Zero 1.2.1). */
const DEFAULT_FONT_SIZE = 24
const OUTLINE_UNIT = 1 / 24
const SHADOW_UNIT = 1 / 18
const DEFAULT_FAMILY = 'SZPgzeroFreeSansBold'
const TEXT_CACHE_LIMIT = 400
const TEXT_CACHE_PIXELS = 24 * 1024 * 1024

interface TextSurface {
  canvas: OffscreenCanvas | HTMLCanvasElement
  width: number
  height: number
  /** Size before rotation (ptext's _unrotated_size), for anchor maths. */
  unrotated: readonly [number, number]
  /**
   * Where the drawn part starts in the unrotated text. A text bigger than a canvas can be is
   * drawn only around its anchor (the part that can reach the screen); it keeps its full size
   * for anchoring, like the pygame surface.
   */
  offset: readonly [number, number]
  /** Size of the drawn part before rotation. */
  part: readonly [number, number]
}

const css = (color: readonly number[] | undefined, fallback: string, alpha = true) =>
  color
    ? `rgba(${color[0]},${color[1]},${color[2]},${alpha ? (color[3] ?? 255) / 255 : 1})`
    : fallback

/**
 * Canvas renderer for Pygame Zero. One instance per execution frame; never exposes learner
 * values to the DOM except as painted pixels and canvas text.
 */
export function createPgzeroRenderer(
  container: HTMLElement,
  options: {
    /** `watch`: Python waits for sounds to end, so the host should report them. */
    onAudio?(commands: readonly PgzeroAudioCommand[], watch: boolean): void
    /** At most `limit` sounds that ended since the previous frame (their voice ids). */
    takeEndedVoices?(limit: number): number[]
    onTitle?(title: string): void
  } = {},
): PgzeroRenderer {
  const images = new Map<number, Sprite>()
  const families = new Map<number, string>()
  const fontFaces: FontFace[] = []
  const strings = new Map<number, string>()
  const styles = new Map<number, PgzeroTextStyle>()
  const textCache = new Map<string, TextSurface>()
  let textCachePixels = 0
  let imagePixels = 0
  const input = createPgzeroInputQueue()
  const pacer = createPgzeroFramePacer()
  const listeners = new AbortController()
  let canvas: HTMLCanvasElement | undefined
  let context: CanvasRenderingContext2D | undefined
  let width = 0
  let height = 0
  let scale = 1
  let lastList: Float64Array = new Float64Array()
  let frameSequence = 0
  let raf: number | undefined
  let pendingPaint: { resolve(): void; reject(error: Error): void } | undefined
  let disposed = false
  let busy = false
  let capturing = false
  let defaultFontReady = false
  let lastMouse: [number, number] | undefined
  const measureCanvas = new OffscreenCanvas(1, 1)
  const measure = measureCanvas.getContext('2d')!

  function active() {
    if (disposed) throw new Error('A execução do Pygame Zero foi encerrada.')
  }
  function ensureCanvas() {
    active()
    if (context) return context
    canvas = document.createElement('canvas')
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'Jogo Pygame Zero. Clique para usar o teclado.')
    canvas.style.cssText =
      'display:block;max-width:100%;max-height:100%;object-fit:contain;touch-action:none;outline:none;background:#000'
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('Canvas 2D não está disponível neste navegador.')
    context = ctx
    container.append(canvas)
    installInput(canvas)
    canvas.focus({ preventScroll: true })
    return ctx
  }

  function resize(w: number, h: number) {
    const ctx = ensureCanvas()
    if (w === width && h === height) return ctx
    width = w
    height = h
    scale = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1))
    canvas!.width = Math.round(w * scale)
    canvas!.height = Math.round(h * scale)
    canvas!.style.aspectRatio = `${w} / ${h}`
    canvas!.style.width = `${w}px`
    return ctx
  }

  // Input ------------------------------------------------------------------------------------
  function modifiers(event: KeyboardEvent | MouseEvent) {
    let mod = 0
    if (event.shiftKey) mod |= PGZERO_KEY_MODS.shift
    if (event.ctrlKey) mod |= PGZERO_KEY_MODS.ctrl
    if (event.altKey) mod |= PGZERO_KEY_MODS.alt
    if (event.metaKey) mod |= PGZERO_KEY_MODS.meta
    if ('getModifierState' in event && event.getModifierState('CapsLock'))
      mod |= PGZERO_KEY_MODS.caps
    return mod
  }
  function position(event: PointerEvent | MouseEvent): [number, number] | undefined {
    if (!canvas || !width) return
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    // object-fit: contain may letterbox the logical screen inside the element.
    const fit = Math.min(bounds.width / width, bounds.height / height)
    const left = bounds.left + (bounds.width - width * fit) / 2
    const top = bounds.top + (bounds.height - height * fit) / 2
    return [Math.floor((event.clientX - left) / fit), Math.floor((event.clientY - top) / fit)]
  }
  function buttonsMask(event: PointerEvent | MouseEvent) {
    // pygame: (left, middle, right); DOM: left=1, right=2, middle=4.
    return (event.buttons & 1 ? 1 : 0) | (event.buttons & 4 ? 2 : 0) | (event.buttons & 2 ? 4 : 0)
  }
  function installInput(element: HTMLCanvasElement) {
    const settings = { signal: listeners.signal }
    const target = element.ownerDocument.defaultView ?? globalThis
    target.addEventListener(
      'keydown',
      (event) => {
        if (disposed) return
        const key = event as KeyboardEvent
        const read = readPgzeroKey(key)
        if (read.key === undefined) return
        if (read.preventDefault) key.preventDefault()
        input.keyDown(
          key.code,
          read.key,
          modifiers(key),
          key.key.length === 1 ? key.key : key.key === 'Enter' ? '\r' : '',
          key.repeat,
        )
      },
      settings,
    )
    target.addEventListener(
      'keyup',
      (event) => {
        if (disposed) return
        const key = event as KeyboardEvent
        input.keyUp(key.code, modifiers(key))
      },
      settings,
    )
    // SDL reports a key-up for every held key when the window loses focus; a button whose
    // release happens outside the page is released too.
    const release = () => {
      if (disposed) return
      input.releaseKeys()
      input.releaseButtons(...(lastMouse ?? [0, 0]))
    }
    target.addEventListener('blur', release, settings)
    element.ownerDocument.addEventListener(
      'visibilitychange',
      () => {
        if (element.ownerDocument.visibilityState === 'hidden') release()
      },
      settings,
    )
    element.addEventListener(
      'pointerdown',
      (event) => {
        const pos = position(event)
        if (!pos || event.button > 2) return
        element.focus({ preventScroll: true })
        element.setPointerCapture?.(event.pointerId)
        lastMouse = pos
        if (!disposed) input.syncButtons(pos[0], pos[1], buttonsMask(event))
        event.preventDefault()
      },
      settings,
    )
    element.addEventListener(
      'pointerup',
      (event) => {
        const pos = position(event)
        if (!pos || disposed) return
        input.syncButtons(pos[0], pos[1], buttonsMask(event))
      },
      settings,
    )
    // The browser took the pointer (a touch became a scroll, capture lost): its release would
    // never arrive, so nothing stays held. After a normal release there is nothing left to do.
    for (const type of ['pointercancel', 'lostpointercapture'] as const)
      element.addEventListener(
        type,
        (event) => {
          if (disposed) return
          const pos = position(event) ?? lastMouse ?? [0, 0]
          input.releaseButtons(pos[0], pos[1])
        },
        settings,
      )
    element.addEventListener(
      'pointermove',
      (event) => {
        const pos = position(event)
        if (!pos || disposed) return
        const previous = lastMouse ?? pos
        lastMouse = pos
        // A second button pressed or released arrives here, not as pointerdown/pointerup.
        input.syncButtons(pos[0], pos[1], buttonsMask(event))
        input.motion(pos[0], pos[1], pos[0] - previous[0], pos[1] - previous[1], buttonsMask(event))
      },
      settings,
    )
    element.addEventListener(
      'wheel',
      (event) => {
        const pos = position(event)
        if (!pos || !event.deltaY) return
        if (!disposed) input.wheel(pos[0], pos[1], event.deltaY < 0 ? 4 : 5)
        event.preventDefault()
      },
      { ...settings, passive: false },
    )
    element.addEventListener('contextmenu', (event) => event.preventDefault(), settings)
  }

  // Text (ptext) -----------------------------------------------------------------------------
  function fontFor(style: PgzeroTextStyle, size: number) {
    const family = style.font ? (families.get(style.font) ?? DEFAULT_FAMILY) : DEFAULT_FAMILY
    return `${style.italic ? 'italic ' : ''}${style.bold ? 'bold ' : ''}${size}px "${family}", sans-serif`
  }
  function metrics(style: PgzeroTextStyle, size: number) {
    measure.font = fontFor(style, size)
    const sample = measure.measureText('Hg')
    const ascent = sample.fontBoundingBoxAscent || size * 0.8
    const descent = sample.fontBoundingBoxDescent || size * 0.2
    const height = Math.ceil(ascent + descent)
    return { ascent, height, linesize: height }
  }
  const textWidth = (line: string) => Math.ceil(measure.measureText(line).width)
  /** ptext.wrap with canvas measurement. */
  function wrap(value: string, style: PgzeroTextStyle, size: number, width?: number) {
    measure.font = fontFor(style, size)
    const strip = style.strip ?? true
    const lines: string[] = []
    for (let line of value.replaceAll('\t', '    ').split('\n')) {
      if (strip) line = line.replace(/ +$/, '')
      if (width === undefined) {
        lines.push(line)
        continue
      }
      if (!line) {
        lines.push('')
        continue
      }
      let a = line.length - line.replace(/^ +/, '').length
      a = line.indexOf(' ', a) >= 0 ? line.indexOf(' ', a) : line.length
      let current = line.slice(0, a)
      let rest = line
      while (a + 1 < rest.length) {
        let b: number
        if (rest.indexOf(' ', a + 1) < 0) b = rest.length
        else if (strip) {
          b = rest.indexOf(' ', a + 1)
          while (rest[b - 1] === ' ') {
            const next = rest.indexOf(' ', b + 1)
            if (next >= 0) b = next
            else {
              b = rest.length
              break
            }
          }
        } else b = rest[a] === ' ' ? a + 1 : rest.indexOf(' ', a + 1)
        const candidate = rest.slice(0, b)
        if (textWidth(candidate) <= width) {
          a = b
          current = candidate
        } else {
          lines.push(current)
          rest = strip ? rest.slice(a).replace(/^ +/, '') : rest.slice(a)
          a = rest.indexOf(' ', 1) >= 0 ? rest.indexOf(' ', 1) : rest.length
          current = rest.slice(0, a)
        }
      }
      if (rest) lines.push(current)
    }
    return lines
  }
  function fitSize(value: string, style: PgzeroTextStyle, width: number, height: number) {
    const fits = (size: number) => {
      const lines = wrap(value, style, size, width)
      const { height: lineHeight, linesize } = metrics(style, size)
      measure.font = fontFor(style, size)
      const w = Math.max(0, ...lines.map(textWidth))
      const h = Math.round((lines.length - 1) * linesize * (style.lineheight ?? 1)) + lineHeight
      return w <= width && h <= height
    }
    let a = 1
    let b = 256
    if (!fits(a)) return a
    if (fits(b)) return b
    while (b - a > 1) {
      const c = Math.floor((a + b) / 2)
      if (fits(c)) a = c
      else b = c
    }
    return a
  }
  function makeCanvas(w: number, h: number) {
    w = Math.max(1, Math.ceil(w))
    h = Math.max(1, Math.ceil(h))
    // textSurface never asks for more; this is the last guard of the page's memory.
    if (
      w > PGZERO_LIMITS.textWidth ||
      h > PGZERO_LIMITS.textWidth ||
      w * h > PGZERO_LIMITS.textPixels
    )
      throw new Error(
        'O texto ficou grande demais para desenhar. Use letras menores ou menos texto.',
      )
    const surface = new OffscreenCanvas(w, h)
    const ctx = surface.getContext('2d')
    if (!ctx) throw new Error('Não há memória para desenhar este texto.')
    return { surface, ctx }
  }
  /**
   * The text image ptext.getsurf would produce. `anchor` (0..1 on each axis) says which part to
   * keep when the text is bigger than a canvas can be: the part around the anchor point.
   */
  function textSurface(
    key: string,
    value: string,
    style: PgzeroTextStyle,
    anchor: readonly [number, number],
  ): TextSurface {
    const cached = textCache.get(key)
    if (cached) {
      textCache.delete(key)
      textCache.set(key, cached)
      return cached
    }
    const size =
      style.fit !== undefined && style.width !== undefined
        ? fitSize(value, style, style.width, style.fit)
        : Math.round(style.fontsize ?? DEFAULT_FONT_SIZE)
    const wrapWidth =
      style.widthem !== undefined
        ? style.widthem * size
        : style.width !== undefined
          ? style.width
          : undefined
    const lines = wrap(value, style, size, wrapWidth)
    const { ascent, height: lineHeight, linesize } = metrics(style, size)
    measure.font = fontFor(style, size)
    const widths = lines.map(textWidth)
    const w0 = Math.max(1, ...widths)
    const step = linesize * (style.lineheight ?? 1)
    const ys = lines.map((_, index) => Math.round(index * step))
    const h0 = (ys.at(-1) ?? 0) + lineHeight
    const align = style.align ?? 0
    // Python checked the outline and shadow for the letter size it asked for; textbox picks its
    // own (up to 256), so here they are held at the limit instead of failing a valid program.
    const outline =
      style.owidth !== undefined
        ? Math.min(PGZERO_LIMITS.outlinePixels, Math.ceil(style.owidth * size * OUTLINE_UNIT))
        : undefined
    const shadow = style.shadow?.map((part) => {
      const pixels = Math.ceil(part * size * SHADOW_UNIT)
      return Math.max(-PGZERO_LIMITS.shadowPixels, Math.min(PGZERO_LIMITS.shadowPixels, pixels))
    })
    const pad = outline ?? 0
    const sx = shadow?.[0] ?? 0
    const sy = shadow?.[1] ?? 0
    const w = Math.max(1, Math.ceil(w0 + 2 * pad + Math.abs(sx)))
    const h = Math.max(1, Math.ceil(h0 + 2 * pad + Math.abs(sy)))
    const alpha = style.alpha ?? 1
    const angle = (((style.angle ?? 0) % 360) + 360) % 360
    // A canvas has a size limit (a very long line can be wider): only the part around the
    // anchor is drawn. A turned part must still fit once turned.
    const turned = alpha < 1 || angle !== 0
    const side = turned ? Math.floor(PGZERO_LIMITS.textWidth / Math.SQRT2) : PGZERO_LIMITS.textWidth
    const pixels = turned ? PGZERO_LIMITS.textPixels / 2 : PGZERO_LIMITS.textPixels
    const pw = Math.min(w, side)
    const ph = Math.min(h, side, Math.max(1, Math.floor(pixels / pw)))
    const ox = Math.round(anchor[0] * (w - pw))
    const oy = Math.round(anchor[1] * (h - ph))
    const { surface, ctx } = makeCanvas(pw, ph)
    if (style.background) {
      ctx.fillStyle = css(style.background, 'transparent')
      ctx.fillRect(0, 0, pw, ph)
    }
    ctx.translate(-ox, -oy)
    ctx.font = fontFor(style, size)
    ctx.textBaseline = 'alphabetic'
    const paintLines = (fill: string | CanvasGradient, dx: number, dy: number) => {
      ctx.fillStyle = fill
      lines.forEach((line, index) => {
        const x = Math.round(align * (w0 - widths[index]!)) + dx
        const y = ys[index]! + ascent + dy
        ctx.fillText(line, x, y)
        if (style.underline)
          ctx.fillRect(x, y + Math.max(1, size / 14), widths[index]!, Math.max(1, size / 14))
      })
    }
    const base = { x: pad + Math.max(-sx, 0), y: pad + Math.max(-sy, 0) }
    if (shadow) paintLines(css(style.scolor, 'black'), base.x + sx, base.y + sy)
    if (outline) {
      const color = css(style.ocolor, 'black')
      // ptext stamps the outline colour around a circle of radius opx.
      for (let dx = -outline; dx <= outline; dx++)
        for (let dy = -outline; dy <= outline; dy++)
          if (dx * dx + dy * dy <= outline * outline + outline)
            paintLines(color, base.x + dx, base.y + dy)
    }
    let fill: string | CanvasGradient = css(style.color, 'white')
    if (style.gcolor) {
      const gradient = ctx.createLinearGradient(0, base.y, 0, base.y + ascent)
      gradient.addColorStop(0, css(style.color, 'white'))
      gradient.addColorStop(1, css(style.gcolor, 'white'))
      fill = gradient
    }
    paintLines(fill, base.x, base.y)
    const unrotated = [w, h] as const
    const offset = [ox, oy] as const
    const part = [pw, ph] as const
    let result: TextSurface = { canvas: surface, width: pw, height: ph, unrotated, offset, part }
    if (turned) {
      const radians = (angle * Math.PI) / 180
      const rw = Math.ceil(Math.abs(pw * Math.cos(radians)) + Math.abs(ph * Math.sin(radians)))
      const rh = Math.ceil(Math.abs(pw * Math.sin(radians)) + Math.abs(ph * Math.cos(radians)))
      const rotated = makeCanvas(rw, rh)
      rotated.ctx.globalAlpha = Math.max(0, alpha)
      rotated.ctx.translate(rw / 2, rh / 2)
      rotated.ctx.rotate(-radians)
      rotated.ctx.drawImage(surface, -pw / 2, -ph / 2)
      result = { canvas: rotated.surface, width: rw, height: rh, unrotated, offset, part }
    }
    textCache.set(key, result)
    textCachePixels += result.width * result.height
    while (textCache.size > TEXT_CACHE_LIMIT || textCachePixels > TEXT_CACHE_PIXELS) {
      const oldest = textCache.keys().next().value!
      const removed = textCache.get(oldest)!
      textCachePixels -= removed.width * removed.height
      textCache.delete(oldest)
    }
    return result
  }
  function drawText(ctx: CanvasRenderingContext2D, record: Float64Array, at: number) {
    const value = strings.get(record[at]!)
    const style = styles.get(record[at + 1]!)
    if (value === undefined || !style) throw new Error('Texto do Pygame Zero ausente.')
    let x = record[at + 2]!
    let y = record[at + 3]!
    const hanchor = record[at + 4]!
    const vanchor = record[at + 5]!
    // The ids name a text and a style until their tables are renewed (the cache is cleared then).
    // The anchor only matters to a text too big to draw whole, but it decides the part drawn.
    const key = `${record[at]}:${record[at + 1]}:${hanchor}:${vanchor}`
    const surface = textSurface(key, value, style, [hanchor, vanchor])
    const [w0, h0] = surface.unrotated
    const [ox, oy] = surface.offset
    const [pw, ph] = surface.part
    const angle = (((style.angle ?? 0) % 360) + 360) % 360
    if (angle) {
      const radians = (angle * Math.PI) / 180
      const s = Math.sin(radians)
      const c = Math.cos(radians)
      // From the anchor to the centre of the drawn part, in the unrotated text, then turned.
      const dx = (0.5 - hanchor) * w0 + ox + pw / 2 - w0 / 2
      const dy = (0.5 - vanchor) * h0 + oy + ph / 2 - h0 / 2
      x += dx * c + dy * s - 0.5 * surface.width
      y += -dx * s + dy * c - 0.5 * surface.height
    } else {
      x += ox - hanchor * w0
      y += oy - vanchor * h0
    }
    ctx.drawImage(surface.canvas, Math.round(x), Math.round(y))
  }

  // Painting ---------------------------------------------------------------------------------
  function paint(list: Float64Array) {
    const ctx = context
    if (!ctx || disposed) return
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, width, height)
    let at = 0
    while (at < list.length) {
      const op = list[at++]!
      const arity = PGZERO_OP_ARITY[op]
      if (arity === undefined || at + arity > list.length)
        throw new Error('Lista de desenho do Pygame Zero inválida.')
      const r = list
      switch (op) {
        case PGZERO_OP.FILL:
          ctx.fillStyle = `rgb(${r[at]},${r[at + 1]},${r[at + 2]})`
          ctx.fillRect(0, 0, width, height)
          break
        case PGZERO_OP.BLIT: {
          const image = images.get(r[at]!)
          if (!image) break
          // Pixels stay sharp like pygame; a vector drawing is drawn as a vector.
          ctx.imageSmoothingEnabled = image.vector
          ctx.drawImage(image.source, r[at + 1]!, r[at + 2]!, image.width, image.height)
          ctx.imageSmoothingEnabled = false
          break
        }
        case PGZERO_OP.BLIT_ROT: {
          const image = images.get(r[at]!)
          if (!image) break
          ctx.save()
          ctx.translate(r[at + 1]! + r[at + 3]! / 2, r[at + 2]! + r[at + 4]! / 2)
          ctx.rotate((-r[at + 5]! * Math.PI) / 180)
          // pygame-ce's transform.rotate does not filter: pixel art keeps its pixels.
          ctx.imageSmoothingEnabled = image.vector
          ctx.drawImage(
            image.source,
            -image.width / 2,
            -image.height / 2,
            image.width,
            image.height,
          )
          ctx.restore()
          break
        }
        case PGZERO_OP.LINE:
          ctx.strokeStyle = `rgb(${r[at + 4]},${r[at + 5]},${r[at + 6]})`
          ctx.lineWidth = Math.max(1, r[at + 8]!)
          ctx.lineCap = 'square'
          ctx.beginPath()
          ctx.moveTo(r[at]! + 0.5, r[at + 1]! + 0.5)
          ctx.lineTo(r[at + 2]! + 0.5, r[at + 3]! + 0.5)
          ctx.stroke()
          break
        case PGZERO_OP.RECT: {
          const [x, y, w, h] = [r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!]
          const color = `rgb(${r[at + 4]},${r[at + 5]},${r[at + 6]})`
          if (r[at + 8] === 0) {
            ctx.fillStyle = color
            ctx.fillRect(x, y, w, h)
          } else {
            ctx.strokeStyle = color
            ctx.lineWidth = 1
            ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, w - 1), Math.max(0, h - 1))
          }
          break
        }
        case PGZERO_OP.CIRCLE: {
          const radius = Math.max(0, r[at + 2]!)
          const color = `rgb(${r[at + 3]},${r[at + 4]},${r[at + 5]})`
          ctx.beginPath()
          if (r[at + 7] === 0) {
            ctx.fillStyle = color
            ctx.arc(r[at]! + 0.5, r[at + 1]! + 0.5, radius, 0, Math.PI * 2)
            ctx.fill()
          } else {
            ctx.strokeStyle = color
            ctx.lineWidth = 1
            ctx.arc(r[at]! + 0.5, r[at + 1]! + 0.5, Math.max(0, radius - 0.5), 0, Math.PI * 2)
            ctx.stroke()
          }
          break
        }
        case PGZERO_OP.TEXT:
          drawText(ctx, r, at)
          break
      }
      at += arity
    }
    frameSequence++
  }
  /**
   * Waits for the next game frame on the display (60 per second, like Pygame Zero's
   * clock.tick(60), whatever the display's refresh rate) and paints when the frame changed.
   */
  function nextFrame(repaint: boolean) {
    return new Promise<void>((resolve, reject) => {
      pendingPaint = { resolve, reject }
      const tick = (now: number) => {
        if (!pacer.ready(now)) {
          raf = requestAnimationFrame(tick)
          return
        }
        raf = undefined
        pendingPaint = undefined
        try {
          if (repaint) paint(lastList)
          resolve()
        } catch (error) {
          reject(error as Error)
        }
      }
      raf = requestAnimationFrame(tick)
    })
  }

  // Resources --------------------------------------------------------------------------------
  async function decodeVector(bytes: Uint8Array<ArrayBuffer>, filePath: string) {
    // CSP: img-src blob:. The element keeps the drawing as a vector for every later draw.
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/svg+xml' }))
    const element = new Image()
    element.decoding = 'async'
    element.src = url
    try {
      await element.decode()
    } catch {
      URL.revokeObjectURL(url)
      throw new Error(`Não consegui abrir o desenho ${filePath}.`)
    }
    return { source: element as CanvasImageSource, close: () => URL.revokeObjectURL(url) }
  }
  async function decodeImage(
    id: number,
    bytes: Uint8Array<ArrayBuffer>,
    filePath: string,
    w: number,
    h: number,
  ) {
    if (bytes.byteLength > PGZERO_LIMITS.imageBytes)
      throw new Error(`A imagem ${filePath} é grande demais.`)
    if (imagePixels + w * h > PGZERO_LIMITS.totalImagePixels)
      throw new Error('As imagens do jogo passaram do limite de tamanho.')
    if (/\.svg$/i.test(filePath)) {
      const vector = await decodeVector(bytes, filePath)
      if (disposed) {
        vector.close()
        active()
      }
      imagePixels += w * h
      images.get(id)?.close()
      images.set(id, { ...vector, width: w, height: h, vector: true })
      return
    }
    const type = /\.png$/i.test(filePath)
      ? 'image/png'
      : /\.gif$/i.test(filePath)
        ? 'image/gif'
        : /\.bmp$/i.test(filePath)
          ? 'image/bmp'
          : 'image/jpeg'
    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(new Blob([bytes], { type }), {
        premultiplyAlpha: 'default',
        colorSpaceConversion: 'none',
        // pygame ignores EXIF rotation; the size must match what the module read.
        imageOrientation: 'none',
      })
    } catch {
      throw new Error(`Não consegui abrir a imagem ${filePath}.`)
    }
    if (bitmap.width !== w || bitmap.height !== h) {
      bitmap.close()
      throw new Error(`A imagem ${filePath} não tem o tamanho que o jogo leu.`)
    }
    if (disposed) {
      bitmap.close()
      active()
    }
    imagePixels += w * h
    images.get(id)?.close()
    images.set(id, {
      source: bitmap,
      width: w,
      height: h,
      vector: false,
      close: () => bitmap.close(),
    })
  }
  /** RGBA of a vector image at its own size, in one transferable buffer. */
  function vectorPixels(id: number) {
    const image = images.get(id)
    if (!image?.vector) throw new Error('Só os desenhos SVG têm os pixels lidos assim.')
    const surface = new OffscreenCanvas(image.width, image.height)
    const ctx = surface.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Não consegui ler os pixels do desenho.')
    ctx.drawImage(image.source, 0, 0, image.width, image.height)
    const data = ctx.getImageData(0, 0, image.width, image.height).data
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength) as Uint8Array<ArrayBuffer>
  }
  async function loadFont(id: number, bytes: Uint8Array<ArrayBuffer>) {
    if (bytes.byteLength > PGZERO_LIMITS.fontBytes) throw new Error('A fonte é grande demais.')
    const family = id === 0 ? DEFAULT_FAMILY : `SZPgzeroFont${id}`
    const face = new FontFace(family, bytes)
    try {
      await face.load()
    } catch {
      throw new Error('Não consegui abrir a fonte do jogo.')
    }
    if (disposed) return
    ;(container.ownerDocument.fonts as FontFaceSet).add(face)
    fontFaces.push(face)
    if (id !== 0) families.set(id, family)
    textCache.clear()
    textCachePixels = 0
  }

  return {
    async exchange(raw, attachments) {
      active()
      if (busy) throw new Error('Um quadro do Pygame Zero já está em andamento.')
      busy = true
      try {
        const header = readPgzeroFrameHeader(raw)
        const supplied = new Map<number, Uint8Array<ArrayBuffer>>()
        for (const attachment of attachments) {
          if (supplied.has(attachment.id)) throw new Error('Anexo do Pygame Zero repetido.')
          supplied.set(attachment.id, attachment.bytes)
        }
        const defaultFont = supplied.get(PGZERO_DEFAULT_FONT_ATTACHMENT)
        if (defaultFont && !defaultFontReady) {
          await loadFont(0, defaultFont)
          defaultFontReady = true
        }
        for (const [id, filePath, w, h] of header.images) {
          const bytes = supplied.get(id)
          if (!bytes) throw new Error(`Faltou a imagem ${filePath}.`)
          await decodeImage(id, bytes, filePath, w, h)
        }
        if (header.decode !== undefined) return { text: '{}', bytes: vectorPixels(header.decode) }
        for (const [id] of header.fonts) {
          const bytes = supplied.get(PGZERO_FONT_ATTACHMENT_BASE + id)
          if (!bytes) throw new Error('Faltou uma fonte do jogo.')
          await loadFont(id, bytes)
        }
        let renewed = false
        for (const [id, value] of header.strings) {
          if (id === 0) {
            strings.clear()
            renewed = true
          } else strings.set(id, value)
        }
        for (const [id, style] of header.styles) {
          if (id === 0) {
            styles.clear()
            renewed = true
          } else if (style) styles.set(id, style)
        }
        if (renewed) {
          textCache.clear()
          textCachePixels = 0
        }
        if (header.audio.length || header.watch) options.onAudio?.(header.audio, header.watch)
        options.onTitle?.(header.title)
        const resized = header.w !== width || header.h !== height
        resize(header.w, header.h)
        if (!header.keep) {
          const list = supplied.get(PGZERO_LIST_ATTACHMENT)
          if (!list || list.byteLength % 8 || list.byteLength > PGZERO_LIMITS.listBytes)
            throw new Error('Lista de desenho do Pygame Zero inválida.')
          lastList = new Float64Array(list.buffer, list.byteOffset, list.byteLength / 8)
        }
        // Always wait for the display: this is the game's frame clock (about 60 per second).
        await nextFrame(!header.keep || resized || !frameSequence)
        active()
        const ended = options.takeEndedVoices?.(PGZERO_LIMITS.endedVoices) ?? []
        return JSON.stringify({
          events: input.take(),
          now: performance.now(),
          ...(ended.length ? { ended } : {}),
        })
      } catch (error) {
        // The program stops with a Python traceback, not with a silent failure of the page.
        if (disposed) throw error
        return JSON.stringify({
          error:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : 'O navegador não conseguiu mostrar o quadro.',
        })
      } finally {
        busy = false
      }
    },
    async capture() {
      active()
      if (capturing || !canvas || !frameSequence) return null
      const ratio = Math.min(
        1,
        STUDIO_SNAPSHOT_LIMITS.width / canvas.width,
        STUDIO_SNAPSHOT_LIMITS.height / canvas.height,
      )
      const image = document.createElement('canvas')
      image.width = Math.max(1, Math.round(canvas.width * ratio))
      image.height = Math.max(1, Math.round(canvas.height * ratio))
      const ctx = image.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(canvas, 0, 0, image.width, image.height)
      const capturedSequence = frameSequence
      capturing = true
      try {
        const blob = await new Promise<Blob | null>((resolve) => image.toBlob(resolve, 'image/png'))
        active()
        if (!blob || blob.size > Math.floor(((STUDIO_SNAPSHOT_LIMITS.dataUrlChars - 22) * 3) / 4))
          return null
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () =>
            typeof reader.result === 'string'
              ? resolve(reader.result)
              : reject(new Error('Não foi possível ler a captura.'))
          reader.onerror = () =>
            reject(reader.error ?? new Error('Não foi possível ler a captura.'))
          reader.readAsDataURL(blob)
        })
        active()
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
    dispose() {
      if (disposed) return
      disposed = true
      listeners.abort()
      if (raf !== undefined) cancelAnimationFrame(raf)
      raf = undefined
      pendingPaint?.reject(new Error('A execução do Pygame Zero foi encerrada.'))
      pendingPaint = undefined
      for (const image of images.values()) image.close()
      images.clear()
      for (const face of fontFaces) (container.ownerDocument.fonts as FontFaceSet).delete(face)
      fontFaces.length = 0
      textCache.clear()
      input.clear()
      canvas?.remove()
      canvas = undefined
      context = undefined
    },
  }
}
