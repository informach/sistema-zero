/**
 * Wire contract between the Raylib module (`pyray`/`raylib`) running in the Python worker and the
 * WebGL2 renderer in the execution frame. One exchange per `end_drawing()`:
 *
 * request  = JSON header (window, new textures/fonts, freed resources, audio, cursor)
 *            + one payload: the display list (Float64 records, `list` bytes) followed by the
 *            pixels of textures made from images (`['p', w, h, bytes]`, in order).
 * response = JSON with the input events since the previous frame, the paint timestamp, the
 *            sounds that ended and the pointer-lock state, or `{ error }`.
 */
import type { PgzeroAudioCommand } from '../pgzero/protocol'

export const RAYLIB_LIMITS = Object.freeze({
  headerChars: 512_000,
  listBytes: 16 * 1024 * 1024,
  textures: 2048,
  textureDimension: 8192,
  totalPixels: 48 * 1024 * 1024,
  fileBytes: 16 * 1024 * 1024,
  fonts: 64,
  fontGlyphs: 4096,
  fontSize: 512,
  audioCommands: 64,
  events: 256,
  maxWidth: 3840,
  maxHeight: 2160,
  pathChars: 512,
  titleChars: 200,
  frameAttachmentBytes: 24 * 1024 * 1024,
  endedVoices: 64,
  matrixDepth: 32,
})

/** The attachment id of a font file is this plus the font's texture id. */
export const RAYLIB_FONT_ATTACHMENT_BASE = 1_000_000_000
/** The payload (display list, then image pixels) is attachment 0. */
export const RAYLIB_PAYLOAD_ATTACHMENT = 0

/** Display-list opcodes (kept in sync with _szraylib/_rt.py). */
export const RAYLIB_OP = Object.freeze({
  CLEAR: 1,
  RECT_PRO: 2,
  RECT_GRADIENT: 3,
  RECT_LINES: 4,
  RECT_LINES_EX: 5,
  RECT_ROUNDED: 6,
  RECT_ROUNDED_LINES: 7,
  LINE: 8,
  LINE_EX: 9,
  PIXEL: 10,
  CIRCLE_SECTOR: 11,
  CIRCLE_SECTOR_LINES: 12,
  CIRCLE_GRADIENT: 13,
  CIRCLE_LINES: 14,
  ELLIPSE: 15,
  ELLIPSE_LINES: 16,
  RING: 17,
  RING_LINES: 18,
  TRIANGLE: 19,
  TRIANGLE_LINES: 20,
  POLY: 21,
  POLY_LINES: 22,
  POLY_LINES_EX: 23,
  TEXTURE: 24,
  /** fontTexture, size, tint, count, then count × (codepoint, x, y). */
  TEXT: 25,
  BEGIN_2D: 26,
  END_2D: 27,
  BEGIN_TEXTURE: 28,
  END_TEXTURE: 29,
  BEGIN_SCISSOR: 30,
  END_SCISSOR: 31,
  BEGIN_BLEND: 32,
  END_BLEND: 33,
  PUSH: 34,
  POP: 35,
  TRANSLATE: 36,
  ROTATE: 37,
  SCALE: 38,
  LINE_BEZIER: 39,
  TEXTURE_NPATCH: 41,
  BEGIN_3D: 60,
  END_3D: 61,
})

/** Values after each fixed-size opcode. TEXT is variable: 4 + 3 × count. */
export const RAYLIB_OP_ARITY: Readonly<Record<number, number>> = Object.freeze({
  1: 1,
  2: 8,
  3: 8,
  4: 5,
  5: 6,
  6: 7,
  7: 8,
  8: 5,
  9: 6,
  10: 3,
  11: 7,
  12: 7,
  13: 5,
  14: 4,
  15: 5,
  16: 5,
  17: 8,
  18: 8,
  19: 7,
  20: 7,
  21: 6,
  22: 6,
  23: 7,
  24: 15,
  26: 6,
  27: 0,
  28: 1,
  29: 0,
  30: 4,
  31: 0,
  32: 1,
  33: 0,
  34: 0,
  35: 0,
  36: 3,
  37: 4,
  38: 3,
  39: 6,
  41: 21,
})

export type RaylibTexture =
  | readonly [number, 'f', string]
  | readonly [number, 'p', number, number, number]
  | readonly [number, 'r', number, number]
  | readonly [number, 'filter' | 'wrap', number]
