/**
 * Wire contract between the Pygame Zero module running in the Python worker and the canvas
 * renderer in the execution frame. One exchange per game frame:
 *
 * request  = JSON header (new images/fonts/strings/styles, audio commands, window size)
 *            + attachments: the display list (Float64 records, id 0), new image bytes
 *            (ids 1…1024) and new font bytes (ids FONT_ATTACHMENT_BASE + n).
 * response = JSON with the input events since the previous frame and the paint timestamp.
 *
 * A header with `decode: [image, row, rows]` is not a frame: it asks for the RGBA pixels of
 * those rows of a vector image (`images.x.get_at` on an SVG), answered at once as
 * `{ pixels: base64 }` with at most `decodeBytes` bytes.
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
  decodeBytes: 90_000,
})

export const PGZERO_LIST_ATTACHMENT = 0
export const PGZERO_FONT_ATTACHMENT_BASE = 10_000
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
})
/** Values that follow each opcode in the display list. */
export const PGZERO_OP_ARITY: Readonly<Record<number, number>> = Object.freeze({
  1: 4,
  2: 3,
  3: 6,
  4: 9,
  5: 9,
  6: 8,
  7: 6,
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
export type PgzeroAudioCommand =
  | readonly ['play', number, string, boolean, number]
  | readonly ['stop', number | null]
  | readonly ['volume', number, number]
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
  decode?: readonly [number, number, number]
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
    } else if (BOOLEAN_KEYS.has(key)) {
      if (typeof item !== 'boolean') invalid()
    } else invalid()
    style[key] = item
  }
  return style as PgzeroTextStyle
}

function readAudio(value: unknown): PgzeroAudioCommand {
  if (!Array.isArray(value)) invalid()
  const [op, a, b, c, d] = value
  if (
    op === 'play' &&
    value.length === 5 &&
    id(a, 2 ** 31) &&
    path(b) &&
    typeof c === 'boolean' &&
    finite(d, 1) &&
    d >= 0
  )
    return ['play', a, b, c, d]
  if (op === 'stop' && value.length === 2 && (a === null || id(a, 2 ** 31))) return ['stop', a]
  if (op === 'volume' && value.length === 3 && id(a, 2 ** 31) && finite(b, 1) && b >= 0)
    return ['volume', a, b]
  invalid()
}

/** Strict, bounded parse of one frame header produced by pgzero/_sz.py. */
function readDecode(value: unknown, keep: boolean): readonly [number, number, number] {
  if (
    !keep ||
    !Array.isArray(value) ||
    value.length !== 3 ||
    !id(value[0], PGZERO_LIMITS.images) ||
    value[0] < 1 ||
    !id(value[1], PGZERO_LIMITS.imageDimension - 1) ||
    !id(value[2], PGZERO_LIMITS.imageDimension) ||
    value[2] < 1
  )
    invalid()
  return [value[0], value[1], value[2]] as const
}

export function readPgzeroFrameHeader(raw: unknown): PgzeroFrameHeader {
  if (typeof raw !== 'string' || raw.length > PGZERO_LIMITS.headerChars) invalid()
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    invalid()
  }
  if (!object(value)) invalid()
  const { w, h, title, keep, images, fonts, strings, styles, audio, decode } = value
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
    audio.length > PGZERO_LIMITS.audioCommands
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
    ...(decode === undefined ? {} : { decode: readDecode(decode, keep) }),
  }
}

/** Input delivered to Python with the next frame (see pgzero/game.py _events). */
export type PgzeroInputEvent =
  | readonly ['kd', number, number, string]
  | readonly ['ku', number, number]
  | readonly ['md' | 'mu', number, number, number]
  | readonly ['mm', number, number, number, number, number]
