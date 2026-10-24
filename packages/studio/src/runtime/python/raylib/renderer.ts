import { STUDIO_SNAPSHOT_LIMITS } from '../../snapshotImage'
import type { StudioRuntimeImage } from '../../types'
import { createPgzeroFramePacer } from '../pgzero/pacing'
import type { PgzeroAudioCommand } from '../pgzero/protocol'
import { DEFAULT_FONT_RECS, DEFAULT_FONT_WORDS } from './defaultFont.generated'
import {
  findGlyphIndex,
  fontVMetrics,
  glyphBitmap,
  initFont,
  scaleForPixelHeight,
} from './fontRaster'
import {
  RAYLIB_FONT_ATTACHMENT_BASE,
  RAYLIB_LIMITS,
  RAYLIB_OP,
  RAYLIB_OP_ARITY,
  RAYLIB_PAYLOAD_ATTACHMENT,
  type RaylibFrameHeader,
  type RaylibInputEvent,
  readRaylibFrameHeader,
  readRaylibKey,
} from './protocol'
import { createRaylib3D, type Raylib3D } from './renderer3d'

const DEFAULT_TEXTURE = 1
const DEFAULT_FONT_TEXTURE = 2
const MAX_VERTICES = 65_536
const DEG2RAD = Math.PI / 180
const SMOOTH_CIRCLE_ERROR_RATE = 0.5
const SPLINE_SEGMENT_DIVISIONS = 24

export interface RaylibRenderer {
  exchange(
    raw: string,
    attachments: { id: number; bytes: Uint8Array<ArrayBuffer> }[],
  ): Promise<string>
  capture(): Promise<StudioRuntimeImage | null>
  dispose(): void
}

interface Texture {
  texture: WebGLTexture
  width: number
  height: number
  framebuffer?: WebGLFramebuffer
  depth?: WebGLRenderbuffer
  pixels: number
}
interface Glyph {
  sx: number
  sy: number
  sw: number
  sh: number
  ox: number
  oy: number
}
interface FontAtlas {
  base: number
  glyphs: Map<number, Glyph>
  width: number
  height: number
}

/** 4×4 column-major matrices (the layout of raylib's Matrix m0..m15). */
type Mat4 = Float32Array
const identity = (): Mat4 => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
/** raymath MatrixMultiply(left, right): applies left first, then right. */
export function multiply(left: Mat4, right: Mat4): Mat4 {
  const out = new Float32Array(16)
  for (let row = 0; row < 4; row++)
    for (let col = 0; col < 4; col++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += left[row * 4 + k]! * right[k * 4 + col]!
      out[row * 4 + col] = sum
    }
  return out
}
export function translate(x: number, y: number, z: number): Mat4 {
  const m = identity()
  m[12] = x
  m[13] = y
  m[14] = z
  return m
}
export function rotate(axisX: number, axisY: number, axisZ: number, angle: number): Mat4 {
  let x = axisX
  let y = axisY
  let z = axisZ
  const length = x * x + y * y + z * z
  if (length !== 1 && length !== 0) {
    const inverse = 1 / Math.sqrt(length)
    x *= inverse
    y *= inverse
    z *= inverse
  }
  const s = Math.sin(angle)
  const c = Math.cos(angle)
  const t = 1 - c
  return new Float32Array([
    x * x * t + c,
    y * x * t + z * s,
    z * x * t - y * s,
    0,
    x * y * t - z * s,
    y * y * t + c,
    z * y * t + x * s,
    0,
    x * z * t + y * s,
    y * z * t - x * s,
    z * z * t + c,
    0,
    0,
    0,
    0,
    1,
  ])
}
export function scale(x: number, y: number, z: number): Mat4 {
  const m = identity()
  m[0] = x
  m[5] = y
  m[10] = z
  return m
}
export function ortho(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Mat4 {
  const rl = right - left
  const tb = top - bottom
  const fn = far - near
  return new Float32Array([
    2 / rl,
    0,
    0,
    0,
    0,
    2 / tb,
    0,
    0,
    0,
    0,
    -2 / fn,
    0,
    -(left + right) / rl,
    -(top + bottom) / tb,
    -(far + near) / fn,
    1,
  ])
}
/** GetCameraMatrix2D: origin, then scale × rotation, then offset. */
function cameraMatrix2D(ox: number, oy: number, tx: number, ty: number, r: number, zoom: number) {
  return multiply(
    multiply(translate(-tx, -ty, 0), multiply(scale(zoom, zoom, 1), rotate(0, 0, 1, r * DEG2RAD))),
    translate(ox, oy, 0),
  )
}

const VERTEX_2D = `#version 300 es
in vec3 aPosition;
in vec2 aTexCoord;
in vec4 aColor;
uniform mat4 uMvp;
out vec2 fragTexCoord;
out vec4 fragColor;
void main() {
  fragTexCoord = aTexCoord;
  fragColor = aColor;
  gl_Position = uMvp * vec4(aPosition, 1.0);
}`
const FRAGMENT_2D = `#version 300 es
precision mediump float;
in vec2 fragTexCoord;
in vec4 fragColor;
uniform sampler2D texture0;
out vec4 finalColor;
void main() {
  finalColor = texture(texture0, fragTexCoord) * fragColor;
}`

export function compileProgram(gl: WebGL2RenderingContext, vertex: string, fragment: string) {
  const program = gl.createProgram()
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vertex],
    [gl.FRAGMENT_SHADER, fragment],
  ] as const) {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader) ?? ''
      gl.deleteShader(shader)
      throw new Error(`O shader não compilou: ${log.slice(0, 400)}`)
    }
    gl.attachShader(program, shader)
    gl.deleteShader(shader)
  }
  gl.bindAttribLocation(program, 0, 'aPosition')
  gl.bindAttribLocation(program, 1, 'aTexCoord')
  gl.bindAttribLocation(program, 2, 'aColor')
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    throw new Error(`O shader não ligou: ${(gl.getProgramInfoLog(program) ?? '').slice(0, 400)}`)
  return program
}

/**
 * WebGL2 renderer for the Raylib extensions, following raylib's rlgl: an immediate-mode batch of
 * triangles and lines, raylib's own tessellation of each shape (rshapes.c), its matrix stack, 2D
 * camera, render textures, scissor and blend modes. One instance per execution frame.
 */