/** [textureId, path, baseSize, emPx, ascentPx, codepoints]. */
export type RaylibFont = readonly [number, string, number, number, number, readonly number[]]

export interface RaylibFrameHeader {
  w: number
  h: number
  title: string
  fps: number
  keep: boolean
  /** Bytes of the display list at the start of the payload (0 with keep). */
  list: number
  textures: readonly RaylibTexture[]
  fonts: readonly RaylibFont[]
  models: readonly unknown[]
  free: readonly number[]
  audio: readonly PgzeroAudioCommand[]
  /** [pointer locked, cursor hidden]. */
  cursor: readonly [boolean, boolean]
  mode: '2d' | '3d'
}

const finite = (value: unknown, max = 1e9): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max
const id = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 2 ** 31
const path = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= RAYLIB_LIMITS.pathChars &&
  !value.startsWith('/') &&
  !value.split('/').includes('..')

function invalid(): never {
  throw new Error('O quadro do Raylib chegou com um formato inválido.')
}

function readTexture(entry: unknown): RaylibTexture {
  if (!Array.isArray(entry) || !id(entry[0])) invalid()
  const [texture, kind] = entry
  const dimension = (value: unknown) =>
    id(value) && value >= 1 && value <= RAYLIB_LIMITS.textureDimension
  switch (kind) {
    case 'f':
      if (entry.length !== 3 || !path(entry[2])) invalid()
      return [texture, 'f', entry[2]]
    case 'p':
      if (entry.length !== 5 || !dimension(entry[2]) || !dimension(entry[3]) || !id(entry[4]))
        invalid()
      if (entry[4] !== entry[2] * entry[3] * 4) invalid()
      return [texture, 'p', entry[2], entry[3], entry[4]]
    case 'r':
      if (entry.length !== 4 || !dimension(entry[2]) || !dimension(entry[3])) invalid()
      return [texture, 'r', entry[2], entry[3]]
    case 'filter':
    case 'wrap':
      if (entry.length !== 3 || !id(entry[2])) invalid()
      return [texture, kind, entry[2]]
    default:
      invalid()
  }
}

function readFont(entry: unknown): RaylibFont {
  if (
    !Array.isArray(entry) ||
    entry.length !== 6 ||
    !id(entry[0]) ||
    !path(entry[1]) ||
    !id(entry[2]) ||
    entry[2] < 1 ||
    entry[2] > RAYLIB_LIMITS.fontSize ||
    !finite(entry[3], 10_000) ||
    !finite(entry[4], 10_000) ||
    !Array.isArray(entry[5]) ||
    entry[5].length > RAYLIB_LIMITS.fontGlyphs ||
    !entry[5].every((code: unknown) => id(code) && code <= 0x10ffff)
  )
    invalid()
  return [entry[0], entry[1], entry[2], entry[3], entry[4], entry[5]]
}

function readAudio(command: unknown): PgzeroAudioCommand {
  if (!Array.isArray(command)) invalid()
  switch (command[0]) {
    case 'play':
      if (
        command.length !== 6 ||
        !id(command[1]) ||
        !path(command[2]) ||
        !finite(command[3], 1000) ||
        !finite(command[4], 100) ||
        typeof command[5] !== 'boolean'
      )
        invalid()
      return ['play', command[1], command[2], command[3], command[4], command[5]]
    case 'stop':
      if (command.length !== 2 || !id(command[1])) invalid()
      return ['stop', command[1]]
    case 'volume':
      if (command.length !== 3 || !id(command[1]) || !finite(command[2], 100)) invalid()
      return ['volume', command[1], command[2]]
    case 'pause':
    case 'resume':
      if (command.length !== 2 || !id(command[1])) invalid()
      return [command[0], command[1]]
    default:
      invalid()
  }
}

