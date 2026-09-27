import type { GltfAccessor } from './gltfAccessors'
import type {
  GltfAnimation,
  GltfAnimationPath,
  GltfAnimationSampler,
  GltfAnimationSources,
} from './gltfAnimationTypes'
import type { planGltfAnimationValues } from './gltfAnimationValues'
import { gltfInteger, gltfRecord, requireGltf } from './gltfInput'
import { gltfName } from './gltfMetadata'

function corePath(path: string): path is GltfAnimationPath {
  return path === 'translation' || path === 'rotation' || path === 'scale' || path === 'weights'
}
function outputFormat(accessor: GltfAccessor, target: GltfAnimationPath, path: string) {
  const float = accessor.componentType === 5126 && !accessor.normalized,
    quantized = accessor.normalized && [5120, 5121, 5122, 5123].includes(accessor.componentType)
  requireGltf(
    accessor.type === (target === 'weights' ? 'SCALAR' : target === 'rotation' ? 'VEC4' : 'VEC3') &&
      (float || ((target === 'rotation' || target === 'weights') && quantized)),
    path,
    'O formato dos valores não corresponde ao alvo desta animação.',
  )
}

export function readGltfAnimationChannel(
  input: unknown,
  samplers: readonly GltfAnimationSampler[],
  source: GltfAnimationSources,
  values: ReturnType<typeof planGltfAnimationValues>,
  seen: Set<string>,
  path: string,
): GltfAnimation['channels'][number] {
  const row = gltfRecord(input, path),
    sampler = gltfInteger(row.sampler, `${path}.sampler`, 0, samplers.length - 1),
    target = gltfRecord(row.target, `${path}.target`),
    property = gltfName(target.path, `${path}.target.path`),
    node =
      target.node === undefined
        ? null
        : gltfInteger(target.node, `${path}.target.node`, 0, source.graph.nodes.length - 1)
  requireGltf(property !== null && property.length > 0, `${path}.target.path`, 'Falta o alvo.')
  if (node !== null) {
    const key = `${node}:${property}`
    requireGltf(!seen.has(key), `${path}.target`, 'Dois canais não podem alterar o mesmo alvo.')
    seen.add(key)
  }
  if (!corePath(property)) return { sampler, target: { kind: 'unresolved', node, path: property } }
  const entry = samplers[sampler]!,
    output = source.accessors[entry.output]!,
    frames = source.accessors[entry.input]!.count,
    cubic = entry.interpolation === 'CUBICSPLINE'
  outputFormat(output, property, `${path}.sampler`)
  let width: number | null = 1
  if (node !== null) {
    const targetNode = source.graph.nodes[node]!
    requireGltf(
      targetNode.transform.kind === 'trs',
      `${path}.target.node`,
      'Um nó animado não pode declarar matrix.',
    )
    if (property === 'weights') {
      width = targetNode.mesh === null ? 0 : source.meshes[targetNode.mesh]!.weights.length
      requireGltf(width > 0, `${path}.target.node`, 'Este nó não possui morph targets.')
    }
  } else if (property === 'weights') width = null
  if (width !== null)
    requireGltf(
      output.count === frames * width * (cubic ? 3 : 1),
      `${path}.sampler`,
      'A quantidade de valores não corresponde aos tempos, tangentes e alvos.',
    )
  if (property === 'rotation') values.rotation(entry.output, entry.interpolation, `${path}.sampler`)
  return {
    sampler,
    target:
      node === null
        ? { kind: 'unresolved', node, path: property }
        : { kind: 'node', node, path: property },
  }
}
