import { GLTF_INPUT_LIMITS, GltfInputError, gltfList, gltfRecord, requireGltf } from './gltfInput'
import { gltfName } from './gltfMetadata'

function names(input: unknown, path: string) {
  const seen = new Set<string>()
  return gltfList(input, path, GLTF_INPUT_LIMITS.extensions).map((input, i) => {
    const at = `${path}[${i}]`,
      name = gltfName(input, at)
    requireGltf(
      name !== null && !seen.has(name),
      at,
      'A lista precisa conter nomes de extensões únicos.',
    )
    seen.add(name)
    return name
  })
}

export interface GltfExtensionUsage {
  /** No extension decoder is implemented by this core-only reader yet. */
  unhandled: string[]
  occurrences: { name: string; path: string }[]
}

/** Inventory schema extension points, never arbitrary extras or extension payloads. No execution. */
export function readGltfExtensions(json: Record<string, unknown>): GltfExtensionUsage {
  const unhandled = names(json.extensionsUsed, 'extensionsUsed'),
    required = names(json.extensionsRequired, 'extensionsRequired'),
    declared = new Set(unhandled)
  for (const [i, name] of required.entries())
    requireGltf(
      declared.has(name),
      `extensionsRequired[${i}]`,
      'A extensão obrigatória também precisa estar em extensionsUsed.',
    )
  if (required.length)
    throw new GltfInputError(
      'unsupported',
      'extensionsRequired[0]',
      `O arquivo precisa da extensão ${required[0]}, que ainda não é suportada.`,
    )
  const occurrences: GltfExtensionUsage['occurrences'] = []
  function point(input: unknown, path: string): Record<string, unknown> | null {
    // Structural readers report malformed core objects with their own exact fields.
    if (input === null || typeof input !== 'object' || Array.isArray(input)) return null
    const row = gltfRecord(input, path)
    if (row.extensions !== undefined) {
      const extensions = gltfRecord(row.extensions, `${path}.extensions`)
      for (const name of Object.keys(extensions)) {
        requireGltf(
          declared.has(name),
          `${path}.extensions`,
          'A extensão usada precisa estar declarada em extensionsUsed.',
        )
        gltfRecord(extensions[name], `${path}.extensions.${name}`)
        if (occurrences.length === GLTF_INPUT_LIMITS.extensionUses)
          throw new GltfInputError(
            'budget',
            'extensions',
            'Há usos de extensões demais neste arquivo.',
          )
        occurrences.push({ name, path: `${path}.extensions.${name}` })
      }
    }
    return row
  }
  function items(
    input: unknown,
    path: string,
    visit?: (row: Record<string, unknown>, at: string) => void,
  ) {
    if (!Array.isArray(input)) return
    for (let i = 0; i < input.length; i++) {
      const at = `${path}[${i}]`,
        row = point(input[i], at)
      if (row && visit) visit(row, at)
    }
  }
  point(json, 'glTF')
  point(json.asset, 'asset')
  for (const table of [
    'buffers',
    'bufferViews',
    'nodes',
    'scenes',
    'skins',
    'textures',
    'samplers',
    'images',
  ])
    items(json[table], table)
  items(json.accessors, 'accessors', (row, path) => {
    const sparse = point(row.sparse, `${path}.sparse`)
    if (sparse) {
      point(sparse.indices, `${path}.sparse.indices`)
      point(sparse.values, `${path}.sparse.values`)
    }
  })
  items(json.meshes, 'meshes', (row, path) => items(row.primitives, `${path}.primitives`))
  items(json.materials, 'materials', (row, path) => {
    const pbr = point(row.pbrMetallicRoughness, `${path}.pbrMetallicRoughness`)
    if (pbr)
      for (const field of ['baseColorTexture', 'metallicRoughnessTexture'])
        point(pbr[field], `${path}.pbrMetallicRoughness.${field}`)
    for (const field of ['normalTexture', 'occlusionTexture', 'emissiveTexture'])
      point(row[field], `${path}.${field}`)
  })
  items(json.cameras, 'cameras', (row, path) => {
    point(row.perspective, `${path}.perspective`)
    point(row.orthographic, `${path}.orthographic`)
  })
  items(json.animations, 'animations', (row, path) => {
    items(row.samplers, `${path}.samplers`)
    items(row.channels, `${path}.channels`, (row, path) => {
      point(row.target, `${path}.target`)
    })
  })
  return { unhandled, occurrences }
}
