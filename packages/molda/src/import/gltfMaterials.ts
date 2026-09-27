import type { Vec3 } from '../core/model'
import { GLTF_INPUT_LIMITS, gltfInteger, gltfList, gltfRecord, requireGltf } from './gltfInput'
import type { GltfMesh } from './gltfMeshes'
import { gltfChoice, gltfName, gltfNumber, gltfNumbers } from './gltfMetadata'

export interface GltfTextureInfo {
  index: number
  texCoord: number
}
export interface GltfMaterial {
  name: string | null
  baseColorFactor: [number, number, number, number]
  metallicFactor: number
  roughnessFactor: number
  baseColorTexture: GltfTextureInfo | null
  metallicRoughnessTexture: GltfTextureInfo | null
  normalTexture: (GltfTextureInfo & { scale: number }) | null
  occlusionTexture: (GltfTextureInfo & { strength: number }) | null
  emissiveTexture: GltfTextureInfo | null
  emissiveFactor: Vec3
  alphaMode: 'OPAQUE' | 'MASK' | 'BLEND'
  alphaCutoff: number
  doubleSided: boolean
}

function textureInfo(row: Record<string, unknown>, count: number, path: string): GltfTextureInfo {
  return {
    index: gltfInteger(row.index, `${path}.index`, 0, count - 1),
    texCoord: row.texCoord === undefined ? 0 : gltfInteger(row.texCoord, `${path}.texCoord`),
  }
}
function texture(value: unknown, count: number, path: string): GltfTextureInfo | null {
  return value === undefined ? null : textureInfo(gltfRecord(value, path), count, path)
}

/** The core PBR description, not a native material. Keep the original JSON for extension review. */
export function readGltfMaterials(input: unknown, textureCount: number): GltfMaterial[] {
  return gltfList(input, 'materials', GLTF_INPUT_LIMITS.appearanceItems).map((value, i) => {
    const path = `materials[${i}]`,
      row = gltfRecord(value, path),
      pbrPath = `${path}.pbrMetallicRoughness`
    const pbr =
      row.pbrMetallicRoughness === undefined ? {} : gltfRecord(row.pbrMetallicRoughness, pbrPath)
    const baseColorFactor: GltfMaterial['baseColorFactor'] =
      pbr.baseColorFactor === undefined
        ? [1, 1, 1, 1]
        : (gltfNumbers(
            pbr.baseColorFactor,
            4,
            `${pbrPath}.baseColorFactor`,
          ) as GltfMaterial['baseColorFactor'])
    const emissiveFactor: Vec3 =
      row.emissiveFactor === undefined
        ? [0, 0, 0]
        : (gltfNumbers(row.emissiveFactor, 3, `${path}.emissiveFactor`) as Vec3)
    for (const component of baseColorFactor)
      gltfNumber(component, `${pbrPath}.baseColorFactor`, 0, 1)
    for (const component of emissiveFactor) gltfNumber(component, `${path}.emissiveFactor`, 0, 1)
    const normal =
      row.normalTexture === undefined
        ? null
        : gltfRecord(row.normalTexture, `${path}.normalTexture`)
    const occlusion =
      row.occlusionTexture === undefined
        ? null
        : gltfRecord(row.occlusionTexture, `${path}.occlusionTexture`)
    const doubleSided = row.doubleSided === undefined ? false : row.doubleSided
    requireGltf(
      typeof doubleSided === 'boolean',
      `${path}.doubleSided`,
      'Dupla face precisa ser verdadeiro ou falso.',
    )
    requireGltf(
      row.alphaCutoff === undefined || row.alphaMode !== undefined,
      `${path}.alphaCutoff`,
      'alphaCutoff precisa de alphaMode declarado.',
    )
    return {
      name: gltfName(row.name, `${path}.name`),
      baseColorFactor,
      emissiveFactor,
      doubleSided,
      metallicFactor: gltfNumber(
        pbr.metallicFactor === undefined ? 1 : pbr.metallicFactor,
        `${pbrPath}.metallicFactor`,
        0,
        1,
      ),
      roughnessFactor: gltfNumber(
        pbr.roughnessFactor === undefined ? 1 : pbr.roughnessFactor,
        `${pbrPath}.roughnessFactor`,
        0,
        1,
      ),
      baseColorTexture: texture(pbr.baseColorTexture, textureCount, `${pbrPath}.baseColorTexture`),
      metallicRoughnessTexture: texture(
        pbr.metallicRoughnessTexture,
        textureCount,
        `${pbrPath}.metallicRoughnessTexture`,
      ),
      emissiveTexture: texture(row.emissiveTexture, textureCount, `${path}.emissiveTexture`),
      normalTexture:
        normal === null
          ? null
          : {
              ...textureInfo(normal, textureCount, `${path}.normalTexture`),
              scale: gltfNumber(
                normal.scale === undefined ? 1 : normal.scale,
                `${path}.normalTexture.scale`,
              ),
            },
      occlusionTexture:
        occlusion === null
          ? null
          : {
              ...textureInfo(occlusion, textureCount, `${path}.occlusionTexture`),
              strength: gltfNumber(
                occlusion.strength === undefined ? 1 : occlusion.strength,
                `${path}.occlusionTexture.strength`,
                0,
                1,
              ),
            },
      alphaMode:
        row.alphaMode === undefined
          ? 'OPAQUE'
          : gltfChoice(row.alphaMode, ['OPAQUE', 'MASK', 'BLEND'], `${path}.alphaMode`),
      alphaCutoff: gltfNumber(
        row.alphaCutoff === undefined ? 0.5 : row.alphaCutoff,
        `${path}.alphaCutoff`,
        0,
      ),
    }
  })
}

/** Validate every required core UV set, including maps a native conversion may later omit. */
export function validateGltfMaterialUvs(
  meshes: readonly GltfMesh[],
  materials: readonly GltfMaterial[],
): void {
  const sets = new Map<number, Set<number>>()
  meshes.forEach((mesh, m) => {
    mesh.primitives.forEach((primitive, p) => {
      if (primitive.material === null) return
      const path = `meshes[${m}].primitives[${p}]`,
        material = materials[primitive.material]
      requireGltf(material !== undefined, `${path}.material`, 'O material referenciado não existe.')
      let required = sets.get(primitive.material)
      if (!required) {
        required = new Set<number>()
        for (const texture of [
          material.baseColorTexture,
          material.metallicRoughnessTexture,
          material.normalTexture,
          material.occlusionTexture,
          material.emissiveTexture,
        ])
          if (texture) required.add(texture.texCoord)
        sets.set(primitive.material, required)
      }
      for (const set of required)
        requireGltf(
          primitive.attributes.has(`TEXCOORD_${set}`),
          `${path}.attributes.TEXCOORD_${set}`,
          'Falta um conjunto UV exigido pelo material.',
        )
    })
  })
}
