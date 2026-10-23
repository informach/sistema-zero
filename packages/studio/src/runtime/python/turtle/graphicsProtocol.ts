import limits from './limits.json'

/** Data protocol between untrusted Python and the frame-owned Turtle renderer. */
export const TURTLE_GRAPHICS_LIMITS = Object.freeze(limits)
/** Per-image native decoder bound, shared with authoring before raster allocation. */
export const TURTLE_IMAGE_DIMENSION_LIMIT = 4096

export type TurtlePoint = readonly [number, number]
export type TurtleFont = readonly [string, number, string]
export interface TurtlePatch {
  points?: TurtlePoint[]
  fill?: string
  outline?: string
  width?: number
  image?: number
  x?: number
  y?: number
}
export type TurtleOperation =
  | { op: 'create'; id: number; kind: 'polygon' | 'line' }
  | { op: 'create'; id: number; kind: 'image'; image: number; x: number; y: number }
  | {
      op: 'create'
      id: number
      kind: 'text'
      x: number
      y: number
      text: string
      align: 'left' | 'center' | 'right'
      font: TurtleFont
      fill: string
    }
  | ({ op: 'patch'; id: number } & TurtlePatch)
  | { op: 'delete'; id: number | 'all' }
  | { op: 'raise' | 'lower'; id: number }
  | { op: 'image'; id: number; path: string }
  | { op: 'background'; color: string }
  | { op: 'size'; width: number; height: number }
  | { op: 'title'; text: string }
  | { op: 'focus' | 'close' | 'open' }
  | {
      op: 'bind'
      id: number
      event: 'click' | 'release' | 'drag'
      button: number
      enabled: boolean
    }
export type TurtleQuery =
  | { type: 'viewport' | 'present' | 'activity-turn' }
  | { type: 'text-bounds'; id: number }
  | { type: 'wait'; timeoutMs: number | null }
export interface TurtleGraphicsRequest {
  version: 1
  operations: TurtleOperation[]
  query: TurtleQuery | null
}
export type TurtleInputEvent =
  | { type: 'keypress' | 'keyrelease'; key: string }
  | { type: 'click' | 'release' | 'drag'; item?: number; button: number; x: number; y: number }

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const identifier = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0
const finite = (value: unknown, max = 10_000_000): value is number =>
  typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= max
