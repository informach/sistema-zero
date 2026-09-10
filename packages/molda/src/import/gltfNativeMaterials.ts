import type { SceneImage, SceneMaterial } from '../scene/document'
import type { GltfDocument } from './gltfDocument'
import type { GltfGeometryMaterials } from './gltfGeometryPlan'
import { type GltfMaterialIssue, gltfLinearToSrgb } from './gltfMaterialConversionTypes'
import { planGltfMaterialImages } from './gltfMaterialImages'
import { planGltfMaterialSelection } from './gltfMaterialSelection'
import type { GltfTextureInfo } from './gltfMaterials'
import { gltfNativeName } from './gltfNativeName'
import type { GltfRasters } from './gltfRasters'
import type { GltfSelection } from './gltfSelection'

export interface GltfNativeMaterials {
  materials: SceneMaterial[]
  images: SceneImage[]
  geometry: GltfGeometryMaterials
  issues: GltfMaterialIssue[]
  pixelBytes: number
}

/**
 * Convert selected core appearance from one immutable staged source. The report
 * requires review; it is not permission to save or a promise of complete visual
 * equivalence (geometry attributes and optional extensions have separate reports).
 */
export function convertGltfMaterials(
  source: GltfDocument,
  selection: GltfSelection,
  decoded: GltfRasters,
): GltfNativeMaterials {
  const { needsDefault, geometry } = planGltfMaterialSelection(source, selection),
    { ids, defaultId } = geometry
  const issues: GltfMaterialIssue[] = [],
    images = planGltfMaterialImages(source, decoded, issues),
    materials = selection.dependencies.materials.map((index): SceneMaterial => {
      const input = source.appearance.materials[index]!,
        path = `materials[${index}]`,
        id = ids.get(index)!
      const issue = (code: GltfMaterialIssue['code'], field: string) => {
        issues.push({ code, path: `${path}.${field}`, targetId: id })
      }
      const { name, change } = gltfNativeName(input.name, `Material ${index + 1}`),
        factor = input.baseColorFactor,
        opaque = input.alphaMode === 'OPAQUE',
        native: SceneMaterial = {
          id,
          name,
          baseColor: {
            kind: 'rgba',
            value: [
              gltfLinearToSrgb(factor[0]),
              gltfLinearToSrgb(factor[1]),
              gltfLinearToSrgb(factor[2]),
              opaque ? 1 : factor[3],
            ],
          },
          roughness: input.roughnessFactor,
          metalness: input.metallicFactor,
          doubleSided: input.doubleSided,
        }
      if (change) issue(change, 'name')
      if (input.alphaMode === 'MASK')
        native.alphaMask = {
          cutoff: input.alphaCutoff,
          opacity: input.baseColorTexture ? factor[3] : 1,
        }
      function texture(info: GltfTextureInfo, field: string, color: boolean): string {
        const texture = source.appearance.textures[info.index]!,
          image = texture.source!,
          fullPath = `${path}.${field}`
        const sampler =
          texture.sampler === null ? undefined : source.appearance.samplers[texture.sampler]!
        if (sampler?.magFilter !== 9728 || sampler?.minFilter !== 9728)
          issue('sampler-filter-nearest', field)
        if (sampler?.wrapS !== 33071 || sampler?.wrapT !== 33071) issue('sampler-wrap-clamp', field)
        // MASK applies alpha after sampling: rounding the factor into RGBA8 can
        // change which side of the cutoff a texel lands on. RGB keeps its report.
        return images.add(
          image,
          fullPath,
          color
            ? {
                factor: input.alphaMode === 'MASK' ? [factor[0], factor[1], factor[2], 1] : factor,
                opaque,
              }
            : null,
        )
      }
      if (input.baseColorTexture) {
        native.colorImageId = texture(
          input.baseColorTexture,
          'pbrMetallicRoughness.baseColorTexture',
          true,
        )
        // Native base is UNDER paint. Multiplying a texture requires baking linear factors.
        native.baseColor = { kind: 'rgba', value: [0, 0, 0, 0] }
        if (
          factor.slice(0, 3).some((v) => v !== 1) ||
          (input.alphaMode === 'BLEND' && factor[3] !== 1)
        )
          issue('base-color-factor-baked', 'pbrMetallicRoughness.baseColorFactor')
      }
      if (input.normalTexture) {
        const scale = input.normalTexture.scale
        native.normalImageId = texture(input.normalTexture, 'normalTexture', false)
        native.normalStrength = scale
        // Reflecting V changes the derived bitangent; preserve the source tangent-space normal.
        native.normalFlipY = true
      }
      if (input.metallicRoughnessTexture) {
        const imageId = texture(
          input.metallicRoughnessTexture,
          'pbrMetallicRoughness.metallicRoughnessTexture',
          false,
        )
        native.roughnessImageId = imageId
        native.metalnessImageId = imageId
      }
      if (input.occlusionTexture) issue('occlusion-omitted', 'occlusionTexture')
      if (input.emissiveTexture || input.emissiveFactor.some((v) => v !== 0))
        issue('emissive-omitted', input.emissiveTexture ? 'emissiveTexture' : 'emissiveFactor')
      return native
    })
  if (needsDefault)
    materials.push({
      id: defaultId,
      name: 'Material padrão',
      baseColor: { kind: 'rgba', value: [1, 1, 1, 1] },
      roughness: 1,
      metalness: 1,
      doubleSided: false,
    })
  return {
    materials,
    ...images.materialize(),
    geometry,
    issues,
  }
}
