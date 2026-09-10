import { BbmodelInputError, bbmodelIdentifier, requireBbmodel } from './bbmodelInput'

export type BbmodelVec2 = [number, number]
export type BbmodelVec3 = [number, number, number]
export type BbmodelVec4 = [number, number, number, number]

/** Source degree conversion; preserve signed zero and its behavior for tiny finite inputs. */
export const bbmodelRadians = (degrees: number): number => Math.PI / (180 / degrees)

export function bbmodelNumber(value: unknown, path: string): number {
  requireBbmodel(
    typeof value === 'number' && Number.isFinite(value),
    path,
    'O valor precisa ser um número finito.',
  )
  return value
}

/** Own dense numbers, preserving signed zero and all finite source precision. */
function numbers(value: unknown, length: number, path: string): number[] {
  requireBbmodel(
    Array.isArray(value) && value.length === length,
    path,
    'A quantidade de coordenadas está incorreta.',
  )
  const result: number[] = []
  for (let i = 0; i < length; i++) result.push(bbmodelNumber(value[i], `${path}[${i}]`))
  return result
}

export const bbmodelVec2 = (value: unknown, path: string): BbmodelVec2 =>
  numbers(value, 2, path) as BbmodelVec2
export const bbmodelVec3 = (value: unknown, path: string): BbmodelVec3 =>
  numbers(value, 3, path) as BbmodelVec3
export const bbmodelVec4 = (value: unknown, path: string): BbmodelVec4 =>
  numbers(value, 4, path) as BbmodelVec4

export function bbmodelBoolean(value: unknown, path: string, fallback: boolean): boolean {
  if (value === undefined) return fallback
  requireBbmodel(typeof value === 'boolean', path, 'Esta opção precisa ser verdadeira ou falsa.')
  return value
}

export const bbmodelKeyPath = (path: string, key: string): string =>
  `${path}[${JSON.stringify(key)}]`

/** Stops before collecting excess keys; caller supplies the remaining aggregate budget. */
export function bbmodelKeys(
  row: Readonly<Record<string, unknown>>,
  max: number,
  path: string,
): string[] {
  const keys: string[] = []
  for (const key in row) {
    if (!Object.hasOwn(row, key)) continue
    if (keys.length === max)
      throw new BbmodelInputError('budget', path, 'Há itens demais nesta parte do arquivo.')
    bbmodelIdentifier(key, path)
    keys.push(key)
  }
  return keys
}
