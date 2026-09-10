/** Strict parser primitives. No coercion, snapping, clamping, truncation or dropped fields. */
export class SceneValidationError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(message)
    this.name = 'SceneValidationError'
  }
}

export function requireScene(condition: unknown, path: string, message: string): asserts condition {
  if (!condition) throw new SceneValidationError(path, message)
}

export function record(
  value: unknown,
  path: string,
  keys?: readonly string[],
): Record<string, unknown> {
  requireScene(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    path,
    'Objeto esperado.',
  )
  const result = value as Record<string, unknown>
  if (keys) {
    for (const key of Object.keys(result))
      requireScene(keys.includes(key), `${path}.${key}`, 'Campo desconhecido.')
  }
  return result
}

export function list(value: unknown, path: string, maximum: number): unknown[] {
  requireScene(Array.isArray(value) && value.length <= maximum, path, 'Lista fora do orçamento.')
  return Array.from(value)
}

export function text(value: unknown, path: string, maximum = 128, empty = false): string {
  requireScene(
    typeof value === 'string' && value.length <= maximum && (empty || value.length > 0),
    path,
    'Texto inválido.',
  )
  return value
}

export function id(value: unknown, path: string): string {
  const result = text(value, path)
  requireScene(/^[A-Za-z0-9_:-]+$/.test(result), path, 'Identificador inválido.')
  return result
}

export function number(
  value: unknown,
  path: string,
  min = -Infinity,
  max = Infinity,
  integer = false,
): number {
  requireScene(
    typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max &&
      (!integer || Number.isSafeInteger(value)),
    path,
    'Número inválido.',
  )
  // JSON.stringify writes -0 as 0. The authoring domain has one zero, not a hidden
  // sign bit that changes after saving. This does not quantize any nonzero value.
  return value === 0 ? 0 : value
}

export function boolean(value: unknown, path: string): boolean {
  requireScene(typeof value === 'boolean', path, 'Valor booleano esperado.')
  return value
}

export function tuple(value: unknown, length: number, path: string): number[] {
  const items = list(value, path, length)
  requireScene(items.length === length, path, 'Dimensão inválida.')
  return items.map((item, i) => number(item, `${path}[${i}]`))
}

export function choice<const T extends readonly string[]>(
  value: unknown,
  choices: T,
  path: string,
): T[number] {
  requireScene(typeof value === 'string' && choices.includes(value), path, 'Opção desconhecida.')
  return value as T[number]
}

export function uniqueById<T extends { id: string }>(
  items: readonly T[],
  path: string,
): Map<string, T> {
  const index = new Map<string, T>()
  for (const item of items) {
    requireScene(!index.has(item.id), path, `Identificador repetido: ${item.id}`)
    index.set(item.id, item)
  }
  return index
}