const color = (value: unknown): value is string =>
  typeof value === 'string' && (value === '' || /^#[a-f\d]{6}$/i.test(value))
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max
function invalid(): never {
  throw new Error('O programa enviou uma operação Turtle inválida ou acima do limite.')
}
function point(value: unknown): TurtlePoint {
  if (!Array.isArray(value) || value.length !== 2 || !finite(value[0]) || !finite(value[1]))
    invalid()
  return [value[0], value[1]]
}

/** Parses bounded JSON and copies only supported fields; no object from Python becomes a DOM option. */
export function readTurtleGraphicsRequest(raw: unknown): TurtleGraphicsRequest {
  if (!text(raw, TURTLE_GRAPHICS_LIMITS.requestChars)) invalid()
  if (new TextEncoder().encode(raw).byteLength > TURTLE_GRAPHICS_LIMITS.requestBytes) invalid()
  const value: unknown = JSON.parse(raw)
  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.operations) ||
    value.operations.length > TURTLE_GRAPHICS_LIMITS.operations
  )
    invalid()
  let points = 0
  let textChars = 0
  const operations: TurtleOperation[] = value.operations.map(
    (operation: unknown): TurtleOperation => {
      if (!object(operation)) invalid()
      const { op, id } = operation
      if (op === 'focus' || op === 'close' || op === 'open') return { op }
      if (op === 'title') {
        if (!text(operation.text, 512)) invalid()
        return { op, text: operation.text }
      }
      if (op === 'background') {
        if (!color(operation.color)) invalid()
        return { op, color: operation.color }
      }
      if (op === 'size') {
        if (
          !identifier(operation.width) ||
          !identifier(operation.height) ||
          operation.width > TURTLE_GRAPHICS_LIMITS.canvasWidth ||
          operation.height > TURTLE_GRAPHICS_LIMITS.canvasHeight ||
          operation.width * operation.height > TURTLE_GRAPHICS_LIMITS.backingPixels
        )
          invalid()
        return { op, width: operation.width, height: operation.height }
      }
      if (op === 'delete' && id === 'all') return { op, id }
      if (!identifier(id)) invalid()
      if (op === 'delete') return { op, id }
      if (op === 'raise' || op === 'lower') return { op, id }
      if (op === 'bind') {
        if (
          !['click', 'release', 'drag'].includes(String(operation.event)) ||
          !identifier(operation.button) ||
          operation.button > 3 ||
          typeof operation.enabled !== 'boolean'
        )
          invalid()
        return {
          op,
          id,
          event: operation.event as 'click' | 'release' | 'drag',
          button: operation.button,
          enabled: operation.enabled,
        }
      }
      if (op === 'image') {
        // A virtual filesystem path, never a URL fetched by the frame.
        if (!text(operation.path, 512) || !operation.path.length) invalid()
        return { op, id, path: operation.path }
      }
      if (op === 'patch') {
        const patch: TurtlePatch = {}
        if (operation.points !== undefined) {
          if (!Array.isArray(operation.points)) invalid()
          points += operation.points.length
          if (points > TURTLE_GRAPHICS_LIMITS.points) invalid()
          patch.points = operation.points.map(point)
        }
        for (const key of ['fill', 'outline'] as const) {
          if (operation[key] !== undefined) {
            if (!color(operation[key])) invalid()
            patch[key] = operation[key]
          }
        }
        if (operation.width !== undefined) {
          if (!finite(operation.width, 4096) || operation.width < 0) invalid()
          patch.width = operation.width
        }
        if (operation.image !== undefined) {
          if (operation.image !== 0 && !identifier(operation.image)) invalid()
          patch.image = operation.image
        }
        for (const key of ['x', 'y'] as const) {
          if (operation[key] !== undefined) {
            if (!finite(operation[key])) invalid()
            patch[key] = operation[key]
          }
        }
        return { op, id, ...patch }
      }
      if (op !== 'create') invalid()
      const { kind } = operation
      if (kind === 'line' || kind === 'polygon') return { op, id, kind }
      if (!finite(operation.x) || !finite(operation.y)) invalid()
      if (kind === 'image') {
        if (operation.image !== 0 && !identifier(operation.image)) invalid()
        return { op, id, kind, image: operation.image, x: operation.x, y: operation.y }
      }
      if (
        kind !== 'text' ||
        !text(operation.text, TURTLE_GRAPHICS_LIMITS.textChars) ||
        !['left', 'right', 'center'].includes(String(operation.align)) ||
        !color(operation.fill) ||
        !Array.isArray(operation.font) ||
        operation.font.length !== 3 ||
        !text(operation.font[0], 128) ||
        !finite(operation.font[1], 512) ||
        !operation.font[1] ||
        !text(operation.font[2], 80)
      )
        invalid()
      textChars += operation.text.length
      if (textChars > TURTLE_GRAPHICS_LIMITS.textChars) invalid()
      return {
        op,
        id,
        kind,
        x: operation.x,
        y: operation.y,
        text: operation.text,
        align: operation.align as 'left' | 'center' | 'right',
        fill: operation.fill,
        font: [operation.font[0], operation.font[1], operation.font[2]],
      }
    },
  )
  let query: TurtleQuery | null = null
  if (value.query !== null) {
    if (!object(value.query)) invalid()
    if (
      value.query.type === 'viewport' ||
      value.query.type === 'present' ||
      value.query.type === 'activity-turn'
    )
      query = { type: value.query.type }
    else if (value.query.type === 'text-bounds' && identifier(value.query.id))
      query = { type: 'text-bounds', id: value.query.id }
    else if (
      value.query.type === 'wait' &&
      (value.query.timeoutMs === null ||
        (Number.isInteger(value.query.timeoutMs) &&
          finite(value.query.timeoutMs, 2_147_483_647) &&
          value.query.timeoutMs >= 0))
    )
      query = { type: 'wait', timeoutMs: value.query.timeoutMs as number | null }
    else invalid()
  }
  return { version: 1, operations, query }
}
