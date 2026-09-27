import { OBJ_INPUT_LIMITS, ObjInputError, objBudget, requireObj } from './objInput'

/** In addition to the shared OBJ/MTL byte, line and token budgets. */
export const MTL_INPUT_LIMITS = {
  materials: 65_536,
  properties: 262_144,
  options: 262_144,
  optionsPerMap: 64,
  nameChars: OBJ_INPUT_LIMITS.nameChars,
} as const

export interface MtlReadLimits {
  materials: number
  properties: number
  options: number
}
/** The coordinator may lower ceilings to enforce a whole-bundle budget before each append. */
export function mtlReadLimits(value: MtlReadLimits): MtlReadLimits {
  const own = { materials: value.materials, properties: value.properties, options: value.options }
  for (const key of ['materials', 'properties', 'options'] as const)
    requireObj(
      Number.isSafeInteger(own[key]) && own[key] >= 0 && own[key] <= MTL_INPUT_LIMITS[key],
      `limits.${key}`,
      'O orçamento MTL precisa ser um inteiro dentro do limite de leitura.',
    )
  return own
}

export function mtlName(value: string, path: string): string {
  requireObj(value.length > 0, path, 'Falta o nome no arquivo MTL.')
  objBudget(value.length, MTL_INPUT_LIMITS.nameChars, path)
  return value
}
export function mtlFilename(value: string, path: string): string {
  mtlName(value, path)
  if (value.includes('"'))
    throw new ObjInputError(
      'unsupported',
      path,
      'Caminhos MTL entre aspas ainda não são suportados.',
    )
  return value
}
