import { isToneRequest } from '../audio/tone'
/**
 * Wire contract between the Pygame Zero module running in the Python worker and the canvas
 * renderer in the execution frame. One exchange per game frame:
 *
 * request  = JSON header (new images/fonts/strings/styles, audio commands, window size)
 *            + attachments: the display list (Float64 records, id 0), new image bytes
 *            (ids 1…1024) and new font bytes (ids FONT_ATTACHMENT_BASE + n).
 * response = JSON with the input events since the previous frame, the paint timestamp and the
 *            sounds that finished (`ended`), or `{ error }` when the browser could not show
 *            the frame (Python raises it, so the program stops with a traceback).
 *
 * Pygame-ce sends its whole screen instead of a display list: one PIXELS record (width, height)
 * and the RGBA bytes of the screen as attachment PGZERO_PIXELS_ATTACHMENT. `cursor: false` hides
 * the system cursor over the canvas (pygame.mouse.set_visible / set_cursor with an image).
 *
 * A header with `decode: image` is not a frame: it asks for the RGBA pixels of a vector image
 * (`images.x.get_at` on an SVG), answered at once with the pixels as a binary attachment.
 * A header with `watch: true` asks the host to report sounds that end (music.play_once,
 * Sound.play(loops=N)).
 */
export const PGZERO_LIMITS = Object.freeze({
  headerChars: 512_000,
  listBytes: 8 * 1024 * 1024,
  images: 1024,
  imageBytes: 16 * 1024 * 1024,
  imageDimension: 4096,
  totalImagePixels: 32 * 1024 * 1024,
  fonts: 32,
  fontBytes: 4 * 1024 * 1024,
  strings: 4096,
  stringChars: 4000,
  styles: 1024,
  audioCommands: 64,
  events: 256,
  maxWidth: 1920,
  maxHeight: 1080,
  pathChars: 512,
  titleChars: 200,
  /** Image and font bytes sent with one frame; the rest follows in the next frames. */
  frameAttachmentBytes: 24 * 1024 * 1024,
  /** Text styles: bigger text would block the page while it is drawn. */
  fontSize: 512,
  outlinePixels: 32,
  shadowPixels: 64,
  lineHeight: 16,
  textWidth: 8192,
  textPixels: 16 * 1024 * 1024,
  /** Sounds that ended, reported with one reply. */
  endedVoices: 64,
  /** Sound.play(loops=N): how many extra plays one command may ask for. */
  soundRepeats: 1000,
})

export const PGZERO_LIST_ATTACHMENT = 0
export const PGZERO_FONT_ATTACHMENT_BASE = 10_000
/** The RGBA screen of a Pygame-ce frame (width × height × 4 bytes). */
export const PGZERO_PIXELS_ATTACHMENT = 20_000
/** The bundled default font (FreeSansBold, as in Pygame Zero) travels with the first frame. */
export const PGZERO_DEFAULT_FONT_ATTACHMENT = PGZERO_FONT_ATTACHMENT_BASE

export const PGZERO_OP = Object.freeze({
  FILL: 1,
  BLIT: 2,
  BLIT_ROT: 3,
  LINE: 4,
  RECT: 5,
  CIRCLE: 6,
  TEXT: 7,
  /** pygame.draw.polygon: point count, width, rgba, then the points (variable length). */
  POLY: 8,
  ELLIPSE: 9,
  ARC: 10,
  /** pygame.draw.rect with border_radius: the RECT values, then radius and the four corners. */
  ROUND_RECT: 11,
  /** pygame.draw.circle with draw_top_right...: the CIRCLE values, then the four quarters. */
  CIRCLE_PART: 12,
  /** Pygame-ce: the whole screen (width, height); its RGBA bytes are PGZERO_PIXELS_ATTACHMENT. */
  PIXELS: 13,
})
/** Points one polygon may have (kept with _sz.py MAX_POLY_POINTS). */
export const PGZERO_MAX_POLY_POINTS = 4096
/** Values that follow each opcode in the display list. */
export const PGZERO_OP_ARITY: Readonly<Record<number, number>> = Object.freeze({
  1: 4,
  2: 3,
  3: 6,
  4: 9,
  5: 9,
  6: 8,
  7: 6,
  // POLY (8) has a variable length: 6 + 2 × its point count.
  9: 9,
  10: 11,
  11: 14,
  12: 12,
  13: 2,
})

export interface PgzeroTextStyle {
  font?: number
  fontsize?: number
  bold?: boolean
  italic?: boolean
  underline?: boolean
  color?: readonly number[]
  background?: readonly number[]
  width?: number
  widthem?: number
  lineheight?: number
  strip?: boolean
  align?: number
  owidth?: number
  ocolor?: readonly number[]
  shadow?: readonly number[]
  scolor?: readonly number[]
  gcolor?: readonly number[]
  alpha?: number
  angle?: number
  fit?: number
}
/**
 * Sound commands of one frame. A play names its voice, file, extra plays (-1: forever, as
 * Sound.play(loops=-1)), volume and whether it is the music, which has its own channel. Stop,
 * volume, pause and resume may name several voices at once (Sound.stop() stops all of its own;
 * pygame's mixer.pause() pauses every channel).
 */
