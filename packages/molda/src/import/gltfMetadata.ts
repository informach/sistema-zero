import { GLTF_INPUT_LIMITS, GltfInputError, gltfList, requireGltf } from './gltfInput'

export function gltfName(value: unknown, path: string): string | null {
  if (value === undefined) return null
  requireGltf(typeof value === 'string', path, 'O nome precisa ser texto.')
  if (value.length > GLTF_INPUT_LIMITS.pathLength)
    throw new GltfInputError('budget', path, 'O nome é longo demais.')
  return value
}

/** Owned, dense and finite. No coercion, snap, clamping or quaternion normalization. */
export function gltfNumbers(value: unknown, length: number, path: string): number[] {
  requireGltf(value !== undefined, path, 'Faltam os valores deste campo.')
  const items = gltfList(value, path, length)
  requireGltf(items.length === length, path, 'A quantidade de valores está incorreta.')
  return items.map((item) => {
    requireGltf(
      typeof item === 'number' && Number.isFinite(item),
      path,
      'Os valores precisam ser números finitos.',
    )
    return item === 0 ? 0 : item
  })
}

export function gltfNumber(value: unknown, path: string, min = -Infinity, max = Infinity): number {
  requireGltf(
    typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max,
    path,
    'Este número está fora do intervalo permitido.',
  )
  return value === 0 ? 0 : value
}

export function gltfChoice<const T extends string | number>(
  value: unknown,
  allowed: readonly T[],
  path: string,
): T {
  const found = allowed.find((candidate) => candidate === value)
  requireGltf(found !== undefined, path, 'Esta opção não é válida no formato glTF.')
  return found
}
