/** Source budgets, not native edit limits or a claim about peak memory. */
export const OBJ_INPUT_LIMITS = {
  fileBytes: 32 * 1024 * 1024,
  selectedFileBytes: 64 * 1024 * 1024,
  resources: 1024,
  lineChars: 65_536,
  lines: 1_048_576,
  tokens: 4_194_304,
  attributeValues: 4_194_304,
  references: 1_048_576,
  elements: 262_144,
  states: 65_536,
  groupNames: 65_536,
  libraries: 1_024,
  nameChars: 4_096,
} as const

export class ObjInputError extends Error {
  constructor(
    readonly reason: 'invalid' | 'unsupported' | 'budget',
    readonly path: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ObjInputError'
  }
}
export function requireObj(condition: unknown, path: string, message: string): asserts condition {
  if (!condition) throw new ObjInputError('invalid', path, message)
}
export function objBudget(count: number, limit: number, path: string): void {
  if (count > limit)
    throw new ObjInputError(
      'budget',
      path,
      'Este arquivo ultrapassa o limite de leitura OBJ/MTL da oficina.',
    )
}
export const OBJ_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/
export function objNumber(text: string, path: string): number {
  requireObj(OBJ_NUMBER_PATTERN.test(text), path, 'Esperava um número decimal.')
  const value = Number(text)
  requireObj(Number.isFinite(value), path, 'O número precisa ser finito.')
  return value
}
export function objIndex(text: string, count: number, path: string): number {
  requireObj(/^[+-]?\d+$/.test(text), path, 'A referência precisa ser um número inteiro.')
  const index = Number(text)
  requireObj(
    Number.isSafeInteger(index) && index !== 0,
    path,
    'A referência precisa ser um inteiro diferente de zero.',
  )
  const resolved = index > 0 ? index - 1 : count + index
  requireObj(
    resolved >= 0 && resolved < count,
    path,
    'A referência aponta para um dado que ainda não foi definido.',
  )
  return resolved
}