export type PgzeroAudioCommand =
  | readonly ['play', number, string, number, number, boolean]
  /** A note of the tone module: voice, frequency, samples at 22050 Hz, volume. */
  | readonly ['tone', number, number, number, number]
  | readonly ['stop', number | null | readonly number[]]
  | readonly ['volume', number | readonly number[], number]
  | readonly ['pause' | 'resume', number | readonly number[]]
export interface PgzeroFrameHeader {
  w: number
  h: number
  title: string
  keep: boolean
  /** [id, path, width, height]: the size the module computed (SVG: from its root element). */
  images: readonly (readonly [number, string, number, number])[]
  fonts: readonly (readonly [number, string])[]
  strings: readonly (readonly [number, string])[]
  styles: readonly (readonly [number, PgzeroTextStyle | null])[]
  audio: readonly PgzeroAudioCommand[]
  /** Python waits for sounds to end: the host should report them. */
  watch: boolean
  actors: readonly (readonly [number, number, number])[]
  decode?: number
  /** screen.surface.get_at: paint this batch at once and answer the screen's colour here. */
  read?: readonly [number, number]
  /** false: no system cursor over the game (Pygame-ce draws its own or none). */
  cursor?: boolean
}

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const finite = (value: unknown, max = 1e7): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max
const id = (value: unknown, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max
const path = (value: unknown): value is string =>
  text(value, PGZERO_LIMITS.pathChars) && value.length > 0 && !value.includes('\0')

function invalid(): never {
  throw new Error('Quadro do Pygame Zero inválido ou acima do limite.')
}

const COLOR_KEYS = new Set(['color', 'background', 'ocolor', 'scolor', 'gcolor'])
const NUMBER_KEYS = new Set([
  'font',
  'fontsize',
  'width',
  'widthem',
  'lineheight',
  'align',
  'owidth',
  'alpha',
  'angle',
  'fit',
])
const BOOLEAN_KEYS = new Set(['bold', 'italic', 'underline', 'strip'])

const STYLE_BOUNDS: Readonly<Record<string, readonly [number, number]>> = {
  fontsize: [0, PGZERO_LIMITS.fontSize],
  lineheight: [0, PGZERO_LIMITS.lineHeight],
  width: [0, PGZERO_LIMITS.textWidth],
  widthem: [0, PGZERO_LIMITS.textWidth],
  fit: [0, PGZERO_LIMITS.textWidth],
  font: [0, PGZERO_LIMITS.fonts],
}

function readStyle(value: unknown): PgzeroTextStyle | null {
  if (value === null) return null
  if (!object(value)) invalid()
  const style: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    if (COLOR_KEYS.has(key)) {
      if (!Array.isArray(item) || item.length !== 4 || !item.every((part) => id(part, 255)))
        invalid()
    } else if (key === 'shadow') {
      if (!Array.isArray(item) || item.length !== 2 || !item.every((part) => finite(part, 1000)))
        invalid()
    } else if (NUMBER_KEYS.has(key)) {
      if (!finite(item, 1e6)) invalid()
      const bounds = STYLE_BOUNDS[key]
      if (bounds && (item < bounds[0] || item > bounds[1])) invalid()
    } else if (BOOLEAN_KEYS.has(key)) {
      if (typeof item !== 'boolean') invalid()
    } else invalid()
    style[key] = item
  }
  // ptext's outline and shadow grow with the letter size (owidth/24, shadow/18 of it).
  const size = typeof style.fontsize === 'number' ? style.fontsize : 24
  if (
    typeof style.owidth === 'number' &&
    style.owidth * size * (1 / 24) > PGZERO_LIMITS.outlinePixels
  )
    invalid()
  const shadow = style.shadow as readonly number[] | undefined
  if (shadow?.some((part) => Math.abs(part) * size * (1 / 18) > PGZERO_LIMITS.shadowPixels))
    invalid()
  return style as PgzeroTextStyle
}

const voices = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= PGZERO_LIMITS.audioCommands &&
  value.every((item) => id(item, 2 ** 31))

function readAudio(value: unknown): PgzeroAudioCommand {
  if (!Array.isArray(value)) invalid()
  const [op, a, b, c, d, e] = value
  if (
    op === 'play' &&
    value.length === 6 &&
    id(a, 2 ** 31) &&
    path(b) &&
    Number.isSafeInteger(c) &&
    c >= -1 &&
    c <= PGZERO_LIMITS.soundRepeats &&
    finite(d, 1) &&
    d >= 0 &&
    typeof e === 'boolean'
  )
    return ['play', a, b, c, d, e]
  if (
    op === 'tone' &&
    value.length === 5 &&
    id(a, 2 ** 31) &&
    isToneRequest(b, c) &&
    finite(d, 1) &&
    d >= 0
  )
    return ['tone', a, b as number, c as number, d]
  if (op === 'stop' && value.length === 2 && (a === null || id(a, 2 ** 31) || voices(a)))
    return ['stop', a]
  if (
    op === 'volume' &&
    value.length === 3 &&
    (id(a, 2 ** 31) || voices(a)) &&
    finite(b, 1) &&
    b >= 0
  )
    return ['volume', a, b]
  if ((op === 'pause' || op === 'resume') && value.length === 2 && (id(a, 2 ** 31) || voices(a)))
    return [op, a]
  invalid()
}