export function createRaylibRenderer(
  container: HTMLElement,
  options: {
    onAudio?(commands: readonly PgzeroAudioCommand[], watch: boolean): void
    takeEndedVoices?(limit: number): number[]
    onTitle?(title: string): void
  } = {},
): RaylibRenderer {
  const listeners = new AbortController()
  const textures = new Map<number, Texture>()
  const fonts = new Map<number, FontAtlas>()
  const events: RaylibInputEvent[] = []
  let canvas: HTMLCanvasElement | undefined
  let gl: WebGL2RenderingContext | undefined
  let program: WebGLProgram | undefined
  let mvpLocation: WebGLUniformLocation | null = null
  let positionBuffer: WebGLBuffer | undefined
  let texcoordBuffer: WebGLBuffer | undefined
  let colorBuffer: WebGLBuffer | undefined
  let vao: WebGLVertexArrayObject | undefined
  const positions = new Float32Array(MAX_VERTICES * 3)
  const texcoords = new Float32Array(MAX_VERTICES * 2)
  const colors = new Uint8Array(MAX_VERTICES * 4)
  let count = 0
  let batchMode = 0
  let batchTexture = DEFAULT_TEXTURE
  let width = 0
  let height = 0
  let targetWidth = 0
  let targetHeight = 0
  let projection = identity()
  let view = identity()
  let transform = identity()
  let transformUsed = false
  const stack: Mat4[] = []
  let lastList: Float64Array = new Float64Array()
  let frameSequence = 0
  let raf: number | undefined
  let pendingPaint: { resolve(): void; reject(error: Error): void } | undefined
  let disposed = false
  let busy = false
  let capturing = false
  let pacer = createPgzeroFramePacer()
  let pacedFps = 60
  let pointerWanted = false
  let virtualX = 0
  let virtualY = 0
  let pausedTotal = 0
  let hiddenSince: number | undefined
  let three: Raylib3D | undefined
  let renderingTexture = false
  let currentPixels = 0

  function active() {
    if (disposed) throw new Error('A execução do Raylib foi encerrada.')
  }
  const now = () =>
    performance.now() - pausedTotal - (hiddenSince ? performance.now() - hiddenSince : 0)

  // Canvas and GL ----------------------------------------------------------------------------
  function ensureGl() {
    active()
    if (gl) return gl
    canvas = document.createElement('canvas')
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'img')
    canvas.setAttribute('aria-label', 'Jogo Raylib. Clique para usar o teclado.')
    canvas.style.cssText =
      'display:block;max-width:100%;max-height:100%;object-fit:contain;touch-action:none;outline:none;background:#000'
    const context = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: true,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
    })
    if (!context)
      throw new Error('Este navegador não tem WebGL2, que o Raylib precisa para desenhar.')
    gl = context
    container.append(canvas)
    installInput(canvas)
    canvas.focus({ preventScroll: true })
    program = compileProgram(gl, VERTEX_2D, FRAGMENT_2D)
    mvpLocation = gl.getUniformLocation(program, 'uMvp')
    vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions.byteLength, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0)
    texcoordBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, texcoords.byteLength, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0)
    colorBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, colors.byteLength, gl.DYNAMIC_DRAW)
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 0, 0)
    gl.bindVertexArray(null)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE)
    makeTexture(DEFAULT_TEXTURE, 1, 1, new Uint8Array([255, 255, 255, 255]))
    makeTexture(DEFAULT_FONT_TEXTURE, 128, 128, defaultFontPixels())
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault()
        failure = new Error('A placa de vídeo perdeu o desenho do jogo. Rode o jogo de novo.')
      },
      { signal: listeners.signal },
    )
    return gl
  }
  let failure: Error | undefined

  function defaultFontPixels() {
    const pixels = new Uint8Array(128 * 128 * 4)
    for (let i = 0, counter = 0; i < 128 * 128; i += 32, counter++) {
      const word = DEFAULT_FONT_WORDS[counter]!
      for (let j = 31; j >= 0; j--) {
        const k = (i + j) * 4
        pixels[k] = 255
        pixels[k + 1] = 255
        pixels[k + 2] = 255
        pixels[k + 3] = (word >>> j) & 1 ? 255 : 0
      }
    }
    return pixels
  }

  function makeTexture(
    id: number,
    w: number,
    h: number,
    pixels: Uint8Array | ImageBitmap | null,
    renderTarget = false,
  ) {
    const g = gl!
    release(id)
    const texture = g.createTexture()
    g.bindTexture(g.TEXTURE_2D, texture)
    if (pixels instanceof ImageBitmap)
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, pixels)
    else g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, w, h, 0, g.RGBA, g.UNSIGNED_BYTE, pixels)
    // raylib: TEXTURE_FILTER_POINT and TEXTURE_WRAP_REPEAT by default.
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, renderTarget ? g.CLAMP_TO_EDGE : g.REPEAT)
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, renderTarget ? g.CLAMP_TO_EDGE : g.REPEAT)
    const entry: Texture = { texture, width: w, height: h, pixels: w * h }
    if (renderTarget) {
      entry.framebuffer = g.createFramebuffer()
      entry.depth = g.createRenderbuffer()
      g.bindRenderbuffer(g.RENDERBUFFER, entry.depth)
      g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT24, w, h)
      g.bindFramebuffer(g.FRAMEBUFFER, entry.framebuffer)
      g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, texture, 0)
      g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, entry.depth)
      g.clearColor(0, 0, 0, 0)
      g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
      g.bindFramebuffer(g.FRAMEBUFFER, null)
    }
    currentPixels += entry.pixels
    if (currentPixels > RAYLIB_LIMITS.totalPixels)
      throw new Error('As imagens do jogo passaram do limite de tamanho.')
    textures.set(id, entry)
  }

  function release(id: number) {
    const entry = textures.get(id)
    if (!entry || !gl) return
    gl.deleteTexture(entry.texture)
    if (entry.framebuffer) gl.deleteFramebuffer(entry.framebuffer)
    if (entry.depth) gl.deleteRenderbuffer(entry.depth)
    currentPixels -= entry.pixels
    textures.delete(id)
    fonts.delete(id)
  }

  function resize(w: number, h: number) {
    ensureGl()
    if (w === width && h === height) return false
    width = w
    height = h
    canvas!.width = w
    canvas!.height = h
    canvas!.style.aspectRatio = `${w} / ${h}`
    canvas!.style.width = `${w}px`
    return true
  }

  // Input --------------------------------------------------------------------------------------
  function push(event: RaylibInputEvent) {
    if (events.length >= RAYLIB_LIMITS.events) {
      // Movements are the first to go; a key press or release is never lost.
      const index = events.findIndex((item) => item[0] === 'mm')
      if (index < 0) return
      events.splice(index, 1)
    }
    events.push(event)
  }
  function position(event: PointerEvent | MouseEvent | WheelEvent): [number, number] | undefined {
    if (!canvas || !width) return
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const fit = Math.min(bounds.width / width, bounds.height / height)
    const left = bounds.left + (bounds.width - width * fit) / 2
    const top = bounds.top + (bounds.height - height * fit) / 2
    return [(event.clientX - left) / fit, (event.clientY - top) / fit]
  }
  function unit() {
    if (!canvas || !width) return 1
    const bounds = canvas.getBoundingClientRect()
    return bounds.width ? width / Math.min(bounds.width, (bounds.height * width) / height) : 1
  }
  const button = (domButton: number) => (domButton === 2 ? 1 : domButton === 1 ? 2 : domButton)
  const locked = () => !!canvas && canvas.ownerDocument.pointerLockElement === canvas

  function installInput(element: HTMLCanvasElement) {
    const settings = { signal: listeners.signal }
    const doc = element.ownerDocument
    const target = doc.defaultView ?? globalThis
    target.addEventListener(
      'keydown',
      (event) => {
        if (disposed) return
        const key = event as KeyboardEvent
        const read = readRaylibKey(key)
        if (read.preventDefault) key.preventDefault()
        if (read.key !== undefined) push(['kd', read.key])
        if (key.key.length === 1 && !key.ctrlKey && !key.metaKey) {
          const codepoint = key.key.codePointAt(0)
          if (codepoint !== undefined) push(['ch', codepoint])
        }
      },
      settings,
    )
    target.addEventListener(
      'keyup',
      (event) => {
        if (disposed) return
        const read = readRaylibKey(event as KeyboardEvent)
        if (read.key !== undefined) push(['ku', read.key])
      },
      settings,
    )
    target.addEventListener('blur', () => !disposed && push(['blur']), settings)
    target.addEventListener('focus', () => !disposed && push(['focus']), settings)
    doc.addEventListener(
      'visibilitychange',
      () => {
        if (doc.visibilityState === 'hidden') {
          hiddenSince ??= performance.now()
          push(['blur'])
        } else if (hiddenSince !== undefined) {
          pausedTotal += performance.now() - hiddenSince
          hiddenSince = undefined
        }
      },
      settings,
    )
    element.addEventListener(
      'pointerdown',
      (event) => {
        element.focus({ preventScroll: true })
        if (pointerWanted && !locked()) {
          // The browser only grants the lock from a click; without it the mouse still steers.
          const request = element.requestPointerLock?.() as Promise<void> | undefined
          request?.catch?.(() => {})
        }
        const pos = locked() ? [virtualX, virtualY] : position(event)
        if (!pos || event.button > 2) return
        if (!locked()) {
          virtualX = pos[0]!
          virtualY = pos[1]!
          element.setPointerCapture?.(event.pointerId)
        }
        push(['md', button(event.button), pos[0]!, pos[1]!])
        event.preventDefault()
      },
      settings,
    )
    element.addEventListener(
      'pointerup',
      (event) => {
        const pos = locked() ? [virtualX, virtualY] : position(event)
        if (!pos || event.button > 2) return
        push(['mu', button(event.button), pos[0]!, pos[1]!])
      },
      settings,
    )
    for (const type of ['pointercancel', 'lostpointercapture'] as const)
      element.addEventListener(
        type,
        () => {
          if (!locked()) push(['mu', 0, virtualX, virtualY])
        },
        settings,
      )
    const move = (event: PointerEvent | MouseEvent) => {
      if (locked()) {
        const step = unit()
        const dx = event.movementX * step
        const dy = event.movementY * step
        virtualX += dx
        virtualY += dy
        push(['mm', virtualX, virtualY, dx, dy])
        return
      }
      const pos = position(event)
      if (!pos) return
      const dx = pos[0] - virtualX
      const dy = pos[1] - virtualY
      virtualX = pos[0]
      virtualY = pos[1]
      push(['mm', pos[0], pos[1], dx, dy])
    }
    element.addEventListener('pointermove', move, settings)
    doc.addEventListener('mousemove', (event) => locked() && move(event), settings)
    element.addEventListener('pointerleave', () => !locked() && push(['leave']), settings)
    element.addEventListener(
      'wheel',
      (event) => {
        if (!event.deltaY) return
        push(['mw', event.deltaY < 0 ? 1 : -1])
        event.preventDefault()
      },
      { ...settings, passive: false },
    )
    element.addEventListener('contextmenu', (event) => event.preventDefault(), settings)
  }

  function applyCursor(header: RaylibFrameHeader) {
    pointerWanted = header.cursor[0]
    canvas!.style.cursor = header.cursor[1] ? 'none' : ''
    if (!pointerWanted && locked()) canvas!.ownerDocument.exitPointerLock()
  }

  // Batch (rlgl) ------------------------------------------------------------------------------
  function flush() {
    if (!count || !gl) return
    const g = gl
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook.
    g.useProgram(program!)
    g.uniformMatrix4fv(mvpLocation, false, multiply(view, projection))
    g.bindVertexArray(vao!)
    g.bindBuffer(g.ARRAY_BUFFER, positionBuffer!)
    g.bufferSubData(g.ARRAY_BUFFER, 0, positions, 0, count * 3)
    g.bindBuffer(g.ARRAY_BUFFER, texcoordBuffer!)
    g.bufferSubData(g.ARRAY_BUFFER, 0, texcoords, 0, count * 2)
    g.bindBuffer(g.ARRAY_BUFFER, colorBuffer!)
    g.bufferSubData(g.ARRAY_BUFFER, 0, colors, 0, count * 4)
    g.activeTexture(g.TEXTURE0)
    g.bindTexture(
      g.TEXTURE_2D,
      (textures.get(batchTexture) ?? textures.get(DEFAULT_TEXTURE)!).texture,
    )
    g.drawArrays(batchMode === 1 ? g.LINES : g.TRIANGLES, 0, count)
    g.bindVertexArray(null)
    count = 0
  }
  function begin(mode: 0 | 1, texture = DEFAULT_TEXTURE, vertices = 6) {
    if (mode !== batchMode || texture !== batchTexture || count + vertices > MAX_VERTICES) {
      flush()
      batchMode = mode
      batchTexture = texture
    }
  }
  function vertex(x: number, y: number, u: number, v: number, color: number, z = 0) {
    let px = x
    let py = y
    let pz = z
    if (transformUsed) {
      const m = transform
      px = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!
      py = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!
      pz = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!
    }
    const p = count * 3
    positions[p] = px
    positions[p + 1] = py
    positions[p + 2] = pz
    const t = count * 2
    texcoords[t] = u
    texcoords[t + 1] = v
    const c = count * 4
    colors[c] = (color >>> 24) & 255
    colors[c + 1] = (color >>> 16) & 255
    colors[c + 2] = (color >>> 8) & 255
    colors[c + 3] = color & 255
    count++
  }
  /** One flat-coloured triangle (raylib's shapes texture is the white pixel). */
  function triangle(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    c: number,
  ) {
    begin(0, DEFAULT_TEXTURE, 3)
    vertex(ax, ay, 0, 0, c)
    vertex(bx, by, 0, 0, c)
    vertex(cx, cy, 0, 0, c)
  }
  /** A quad of rlBegin(RL_QUADS): the triangles (a, b, c) and (a, c, d). */
  function quad(
    ax: number,
    ay: number,
    bx: number,
    by: number,
    cx: number,
    cy: number,
    dx: number,
    dy: number,
    c: number,
  ) {
    triangle(ax, ay, bx, by, cx, cy, c)
    triangle(ax, ay, cx, cy, dx, dy, c)
  }
  function line(ax: number, ay: number, bx: number, by: number, c: number) {
    begin(1, DEFAULT_TEXTURE, 2)
    vertex(ax, ay, 0, 0, c)
    vertex(bx, by, 0, 0, c)
  }
  const cosd = (angle: number) => Math.cos(DEG2RAD * angle)
  const sind = (angle: number) => Math.sin(DEG2RAD * angle)

  function arcSegments(radius: number, start: number, end: number, segments: number) {
    const minimum = Math.ceil((end - start) / 90)
    if (segments >= minimum) return segments
    const th = Math.acos(2 * (1 - SMOOTH_CIRCLE_ERROR_RATE / radius) ** 2 - 1)
    const value = Math.ceil(((end - start) * ((2 * Math.PI) / th)) / 360)
    return value <= 0 || !Number.isFinite(value) ? minimum : value
  }

  // Shapes (rshapes.c) ----------------------------------------------------------------------
  function circleSector(
    x: number,
    y: number,
    radius: number,
    start: number,
    end: number,
    segs: number,
    c: number,
  ) {
    if (start === end) return
    const r = radius <= 0 ? 0.1 : radius
    let a = start
    let b = end
    if (b < a) [a, b] = [b, a]
    const segments = arcSegments(r, a, b, segs)
    const step = (b - a) / segments
    let angle = a
    for (let i = 0; i < segments; i++) {
      triangle(
        x,
        y,
        x + cosd(angle + step) * r,
        y + sind(angle + step) * r,
        x + cosd(angle) * r,
        y + sind(angle) * r,
        c,
      )
      angle += step
    }
  }
  function circleSectorLines(
    x: number,
    y: number,
    radius: number,
    start: number,
    end: number,
    segs: number,
    c: number,
  ) {
    if (start === end) return
    const r = radius <= 0 ? 0.1 : radius
    let a = start
    let b = end
    if (b < a) [a, b] = [b, a]
    const segments = arcSegments(r, a, b, segs)
    const step = (b - a) / segments
    let angle = a
    line(x, y, x + cosd(angle) * r, y + sind(angle) * r, c)
    for (let i = 0; i < segments; i++) {
      line(
        x + cosd(angle) * r,
        y + sind(angle) * r,
        x + cosd(angle + step) * r,
        y + sind(angle + step) * r,
        c,
      )
      angle += step
    }
    line(x, y, x + cosd(angle) * r, y + sind(angle) * r, c)
  }
  function ring(
    x: number,
    y: number,
    inner: number,
    outer: number,
    start: number,
    end: number,
    segs: number,
    c: number,
    lines: boolean,
  ) {
    if (start === end) return
    let ri = inner
    let ro = outer
    if (ro < ri) {
      ;[ri, ro] = [ro, ri]
      if (ro <= 0) ro = 0.1
    }
    let a = start
    let b = end
    if (b < a) [a, b] = [b, a]
    const segments = arcSegments(ro, a, b, segs)
    if (ri <= 0) {
      if (lines) circleSectorLines(x, y, ro, a, b, segments, c)
      else circleSector(x, y, ro, a, b, segments, c)
      return
    }
    const step = (b - a) / segments
    let angle = a
    if (lines)
      line(
        x + cosd(angle) * ro,
        y + sind(angle) * ro,
        x + cosd(angle) * ri,
        y + sind(angle) * ri,
        c,
      )
    for (let i = 0; i < segments; i++) {
      const o1x = x + cosd(angle) * ro
      const o1y = y + sind(angle) * ro
      const o2x = x + cosd(angle + step) * ro
      const o2y = y + sind(angle + step) * ro
      const i1x = x + cosd(angle) * ri
      const i1y = y + sind(angle) * ri
      const i2x = x + cosd(angle + step) * ri
      const i2y = y + sind(angle + step) * ri
      if (lines) {
        line(o1x, o1y, o2x, o2y, c)
        line(i1x, i1y, i2x, i2y, c)
      } else quad(o1x, o1y, i1x, i1y, i2x, i2y, o2x, o2y, c)
      angle += step
    }
    if (lines)
      line(
        x + cosd(angle) * ro,
        y + sind(angle) * ro,
        x + cosd(angle) * ri,
        y + sind(angle) * ri,
        c,
      )
  }
  function rectanglePro(
    x: number,
    y: number,
    w: number,
    h: number,
    ox: number,
    oy: number,
    rotation: number,
    c: number,
  ) {
    let tlx: number,
      tly: number,
      trx: number,
      try_: number,
      blx: number,
      bly: number,
      brx: number,
      bry: number
    if (rotation === 0) {
      const px = x - ox
      const py = y - oy
      tlx = px
      tly = py
      trx = px + w
      try_ = py
      blx = px
      bly = py + h
      brx = px + w
      bry = py + h
    } else {
      const s = Math.sin(rotation * DEG2RAD)
      const co = Math.cos(rotation * DEG2RAD)
      const dx = -ox
      const dy = -oy
      tlx = x + dx * co - dy * s
      tly = y + dx * s + dy * co
      trx = x + (dx + w) * co - dy * s
      try_ = y + (dx + w) * s + dy * co
      blx = x + dx * co - (dy + h) * s
      bly = y + dx * s + (dy + h) * co
      brx = x + (dx + w) * co - (dy + h) * s
      bry = y + (dx + w) * s + (dy + h) * co
    }
    quad(tlx, tly, blx, bly, brx, bry, trx, try_, c)
  }
  function rectangleLinesEx(x: number, y: number, w: number, h: number, thick: number, c: number) {
    let t = thick
    if (t > w || t > h) {
      if (w >= h) t = h / 2
      else if (w <= h) t = w / 2
    }
    rectanglePro(x, y, w, t, 0, 0, 0, c)
    rectanglePro(x, y - t + h, w, t, 0, 0, 0, c)
    rectanglePro(x, y + t, t, h - t * 2, 0, 0, 0, c)
    rectanglePro(x - t + w, y + t, t, h - t * 2, 0, 0, 0, c)
  }
  function rounded(
    x: number,
    y: number,
    w: number,
    h: number,
    roundness: number,
    segs: number,
    c: number,
  ) {
    if (roundness <= 0) {
      rectanglePro(x, y, w, h, 0, 0, 0, c)
      return
    }
    const r = (w > h ? h * Math.min(roundness, 1) : w * Math.min(roundness, 1)) / 2
    if (r <= 0) return
    let segments = segs
    if (segments < 4) {
      const th = Math.acos(2 * (1 - SMOOTH_CIRCLE_ERROR_RATE / r) ** 2 - 1)
      segments = Math.ceil((2 * Math.PI) / th / 4)
      if (segments <= 0) segments = 4
    }
    const step = 90 / segments
    const p = [
      [x + r, y],
      [x + w - r, y],
      [x + w, y + r],
      [x + w, y + h - r],
      [x + w - r, y + h],
      [x + r, y + h],
      [x, y + h - r],
      [x, y + r],
      [x + r, y + r],
      [x + w - r, y + r],
      [x + w - r, y + h - r],
      [x + r, y + h - r],
    ] as const
    const centers = [p[8], p[9], p[10], p[11]]
    const angles = [180, 270, 0, 90]
    for (let k = 0; k < 4; k++) {
      let angle = angles[k]!
      const [cx, cy] = centers[k]!
      for (let i = 0; i < segments; i++) {
        triangle(
          cx,
          cy,
          cx + cosd(angle + step) * r,
          cy + sind(angle + step) * r,
          cx + cosd(angle) * r,
          cy + sind(angle) * r,
          c,
        )
        angle += step
      }
    }
    const q = (a: number, b: number, d: number, e: number) =>
      quad(p[a]![0], p[a]![1], p[b]![0], p[b]![1], p[d]![0], p[d]![1], p[e]![0], p[e]![1], c)
    q(0, 8, 9, 1)
    q(2, 9, 10, 3)
    q(11, 5, 4, 10)
    q(7, 6, 11, 8)
    q(8, 11, 10, 9)
  }
  function roundedLines(
    x: number,
    y: number,
    w: number,
    h: number,
    roundness: number,
    segs: number,
    thick: number,
    c: number,
  ) {
    const t = thick < 0 ? 0 : thick
    if (roundness <= 0) {
      rectangleLinesEx(x - t, y - t, w + 2 * t, h + 2 * t, t, c)
      return
    }
    const r = (w > h ? h * Math.min(roundness, 1) : w * Math.min(roundness, 1)) / 2
    if (r <= 0) return
    let segments = segs
    if (segments < 4) {
      const th = Math.acos(2 * (1 - SMOOTH_CIRCLE_ERROR_RATE / r) ** 2 - 1)
      segments = Math.ceil((2 * Math.PI) / th / 4)
      if (segments <= 0) segments = 4
    }
    const step = 90 / segments
    const outer = r + t
    const inner = r
    const p = [
      [x + inner + 0.5, y - t + 0.5],
      [x + w - inner - 0.5, y - t + 0.5],
      [x + w + t - 0.5, y + inner + 0.5],
      [x + w + t - 0.5, y + h - inner - 0.5],
      [x + w - inner - 0.5, y + h + t - 0.5],
      [x + inner + 0.5, y + h + t - 0.5],
      [x - t + 0.5, y + h - inner - 0.5],
      [x - t + 0.5, y + inner + 0.5],
      [x + inner + 0.5, y + 0.5],
      [x + w - inner - 0.5, y + 0.5],
      [x + w - 0.5, y + inner + 0.5],
      [x + w - 0.5, y + h - inner - 0.5],
      [x + w - inner - 0.5, y + h - 0.5],
      [x + inner + 0.5, y + h - 0.5],
      [x + 0.5, y + h - inner - 0.5],
      [x + 0.5, y + inner + 0.5],
    ] as const
    const centers = [
      [x + inner + 0.5, y + inner + 0.5],
      [x + w - inner - 0.5, y + inner + 0.5],
      [x + w - inner - 0.5, y + h - inner - 0.5],
      [x + inner + 0.5, y + h - inner - 0.5],
    ] as const
    const angles = [180, 270, 0, 90]
    if (t > 1) {
      for (let k = 0; k < 4; k++) {
        let angle = angles[k]!
        const [cx, cy] = centers[k]!
        for (let i = 0; i < segments; i++) {
          const i1x = cx + cosd(angle) * inner
          const i1y = cy + sind(angle) * inner
          const i2x = cx + cosd(angle + step) * inner
          const i2y = cy + sind(angle + step) * inner
          const o1x = cx + cosd(angle) * outer
          const o1y = cy + sind(angle) * outer
          const o2x = cx + cosd(angle + step) * outer
          const o2y = cy + sind(angle + step) * outer
          triangle(i1x, i1y, i2x, i2y, o1x, o1y, c)
          triangle(i2x, i2y, o2x, o2y, o1x, o1y, c)
          angle += step
        }
      }
      const tri = (a: number, b: number, d: number) =>
        triangle(p[a]![0], p[a]![1], p[b]![0], p[b]![1], p[d]![0], p[d]![1], c)
      tri(0, 8, 9)
      tri(1, 0, 9)
      tri(10, 11, 3)
      tri(2, 10, 3)
      tri(13, 5, 4)
      tri(12, 13, 4)
      tri(7, 6, 14)
      tri(15, 7, 14)
    } else {
      for (let k = 0; k < 4; k++) {
        let angle = angles[k]!
        const [cx, cy] = centers[k]!
        for (let i = 0; i < segments; i++) {
          line(
            cx + cosd(angle) * outer,
            cy + sind(angle) * outer,
            cx + cosd(angle + step) * outer,
            cy + sind(angle + step) * outer,
            c,
          )
          angle += step
        }
      }
      for (let i = 0; i < 8; i += 2) line(p[i]![0], p[i]![1], p[i + 1]![0], p[i + 1]![1], c)
    }
  }
  function lineEx(ax: number, ay: number, bx: number, by: number, thick: number, c: number) {
    const dx = bx - ax
    const dy = by - ay
    const length = Math.sqrt(dx * dx + dy * dy)
    if (length <= 0 || thick <= 0) return
    const s = thick / (2 * length)
    const rx = -s * dy
    const ry = s * dx
    // DrawTriangleStrip of 4 points: (2,0,1) and (3,2,1).
    const p0 = [ax - rx, ay - ry]
    const p1 = [ax + rx, ay + ry]
    const p2 = [bx - rx, by - ry]
    const p3 = [bx + rx, by + ry]
    triangle(p2[0]!, p2[1]!, p0[0]!, p0[1]!, p1[0]!, p1[1]!, c)
    triangle(p3[0]!, p3[1]!, p2[0]!, p2[1]!, p1[0]!, p1[1]!, c)
  }
  function lineBezier(ax: number, ay: number, bx: number, by: number, thick: number, c: number) {
    const ease = (t: number, b: number, change: number, d: number) => {
      let time = t / (0.5 * d)
      if (time < 1) return 0.5 * change * time * time * time + b
      time -= 2
      return 0.5 * change * (time * time * time + 2) + b
    }
    const points: [number, number][] = new Array(2 * SPLINE_SEGMENT_DIVISIONS + 2)
    let px = ax
    let py = ay
    for (let i = 1; i <= SPLINE_SEGMENT_DIVISIONS; i++) {
      const cy = ease(i, ay, by - ay, SPLINE_SEGMENT_DIVISIONS)
      const cx = px + (bx - ax) / SPLINE_SEGMENT_DIVISIONS
      const dy = cy - py
      const dx = cx - px
      const size = (0.5 * thick) / Math.sqrt(dx * dx + dy * dy)
      if (i === 1) {
        points[0] = [px + dy * size, py - dx * size]
        points[1] = [px - dy * size, py + dx * size]
      }
      points[2 * i + 1] = [cx - dy * size, cy + dx * size]
      points[2 * i] = [cx + dy * size, cy - dx * size]
      px = cx
      py = cy
    }
    for (let i = 2; i < points.length; i++) {
      const a = points[i]!
      const b = i % 2 === 0 ? points[i - 2]! : points[i - 1]!
      const d = i % 2 === 0 ? points[i - 1]! : points[i - 2]!
      triangle(a[0], a[1], b[0], b[1], d[0], d[1], c)
    }
  }
  function poly(
    x: number,
    y: number,
    sides: number,
    radius: number,
    rotation: number,
    c: number,
    mode: 0 | 1 | 2,
    thick = 0,
  ) {
    const n = sides < 3 ? 3 : sides
    let angle = rotation * DEG2RAD
    const step = (360 / n) * DEG2RAD
    const inner = radius - thick * Math.cos((DEG2RAD * step) / 2)
    for (let i = 0; i < n; i++) {
      const next = angle + step
      if (mode === 0)
        triangle(
          x,
          y,
          x + Math.cos(next) * radius,
          y + Math.sin(next) * radius,
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
          c,
        )
      else if (mode === 1)
        line(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
          x + Math.cos(next) * radius,
          y + Math.sin(next) * radius,
          c,
        )
      else
        quad(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius,
          x + Math.cos(angle) * inner,
          y + Math.sin(angle) * inner,
          x + Math.cos(next) * inner,
          y + Math.sin(next) * inner,
          x + Math.cos(next) * radius,
          y + Math.sin(next) * radius,
          c,
        )
      angle = next
    }
  }

  // Textures (rtextures.c DrawTexturePro) ---------------------------------------------------
  function texturePro(
    id: number,
    sourceX: number,
    sourceY: number,
    sourceW: number,
    sourceH: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    ox: number,
    oy: number,
    rotation: number,
    tint: number,
  ) {
    const entry = textures.get(id)
    if (!entry || id <= 0) return
    const w = entry.width
    const h = entry.height
    const sx = sourceX
    let sy = sourceY
    let sw = sourceW
    const sh = sourceH
    let flipX = false
    if (sw < 0) {
      flipX = true
      sw *= -1
    }
    if (sh < 0) sy -= sh
    const destW = Math.abs(dw)
    const destH = Math.abs(dh)
    let tlx: number,
      tly: number,
      trx: number,
      try_: number,
      blx: number,
      bly: number,
      brx: number,
      bry: number
    if (rotation === 0) {
      const x = dx - ox
      const y = dy - oy
      tlx = x
      tly = y
      trx = x + destW
      try_ = y
      blx = x
      bly = y + destH
      brx = x + destW
      bry = y + destH
    } else {
      const s = Math.sin(rotation * DEG2RAD)
      const co = Math.cos(rotation * DEG2RAD)
      const ddx = -ox
      const ddy = -oy
      tlx = dx + ddx * co - ddy * s
      tly = dy + ddx * s + ddy * co
      trx = dx + (ddx + destW) * co - ddy * s
      try_ = dy + (ddx + destW) * s + ddy * co
      blx = dx + ddx * co - (ddy + destH) * s
      bly = dy + ddx * s + (ddy + destH) * co
      brx = dx + (ddx + destW) * co - (ddy + destH) * s
      bry = dy + (ddx + destW) * s + (ddy + destH) * co
    }
    const u0 = (flipX ? sx + sw : sx) / w
    const u1 = (flipX ? sx : sx + sw) / w
    const v0 = sy / h
    const v1 = (sy + sh) / h
    begin(0, id, 6)
    vertex(tlx, tly, u0, v0, tint)
    vertex(blx, bly, u0, v1, tint)
    vertex(brx, bry, u1, v1, tint)
    vertex(tlx, tly, u0, v0, tint)
    vertex(brx, bry, u1, v1, tint)
    vertex(trx, try_, u1, v0, tint)
  }

  function text(list: Float64Array, at: number) {
    const fontId = list[at]!
    const size = list[at + 1]!
    const tint = list[at + 2]!
    const glyphs = list[at + 3]!
    const isDefault = fontId === DEFAULT_FONT_TEXTURE
    const atlas = fonts.get(fontId)
    const base = isDefault ? 10 : (atlas?.base ?? 10)
    const factor = size / base
    for (let i = 0; i < glyphs; i++) {
      const k = at + 4 + i * 3
      const codepoint = list[k]!
      const x = list[k + 1]!
      const y = list[k + 2]!
      if (isDefault) {
        const rec = DEFAULT_FONT_RECS[codepoint - 32] ?? DEFAULT_FONT_RECS[63 - 32]!
        texturePro(
          DEFAULT_FONT_TEXTURE,
          rec[0],
          rec[1],
          rec[2],
          rec[3],
          x,
          y,
          rec[2] * factor,
          rec[3] * factor,
          0,
          0,
          0,
          tint,
        )
      } else if (atlas) {
        const glyph = atlas.glyphs.get(codepoint) ?? atlas.glyphs.get(63)
        if (!glyph?.sw) continue
        texturePro(
          fontId,
          glyph.sx,
          glyph.sy,
          glyph.sw,
          glyph.sh,
          x + glyph.ox * factor,
          y + glyph.oy * factor,
          glyph.sw * factor,
          glyph.sh * factor,
          0,
          0,
          0,
          tint,
        )
      }
    }
  }

  function npatch(list: Float64Array, at: number) {
    const [
      id,
      ,
      ,
      sx,
      sy,
      sw,
      sh,
      left,
      top,
      right,
      bottom,
      layout,
      dx,
      dy,
      dw,
      dh,
      ox,
      oy,
      rotation,
      tint,
    ] = Array.from(list.subarray(at, at + 20))
    const entry = textures.get(id!)
    if (!entry) return
    // Simplified n-patch: the nine parts drawn as textured quads (layout 0, NPATCH_NINE_PATCH).
    const w = dw! < 0 ? 0 : dw!
    const h = dh! < 0 ? 0 : dh!
    const l = Math.min(left!, w / 2)
    const r = Math.min(right!, w / 2)
    const t = Math.min(top!, h / 2)
    const b = Math.min(bottom!, h / 2)
    const xs = [0, l, w - r, w]
    const ys = [0, t, h - b, h]
    const us = [sx!, sx! + left!, sx! + sw! - right!, sx! + sw!]
    const vs = [sy!, sy! + top!, sy! + sh! - bottom!, sy! + sh!]
    const saved = transform
    const savedUsed = transformUsed
    transform = multiply(
      multiply(translate(-ox!, -oy!, 0), rotate(0, 0, 1, rotation! * DEG2RAD)),
      multiply(translate(dx!, dy!, 0), transform),
    )
    transformUsed = true
    const rows = layout === 1 ? [0] : [0, 1, 2]
    for (const row of layout === 2 ? [0, 1, 2] : rows)
      for (const col of layout === 1 ? [0, 1, 2] : layout === 2 ? [0] : [0, 1, 2]) {
        const x0 = xs[col]!
        const x1 = layout === 2 ? w : xs[col + 1]!
        const y0 = ys[row]!
        const y1 = layout === 1 ? h : ys[row + 1]!
        if (x1 <= x0 || y1 <= y0) continue
        texturePro(
          id!,
          us[col]!,
          vs[row]!,
          us[col + 1]! - us[col]!,
          vs[row + 1]! - vs[row]!,
          x0,
          y0,
          x1 - x0,
          y1 - y0,
          0,
          0,
          0,
          tint!,
        )
      }
    flush()
    transform = saved
    transformUsed = savedUsed
  }

  // Modes ---------------------------------------------------------------------------------------
  function setBlend(mode: number) {
    const g = gl!
    flush()
    g.enable(g.BLEND)
    g.blendEquation(g.FUNC_ADD)
    switch (mode) {
      case 1:
        g.blendFunc(g.SRC_ALPHA, g.ONE)
        break
      case 2:
        g.blendFunc(g.DST_COLOR, g.ONE_MINUS_SRC_ALPHA)
        break
      case 3:
        g.blendFunc(g.ONE, g.ONE)
        break
      case 4:
        g.blendFunc(g.ONE, g.ONE)
        g.blendEquation(g.FUNC_SUBTRACT)
        break
      case 5:
        g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA)
        break
      default:
        g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA)
    }
  }
  function setTarget(id: number) {
    const g = gl!
    flush()
    const entry = id ? textures.get(id) : undefined
    if (entry?.framebuffer) {
      g.bindFramebuffer(g.FRAMEBUFFER, entry.framebuffer)
      targetWidth = entry.width
      targetHeight = entry.height
      renderingTexture = true
    } else {
      g.bindFramebuffer(g.FRAMEBUFFER, null)
      targetWidth = width
      targetHeight = height
      renderingTexture = false
    }
    g.viewport(0, 0, targetWidth, targetHeight)
    projection = ortho(0, targetWidth, targetHeight, 0, 0, 1)
    view = identity()
    transform = identity()
    transformUsed = false
    stack.length = 0
  }

  /** Paints one display list, from a clean rlgl state (like a fresh BeginDrawing). */
  function paint(list: Float64Array) {
    const g = ensureGl()
    count = 0
    setTarget(0)
    g.disable(g.DEPTH_TEST)
    // rlglInit: back faces culled, counter-clockwise front. A clockwise draw_triangle is
    // invisible on the desktop raylib, so it has to be invisible here too.
    g.enable(g.CULL_FACE)
    g.cullFace(g.BACK)
    g.frontFace(g.CCW)
    g.disable(g.SCISSOR_TEST)
    setBlend(0)
    let at = 0
    const n = list.length
    while (at < n) {
      const op = list[at++]!
      if (op === RAYLIB_OP.TEXT) {
        text(list, at)
        at += 4 + list[at + 3]! * 3
        continue
      }
      if (op >= 60) {
        three ??= createRaylib3D(g, { flush, textures: (id) => textures.get(id)?.texture })
        at = three.op(op, list, at, {
          setProjection(matrix) {
            flush()
            projection = matrix
          },
          setView(matrix) {
            flush()
            view = matrix
          },
          restore2D() {
            flush()
            projection = ortho(0, targetWidth, targetHeight, 0, 0, 1)
            view = identity()
          },
          size: () => [targetWidth, targetHeight],
          vertex,
          begin,
        })
        continue
      }
      const arity = RAYLIB_OP_ARITY[op]
      if (arity === undefined || at + arity > n)
        throw new Error('Lista de desenho do Raylib inválida.')
      const r = list
      switch (op) {
        case RAYLIB_OP.CLEAR: {
          flush()
          const c = r[at]!
          g.clearColor(
            ((c >>> 24) & 255) / 255,
            ((c >>> 16) & 255) / 255,
            ((c >>> 8) & 255) / 255,
            (c & 255) / 255,
          )
          g.clear(g.COLOR_BUFFER_BIT | g.DEPTH_BUFFER_BIT)
          break
        }
        case RAYLIB_OP.RECT_PRO:
          rectanglePro(
            r[at]!,
            r[at + 1]!,
            r[at + 2]!,
            r[at + 3]!,
            r[at + 4]!,
            r[at + 5]!,
            r[at + 6]!,
            r[at + 7]!,
          )
          break
        case RAYLIB_OP.RECT_GRADIENT: {
          const [x, y, w, h, tl, bl, br, tr] = Array.from(r.subarray(at, at + 8)) as number[]
          begin(0, DEFAULT_TEXTURE, 6)
          vertex(x!, y!, 0, 0, tl!)
          vertex(x!, y! + h!, 0, 0, bl!)
          vertex(x! + w!, y! + h!, 0, 0, br!)
          vertex(x!, y!, 0, 0, tl!)
          vertex(x! + w!, y! + h!, 0, 0, br!)
          vertex(x! + w!, y!, 0, 0, tr!)
          break
        }
        case RAYLIB_OP.RECT_LINES: {
          const [x, y, w, h, c] = Array.from(r.subarray(at, at + 5)) as number[]
          const xo = 0.5 / transform[0]!
          const yo = 0.5 / transform[5]!
          line(x! + xo, y! + yo, x! + w! - xo, y! + yo, c!)
          line(x! + w! - xo, y! + yo, x! + w! - xo, y! + h! - yo, c!)
          line(x! + w! - xo, y! + h! - yo, x! + xo, y! + h! - yo, c!)
          line(x! + xo, y! + h! - yo, x! + xo, y! + yo, c!)
          break
        }
        case RAYLIB_OP.RECT_LINES_EX:
          rectangleLinesEx(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!)
          break
        case RAYLIB_OP.RECT_ROUNDED:
          rounded(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
          break
        case RAYLIB_OP.RECT_ROUNDED_LINES:
          roundedLines(
            r[at]!,
            r[at + 1]!,
            r[at + 2]!,
            r[at + 3]!,
            r[at + 4]!,
            r[at + 5]!,
            r[at + 6]!,
            r[at + 7]!,
          )
          break
        case RAYLIB_OP.LINE:
          line(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!)
          break
        case RAYLIB_OP.LINE_EX:
          lineEx(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!)
          break
        case RAYLIB_OP.LINE_BEZIER:
          lineBezier(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!)
          break
        case RAYLIB_OP.PIXEL: {
          const x = r[at]!
          const y = r[at + 1]!
          quad(x, y, x, y + 1, x + 1, y + 1, x + 1, y, r[at + 2]!)
          break
        }
        case RAYLIB_OP.CIRCLE_SECTOR:
          circleSector(
            r[at]!,
            r[at + 1]!,
            r[at + 2]!,
            r[at + 3]!,
            r[at + 4]!,
            r[at + 5]!,
            r[at + 6]!,
          )
          break
        case RAYLIB_OP.CIRCLE_SECTOR_LINES:
          circleSectorLines(
            r[at]!,
            r[at + 1]!,
            r[at + 2]!,
            r[at + 3]!,
            r[at + 4]!,
            r[at + 5]!,
            r[at + 6]!,
          )
          break
        case RAYLIB_OP.CIRCLE_GRADIENT: {
          const [x, y, radius, inner, outer] = Array.from(r.subarray(at, at + 5)) as number[]
          begin(0, DEFAULT_TEXTURE, 108)
          for (let i = 0; i < 360; i += 10) {
            vertex(x!, y!, 0, 0, inner!)
            vertex(x! + cosd(i + 10) * radius!, y! + sind(i + 10) * radius!, 0, 0, outer!)
            vertex(x! + cosd(i) * radius!, y! + sind(i) * radius!, 0, 0, outer!)
          }
          break
        }
        case RAYLIB_OP.CIRCLE_LINES: {
          const [x, y, radius, c] = Array.from(r.subarray(at, at + 4)) as number[]
          for (let i = 0; i < 360; i += 10)
            line(
              x! + cosd(i) * radius!,
              y! + sind(i) * radius!,
              x! + cosd(i + 10) * radius!,
              y! + sind(i + 10) * radius!,
              c!,
            )
          break
        }
        case RAYLIB_OP.ELLIPSE:
        case RAYLIB_OP.ELLIPSE_LINES: {
          const [x, y, rh, rv, c] = Array.from(r.subarray(at, at + 5)) as number[]
          for (let i = 0; i < 360; i += 10) {
            const ax = x! + cosd(i + 10) * rh!
            const ay = y! + sind(i + 10) * rv!
            const bx = x! + cosd(i) * rh!
            const by = y! + sind(i) * rv!
            if (op === RAYLIB_OP.ELLIPSE) triangle(x!, y!, ax, ay, bx, by, c!)
            else line(ax, ay, bx, by, c!)
          }
          break
        }
        case RAYLIB_OP.RING:
        case RAYLIB_OP.RING_LINES:
          ring(
            r[at]!,
            r[at + 1]!,
            r[at + 2]!,
            r[at + 3]!,
            r[at + 4]!,
            r[at + 5]!,
            r[at + 6]!,
            r[at + 7]!,
            op === RAYLIB_OP.RING_LINES,
          )
          break
        case RAYLIB_OP.TRIANGLE:
          triangle(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
          break
        case RAYLIB_OP.TRIANGLE_LINES:
          line(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 6]!)
          line(r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!, r[at + 6]!)
          line(r[at + 4]!, r[at + 5]!, r[at]!, r[at + 1]!, r[at + 6]!)
          break
        case RAYLIB_OP.POLY:
          poly(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!, 0)
          break
        case RAYLIB_OP.POLY_LINES:
          poly(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!, 1)
          break
        case RAYLIB_OP.POLY_LINES_EX:
          poly(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 6]!, 2, r[at + 5]!)
          break
        case RAYLIB_OP.TEXTURE:
          texturePro(
            r[at]!,
            r[at + 3]!,
            r[at + 4]!,
            r[at + 5]!,
            r[at + 6]!,
            r[at + 7]!,
            r[at + 8]!,
            r[at + 9]!,
            r[at + 10]!,
            r[at + 11]!,
            r[at + 12]!,
            r[at + 13]!,
            r[at + 14]!,
          )
          break
        case RAYLIB_OP.TEXTURE_NPATCH:
          npatch(r, at)
          break
        case RAYLIB_OP.BEGIN_2D:
          flush()
          view = cameraMatrix2D(r[at]!, r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at + 4]!, r[at + 5]!)
          break
        case RAYLIB_OP.END_2D:
          flush()
          view = identity()
          break
        case RAYLIB_OP.BEGIN_TEXTURE:
          setTarget(r[at]!)
          break
        case RAYLIB_OP.END_TEXTURE:
          setTarget(0)
          break
        case RAYLIB_OP.BEGIN_SCISSOR: {
          flush()
          g.enable(g.SCISSOR_TEST)
          const x = r[at]!
          const y = r[at + 1]!
          const w = r[at + 2]!
          const h = r[at + 3]!
          g.scissor(
            x,
            renderingTexture ? y : targetHeight - (y + h),
            Math.max(0, w),
            Math.max(0, h),
          )
          break
        }
        case RAYLIB_OP.END_SCISSOR:
          flush()
          g.disable(g.SCISSOR_TEST)
          break
        case RAYLIB_OP.BEGIN_BLEND:
          setBlend(r[at]!)
          break
        case RAYLIB_OP.END_BLEND:
          setBlend(0)
          break
        case RAYLIB_OP.PUSH:
          if (stack.length >= RAYLIB_LIMITS.matrixDepth)
            throw new Error(
              'rl_push_matrix: a pilha de matrizes passou de 32. Falta um rl_pop_matrix?',
            )
          stack.push(transform)
          break
        case RAYLIB_OP.POP:
          if (stack.length) transform = stack.pop()!
          transformUsed = stack.length > 0 || !isIdentity(transform)
          break
        case RAYLIB_OP.TRANSLATE:
          transform = multiply(translate(r[at]!, r[at + 1]!, r[at + 2]!), transform)
          transformUsed = true
          break
        case RAYLIB_OP.ROTATE:
          transform = multiply(
            rotate(r[at + 1]!, r[at + 2]!, r[at + 3]!, r[at]! * DEG2RAD),
            transform,
          )
          transformUsed = true
          break
        case RAYLIB_OP.SCALE:
          transform = multiply(scale(r[at]!, r[at + 1]!, r[at + 2]!), transform)
          transformUsed = true
          break
      }
      at += arity
    }
    flush()
    if (renderingTexture) setTarget(0)
    frameSequence++
  }
  const isIdentity = (m: Mat4) => m.every((value, index) => value === (index % 5 === 0 ? 1 : 0))

  // Frame clock ---------------------------------------------------------------------------------
  function nextFrame(repaint: boolean) {
    return new Promise<void>((resolve, reject) => {
      pendingPaint = { resolve, reject }
      const tick = (time: number) => {
        if (!pacer.ready(time)) {
          raf = requestAnimationFrame(tick)
          return
        }
        raf = undefined
        pendingPaint = undefined
        try {
          if (failure) throw failure
          if (repaint) paint(lastList)
          resolve()
        } catch (error) {
          reject(error as Error)
        }
      }
      raf = requestAnimationFrame(tick)
    })
  }

  // Resources -----------------------------------------------------------------------------------
  async function loadFile(id: number, bytes: Uint8Array<ArrayBuffer>, filePath: string) {
    if (bytes.byteLength > RAYLIB_LIMITS.fileBytes)
      throw new Error(`A imagem ${filePath} é grande demais.`)
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
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
        imageOrientation: 'none',
      })
    } catch {
      throw new Error(`Não consegui abrir a imagem ${filePath}.`)
    }
    try {
      active()
      makeTexture(id, bitmap.width, bitmap.height, bitmap)
    } finally {
      bitmap.close()
    }
  }

  /**
   * The atlas of a TTF/OTF font, built like raylib's LoadFontData: each glyph rasterized by
   * stb_truetype at `base` pixels (scale = base / (ascent - descent)), white with the
   * coverage in alpha, offsets `ix0` and `iy0 + (int)(ascent * scale)`.
   */
  function loadFont(
    id: number,
    bytes: Uint8Array<ArrayBuffer>,
    base: number,
    codepoints: readonly number[],
  ) {
    const font = initFont(bytes)
    if (!font) throw new Error('Não consegui abrir a fonte do jogo (use .ttf ou .otf).')
    active()
    const scale = scaleForPixelHeight(font, base)
    const baseline = Math.trunc(Math.fround(fontVMetrics(font).ascent * scale))
    const padding = 2
    const boxes = codepoints.flatMap((codepoint) => {
      const index = findGlyphIndex(font, codepoint)
      if (index <= 0) return []
      const bitmap = glyphBitmap(font, index, scale)
      return [{ codepoint, bitmap }]
    })
    const area = boxes.reduce(
      (sum, { bitmap }) =>
        sum + ((bitmap?.width ?? 0) + padding * 2) * ((bitmap?.height ?? 0) + padding * 2),
      0,
    )
    let side = 64
    while (side * side < area * 1.3 && side < 4096) side *= 2
    const pixels = new Uint8Array(side * side * 4)
    for (let i = 0; i < pixels.length; i += 4) pixels[i] = pixels[i + 1] = pixels[i + 2] = 255
    const glyphs = new Map<number, Glyph>()
    let x = padding
    let y = padding
    let rowHeight = 0
    for (const { codepoint, bitmap } of boxes) {
      if (!bitmap) {
        glyphs.set(codepoint, { sx: 0, sy: 0, sw: 0, sh: 0, ox: 0, oy: 0 })
        continue
      }
      if (x + bitmap.width + padding > side) {
        x = padding
        y += rowHeight + padding * 2
        rowHeight = 0
      }
      if (y + bitmap.height + padding > side) break
      for (let row = 0; row < bitmap.height; row++)
        for (let column = 0; column < bitmap.width; column++)
          pixels[((y + row) * side + x + column) * 4 + 3] =
            bitmap.pixels[row * bitmap.width + column]!
      glyphs.set(codepoint, {
        sx: x,
        sy: y,
        sw: bitmap.width,
        sh: bitmap.height,
        ox: bitmap.xoff,
        oy: bitmap.yoff + baseline,
      })
      x += bitmap.width + padding * 2
      rowHeight = Math.max(rowHeight, bitmap.height)
    }
    makeTexture(id, side, side, pixels)
    fonts.set(id, { base, glyphs, width: side, height: side })
  }

  async function applyResources(
    header: RaylibFrameHeader,
    supplied: Map<number, Uint8Array<ArrayBuffer>>,
    blobs: Uint8Array,
  ) {
    const g = ensureGl()
    for (const id of header.free) release(id)
    let offset = 0
    for (const entry of header.textures) {
      const [id, kind] = entry
      if (id <= DEFAULT_FONT_TEXTURE) throw new Error('Textura do Raylib inválida.')
      if (kind === 'f') {
        const bytes = supplied.get(id)
        if (!bytes) throw new Error(`Faltou a imagem ${entry[2]}.`)
        await loadFile(id, bytes, entry[2])
      } else if (kind === 'p') {
        const [, , w, h, size] = entry
        if (offset + size > blobs.byteLength) throw new Error('Faltaram os pixels de uma imagem.')
        makeTexture(id, w, h, blobs.subarray(offset, offset + size))
        offset += size
      } else if (kind === 'r') makeTexture(id, entry[2], entry[3], null, true)
      else {
        const texture = textures.get(id)
        if (!texture) continue
        g.bindTexture(g.TEXTURE_2D, texture.texture)
        if (kind === 'filter') {
          const linear = entry[2] >= 1
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, linear ? g.LINEAR : g.NEAREST)
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, linear ? g.LINEAR : g.NEAREST)
        } else {
          const mode =
            [g.REPEAT, g.CLAMP_TO_EDGE, g.MIRRORED_REPEAT, g.MIRRORED_REPEAT][entry[2]] ?? g.REPEAT
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, mode)
          g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, mode)
        }
      }
    }
    // `em` and `ascent` stay in the protocol for the Python side; the atlas is stb's own.
    for (const [id, , base, , , codepoints] of header.fonts) {
      const bytes = supplied.get(RAYLIB_FONT_ATTACHMENT_BASE + id)
      if (!bytes) throw new Error('Faltou uma fonte do jogo.')
      loadFont(id, bytes, base, codepoints)
    }
    if (header.models.length) {
      three ??= createRaylib3D(g, { flush, textures: (id) => textures.get(id)?.texture })
      three.load(header.models, supplied)
    }
  }

  return {
    async exchange(raw, attachments) {
      active()
      if (busy) throw new Error('Um quadro do Raylib já está em andamento.')
      busy = true
      try {
        const header = readRaylibFrameHeader(raw)
        const supplied = new Map<number, Uint8Array<ArrayBuffer>>()
        for (const attachment of attachments) {
          if (supplied.has(attachment.id)) throw new Error('Anexo do Raylib repetido.')
          supplied.set(attachment.id, attachment.bytes)
        }
        const payload = supplied.get(RAYLIB_PAYLOAD_ATTACHMENT) ?? new Uint8Array()
        if (header.list > payload.byteLength)
          throw new Error('Lista de desenho do Raylib inválida.')
        const resized = resize(header.w, header.h)
        applyCursor(header)
        const blobs = payload.subarray(header.list)
        await applyResources(header, supplied, blobs)
        if (header.audio.length) options.onAudio?.(header.audio, true)
        options.onTitle?.(header.title)
        const fps = header.fps > 0 ? Math.min(header.fps, 240) : 60
        if (fps !== pacedFps) {
          pacer = createPgzeroFramePacer(1000 / fps)
          pacedFps = fps
        }
        if (!header.keep) {
          const copy = payload.slice(0, header.list)
          lastList = new Float64Array(copy.buffer, 0, header.list / 8)
        }
        await nextFrame(!header.keep || resized || !frameSequence)
        active()
        const ended = options.takeEndedVoices?.(RAYLIB_LIMITS.endedVoices) ?? []
        const reply = JSON.stringify({
          events: events.splice(0, events.length),
          now: now(),
          locked: locked(),
          ...(ended.length ? { ended } : {}),
        })
        return reply
      } catch (error) {
        if (disposed) throw error
        return JSON.stringify({
          error:
            error instanceof Error
              ? error.message.slice(0, 1000)
              : 'O navegador não conseguiu mostrar o quadro do Raylib.',
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
      pendingPaint?.reject(new Error('A execução do Raylib foi encerrada.'))
      pendingPaint = undefined
      if (canvas && canvas.ownerDocument.pointerLockElement === canvas)
        canvas.ownerDocument.exitPointerLock()
      three?.dispose()
      if (gl) {
        for (const id of [...textures.keys()]) release(id)
        gl.getExtension('WEBGL_lose_context')?.loseContext()
      }
      events.length = 0
      canvas?.remove()
      canvas = undefined
      gl = undefined
    },
  }
}
