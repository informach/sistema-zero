import { SCENE_LIMITS } from '../scene/limits'
import type { GltfDocument } from './gltfDocument'
import { GltfInputError, requireGltf } from './gltfInput'
import type { GltfTextureInfo } from './gltfMaterials'
import type { GltfSelection } from './gltfSelection'

/** Shared metadata gate and identities. No raster decoding or accessor values. */
export function planGltfMaterialSelection(source: GltfDocument, selection: GltfSelection) {
  const indices = selection.dependencies.materials,
    needsDefault =
      selection.defaultMaterial || (selection.instances.length > 0 && indices.length === 0)
  if (indices.length + Number(needsDefault) > SCENE_LIMITS.materials)
    throw new GltfInputError('budget', 'materials', 'Há materiais selecionados demais para editar.')
  const ids = new Map<number, string>(),
    uvSetByMaterial = new Map<number | null, number>(),
    images = new Set<number>()
  for (const index of indices) {
    const input = source.appearance.materials[index],
      path = `materials[${index}]`
    requireGltf(
      input !== undefined && !ids.has(index),
      path,
      'O material selecionado está ausente ou repetido.',
    )
    ids.set(index, `gltf_material_${index}`)
    if (input.normalTexture && (input.normalTexture.scale < 0 || input.normalTexture.scale > 4))
      throw new GltfInputError(
        'unsupported',
        `${path}.normalTexture.scale`,
        'A força normal está fora do contrato nativo; não será recortada automaticamente.',
      )
    function texture(info: GltfTextureInfo | null, field: string) {
      if (!info) return
      const image = source.appearance.textures[info.index]!.source,
        fullPath = `${path}.${field}`
      if (image === null)
        throw new GltfInputError(
          'unsupported',
          fullPath,
          'A textura não tem imagem core; sua extensão precisa de suporte antes da conversão.',
        )
      const uv = uvSetByMaterial.get(index)
      if (uv !== undefined && uv !== info.texCoord)
        throw new GltfInputError(
          'unsupported',
          `${fullPath}.texCoord`,
          'Os mapas deste material usam conjuntos UV diferentes; não podem compartilhar o mesmo UV nativo.',
        )
      uvSetByMaterial.set(index, info.texCoord)
      images.add(image)
    }
    texture(input.baseColorTexture, 'pbrMetallicRoughness.baseColorTexture')
    texture(input.normalTexture, 'normalTexture')
    texture(input.metallicRoughnessTexture, 'pbrMetallicRoughness.metallicRoughnessTexture')
  }
  const defaultId =
    needsDefault || indices.length === 0 ? 'gltf_material_default' : ids.get(indices[0]!)!
  return {
    needsDefault,
    geometry: { ids, defaultId, uvSetByMaterial },
    // Emissive/occlusion are reported as omitted. Do not decode their unused rasters.
    images: [...images].sort((a, b) => a - b),
  }
}