function readDecode(value: unknown, keep: boolean): number {
  if (!keep || !id(value, PGZERO_LIMITS.images) || value < 1) invalid()
  return value
}

/** Strict, bounded parse of one frame header produced by pgzero/_sz.py. */
export function readPgzeroFrameHeader(raw: unknown): PgzeroFrameHeader {
  if (typeof raw !== 'string' || raw.length > PGZERO_LIMITS.headerChars) invalid()
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    invalid()
  }
  if (!object(value)) invalid()
  const { w, h, title, keep, images, fonts, strings, styles, audio, decode, watch, read, cursor } =
    value
  const actors = value.actors ?? []
  if (
    !id(w, PGZERO_LIMITS.maxWidth) ||
    !id(h, PGZERO_LIMITS.maxHeight) ||
    w < 1 ||
    h < 1 ||
    !text(title, PGZERO_LIMITS.titleChars) ||
    typeof keep !== 'boolean' ||
    !Array.isArray(images) ||
    images.length > PGZERO_LIMITS.images ||
    !Array.isArray(fonts) ||
    fonts.length > PGZERO_LIMITS.fonts ||
    !Array.isArray(strings) ||
    strings.length > PGZERO_LIMITS.strings + 1 ||
    !Array.isArray(styles) ||
    styles.length > PGZERO_LIMITS.styles + 1 ||
    !Array.isArray(audio) ||
    audio.length > PGZERO_LIMITS.audioCommands ||
    (watch !== undefined && typeof watch !== 'boolean') ||
    (cursor !== undefined && typeof cursor !== 'boolean') ||
    !Array.isArray(actors) ||
    actors.length > 2048 ||
    (read !== undefined &&
      (decode !== undefined ||
        !Array.isArray(read) ||
        read.length !== 2 ||
        !id(read[0], w - 1) ||
        !id(read[1], h - 1)))
  )
    invalid()
  return {
    w,
    h,
    title,
    keep,
    images: images.map((entry) => {
      if (
        !Array.isArray(entry) ||
        entry.length !== 4 ||
        !id(entry[0], PGZERO_LIMITS.images) ||
        entry[0] < 1 ||
        !path(entry[1]) ||
        !id(entry[2], PGZERO_LIMITS.imageDimension) ||
        !id(entry[3], PGZERO_LIMITS.imageDimension) ||
        entry[2] < 1 ||
        entry[3] < 1
      )
        invalid()
      return [entry[0], entry[1], entry[2], entry[3]] as const
    }),
    fonts: fonts.map((entry) => {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        !id(entry[0], PGZERO_LIMITS.fonts) ||
        entry[0] < 1 ||
        !path(entry[1])
      )
        invalid()
      return [entry[0], entry[1]] as const
    }),
    strings: strings.map((entry) => {
      if (
        !Array.isArray(entry) ||
        entry.length !== 2 ||
        !id(entry[0], PGZERO_LIMITS.strings) ||
        !text(entry[1], PGZERO_LIMITS.stringChars)
      )
        invalid()
      return [entry[0], entry[1]] as const
    }),
    styles: styles.map((entry) => {
      if (!Array.isArray(entry) || entry.length !== 2 || !id(entry[0], PGZERO_LIMITS.styles))
        invalid()
      return [entry[0], readStyle(entry[1])] as const
    }),
    audio: audio.map(readAudio),
    watch: watch === true,
    actors: actors.map((entry) => {
      if (
        !Array.isArray(entry) ||
        entry.length !== 3 ||
        !id(entry[0], Number.MAX_SAFE_INTEGER) ||
        entry[0] <= 0 ||
        !finite(entry[1]) ||
        !finite(entry[2])
      )
        invalid()
      return [entry[0], entry[1], entry[2]] as const
    }),
    ...(decode === undefined ? {} : { decode: readDecode(decode, keep) }),
    ...(read === undefined ? {} : { read: [read[0] as number, read[1] as number] as const }),
    ...(cursor === undefined ? {} : { cursor }),
  }
}

/** Input delivered to Python with the next frame (see pgzero/game.py _events). */
export type PgzeroInputEvent =
  | readonly ['kd', number, number, string]
  | readonly ['ku', number, number]
  | readonly ['md' | 'mu', number, number, number]
  | readonly ['mm', number, number, number, number, number]