export function readRaylibFrameHeader(raw: unknown): RaylibFrameHeader {
  if (typeof raw !== 'string' || raw.length > RAYLIB_LIMITS.headerChars) invalid()
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    invalid()
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) invalid()
  const value = parsed as Record<string, unknown>
  const { w, h, title, fps, keep, list, textures, fonts, models, free, audio, cursor, mode } = value
  if (
    !id(w) ||
    !id(h) ||
    w < 1 ||
    h < 1 ||
    w > RAYLIB_LIMITS.maxWidth ||
    h > RAYLIB_LIMITS.maxHeight ||
    typeof title !== 'string' ||
    title.length > RAYLIB_LIMITS.titleChars ||
    !id(fps) ||
    typeof keep !== 'boolean' ||
    !id(list) ||
    list > RAYLIB_LIMITS.listBytes ||
    list % 8 !== 0 ||
    (keep && list !== 0) ||
    !Array.isArray(textures) ||
    textures.length > 512 ||
    !Array.isArray(fonts) ||
    fonts.length > RAYLIB_LIMITS.fonts ||
    !Array.isArray(models) ||
    models.length > 64 ||
    !Array.isArray(free) ||
    free.length > 4096 ||
    !free.every(id) ||
    !Array.isArray(audio) ||
    audio.length > RAYLIB_LIMITS.audioCommands ||
    !Array.isArray(cursor) ||
    cursor.length !== 2 ||
    typeof cursor[0] !== 'boolean' ||
    typeof cursor[1] !== 'boolean' ||
    (mode !== '2d' && mode !== '3d')
  )
    invalid()
  return {
    w,
    h,
    title,
    fps,
    keep,
    list,
    textures: textures.map(readTexture),
    fonts: fonts.map(readFont),
    models,
    free,
    audio: audio.map(readAudio),
    cursor: [cursor[0], cursor[1]],
    mode,
  }
}

/** Input delivered to Python with the next frame (see _szraylib/_rt.py _poll). */
export type RaylibInputEvent =
  | readonly ['kd', number]
  | readonly ['ku', number]
  | readonly ['ch', number]
  | readonly ['md' | 'mu', number, number, number]
  | readonly ['mm', number, number, number, number]
  | readonly ['mw', number]
  | readonly ['leave' | 'blur' | 'focus']

/**
 * raylib key codes (GLFW: physical keys named after the US layout) for KeyboardEvent.code.
 * Letters and digits are built below; the rest is listed.
 */
export const RAYLIB_KEY_CODES: Readonly<Record<string, number>> = Object.freeze({
  ...Object.fromEntries(
    Array.from({ length: 26 }, (_, i) => [`Key${String.fromCharCode(65 + i)}`, 65 + i]),
  ),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`Digit${i}`, 48 + i])),
  ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, 290 + i])),
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`Numpad${i}`, 320 + i])),
  Space: 32,
  Quote: 39,
  Comma: 44,
  Minus: 45,
  Period: 46,
  Slash: 47,
  Semicolon: 59,
  Equal: 61,
  BracketLeft: 91,
  Backslash: 92,
  BracketRight: 93,
  Backquote: 96,
  Escape: 256,
  Enter: 257,
  Tab: 258,
  Backspace: 259,
  Insert: 260,
  Delete: 261,
  ArrowRight: 262,
  ArrowLeft: 263,
  ArrowDown: 264,
  ArrowUp: 265,
  PageUp: 266,
  PageDown: 267,
  Home: 268,
  End: 269,
  CapsLock: 280,
  ScrollLock: 281,
  NumLock: 282,
  PrintScreen: 283,
  Pause: 284,
  NumpadDecimal: 330,
  NumpadDivide: 331,
  NumpadMultiply: 332,
  NumpadSubtract: 333,
  NumpadAdd: 334,
  NumpadEnter: 335,
  NumpadEqual: 336,
  ShiftLeft: 340,
  ControlLeft: 341,
  AltLeft: 342,
  MetaLeft: 343,
  ShiftRight: 344,
  ControlRight: 345,
  AltRight: 346,
  MetaRight: 347,
  ContextMenu: 348,
})

/**
 * Keys the page keeps for itself even during a game: browser shortcuts with Ctrl or the system
 * key (reload, close, copy, tabs). Arrows, Space and everything else belong to the game.
 */
const SHORTCUT_CODES =
  /^(Key[A-Z]|Digit\d|F\d{1,2}|Tab|Minus|Equal|BracketLeft|BracketRight|Comma|Period|Backquote)$/

export function readRaylibKey(event: {
  code: string
  key: string
  ctrlKey: boolean
  metaKey: boolean
}) {
  const key = RAYLIB_KEY_CODES[event.code]
  const shortcut = (event.ctrlKey || event.metaKey) && SHORTCUT_CODES.test(event.code)
  return { key, preventDefault: key !== undefined && event.code !== 'Tab' && !shortcut }
}
