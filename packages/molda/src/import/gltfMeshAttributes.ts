import { gltfElementLayout } from './gltfAccessorLayout'
import type { GltfAccessor } from './gltfAccessors'
import {
  GLTF_INPUT_LIMITS,
  GltfInputError,
  gltfInteger,
  gltfRecord,
  requireGltf,
} from './gltfInput'

export interface GltfMeshViewUse {
  role: 'vertex' | 'indices'
  accessors: Set<number>
}
export type GltfMeshViewUses = Map<number, GltfMeshViewUse>
export interface GltfMeshAttributeChecks {
  viewUses: GltfMeshViewUses
  tangents: Set<number>
}

export function gltfMeshAccessor(
  index: unknown,
  accessors: readonly GltfAccessor[],
  path: string,
): number {
  return gltfInteger(index, path, 0, accessors.length - 1)
}

export function markGltfMeshUse(
  index: number,
  accessor: GltfAccessor,
  role: 'vertex' | 'indices',
  uses: GltfMeshViewUses,
  path: string,
): void {
  const layout = accessor.layout
  if (!layout) return
  requireGltf(
    layout.target === null || layout.target === (role === 'vertex' ? 34962 : 34963),
    path,
    'O destino do bufferView não corresponde ao uso deste accessor.',
  )
  if (role === 'vertex') {
    const stride =
      layout.byteStride ?? gltfElementLayout(accessor.componentType, accessor.type, path).stride
    requireGltf(
      layout.byteOffset % 4 === 0 && (accessor.count === 1 || stride % 4 === 0),
      path,
      'Os atributos de vértice precisam de alinhamento de quatro bytes.',
    )
  } else
    requireGltf(
      layout.byteStride === null,
      path,
      'Índices de desenho não podem usar passo de vértices.',
    )
  const previous = uses.get(layout.bufferView)
  requireGltf(
    !previous || previous.role === role,
    path,
    'Um bufferView não pode misturar índices e atributos de vértices.',
  )
  const use = previous ?? { role, accessors: new Set<number>() }
  use.accessors.add(index)
  requireGltf(
    role !== 'vertex' || use.accessors.size < 2 || layout.byteStride !== null,
    path,
    'Atributos diferentes no mesmo bufferView precisam declarar byteStride.',
  )
  uses.set(layout.bufferView, use)
}

function checkAttribute(name: string, accessor: GltfAccessor, morph: boolean, path: string): void {
  const { type, componentType: component, normalized } = accessor
  const float = component === 5126 && !normalized
  const unsigned = component === 5121 || component === 5123
  const unitInteger =
    normalized && (unsigned || (morph && (component === 5120 || component === 5122)))
  let valid: boolean
  if (name === 'POSITION' || name === 'NORMAL' || name === 'TANGENT') {
    valid = float && type === (name === 'TANGENT' && !morph ? 'VEC4' : 'VEC3')
    if (name === 'POSITION')
      requireGltf(
        accessor.min !== null && accessor.max !== null,
        path,
        'As posições precisam declarar seus limites mínimo e máximo.',
      )
  } else if (name.startsWith('TEXCOORD_')) valid = type === 'VEC2' && (float || unitInteger)
  else if (name.startsWith('COLOR_'))
    valid = (type === 'VEC3' || type === 'VEC4') && (float || unitInteger)
  else if (name.startsWith('JOINTS_')) valid = !morph && type === 'VEC4' && unsigned && !normalized
  else if (name.startsWith('WEIGHTS_'))
    valid = !morph && type === 'VEC4' && (float || (unsigned && normalized))
  else if (name.startsWith('_') && name.length > 1) valid = component !== 5125
  else
    throw new GltfInputError(
      'unsupported',
      path,
      'Este atributo precisa de uma extensão que ainda não é interpretada.',
    )
  requireGltf(valid, path, 'O tipo do accessor não corresponde a este atributo da malha.')
}

/** Only references/metadata are copied. The caller keeps the owned numeric accessor table. */
export function readGltfMeshAttributes(
  input: unknown,
  accessors: readonly GltfAccessor[],
  checks: GltfMeshAttributeChecks,
  path: string,
  base?: ReadonlyMap<string, number>,
): Map<string, number> {
  const row = gltfRecord(input, path),
    names = Object.keys(row)
  requireGltf(names.length > 0, path, 'A primitive precisa declarar pelo menos um atributo.')
  if (names.length > GLTF_INPUT_LIMITS.attributes)
    throw new GltfInputError('budget', path, 'Há atributos demais nesta primitive.')
  const result = new Map<string, number>(),
    families = new Map<string, Set<number>>()
  let count: number | null = null
  for (const name of names) {
    const value = row[name]
    if (name.length > GLTF_INPUT_LIMITS.pathLength)
      throw new GltfInputError(
        'budget',
        path,
        'O nome de um atributo ultrapassa o limite do Molda.',
      )
    const field = `${path}.${name}`
    const family = /^(TEXCOORD|COLOR|JOINTS|WEIGHTS)_/.exec(name)
    if (family) {
      const digits = name.slice(family[0].length)
      requireGltf(
        /^(0|[1-9][0-9]*)$/.test(digits),
        field,
        'O número do conjunto de atributos não é válido.',
      )
      const set = Number(digits)
      requireGltf(
        Number.isSafeInteger(set),
        field,
        'O número do conjunto de atributos é grande demais.',
      )
      const indices = families.get(family[1]!) ?? new Set<number>()
      indices.add(set)
      families.set(family[1]!, indices)
    }
    const index = gltfMeshAccessor(value, accessors, field),
      accessor = accessors[index]!
    checkAttribute(name, accessor, base !== undefined, field)
    if (name === 'TANGENT' && !base && !checks.tangents.has(index)) {
      for (let i = 3; i < accessor.values.length; i += 4)
        requireGltf(
          accessor.values[i] === 1 || accessor.values[i] === -1,
          field,
          'O sinal da tangente precisa ser 1 ou -1.',
        )
      checks.tangents.add(index)
    }
    if (base)
      requireGltf(
        base.has(name) && accessors[base.get(name)!]!.count === accessor.count,
        field,
        'O morph target precisa corresponder ao atributo original.',
      )
    if (count === null) count = accessor.count
    requireGltf(
      accessor.count === count,
      field,
      'Todos os atributos da primitive precisam ter a mesma quantidade de vértices.',
    )
    markGltfMeshUse(index, accessor, 'vertex', checks.viewUses, field)
    result.set(name, index)
  }
  if (!base) {
    // A morph may omit unchanged sets; consecutive numbering applies to the base.
    for (const sets of families.values())
      for (let i = 0; i < sets.size; i++)
        requireGltf(
          sets.has(i),
          path,
          'Os conjuntos de atributos precisam começar em zero e ser consecutivos.',
        )
    const joints = families.get('JOINTS')?.size ?? 0,
      weights = families.get('WEIGHTS')?.size ?? 0
    requireGltf(
      joints === weights,
      path,
      'Cada conjunto de juntas precisa do conjunto de pesos correspondente.',
    )
  }
  return result
}
