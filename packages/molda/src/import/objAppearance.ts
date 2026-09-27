import {
  type MtlBaseOptions,
  type MtlBasePlan,
  planSelectedMtlBase,
  readMtlBaseOptions,
} from './mtlBase'
import { type MtlEffectiveProperties, selectMtlProperties } from './mtlEffectiveProperties'
import type { MtlTexturePolicy } from './mtlTexturePlanTypes'
import { readMtlTexturePolicy } from './mtlTexturePolicy'
import { planMtlTextures } from './mtlTextures'
import type { MtlMaterial } from './mtlTypes'
import type { ObjBundleRead } from './objBundle'
import type { ObjGeometryMaterials } from './objGeometryPlan'
import { ObjInputError, requireObj } from './objInput'
import type { ObjMaterialSelection, ObjSelectedMaterial } from './objMaterialSelection'
import { objOptionGroup } from './objOptionGroup'
import type { ObjRasterReference } from './objRasters'
import type { ObjUvTransform } from './objUvTransform'

export interface ObjAppearanceOptions {
  base: MtlBaseOptions
  textures: MtlTexturePolicy
}
export interface ObjAppearanceMaterial extends ObjSelectedMaterial {
  base: MtlBasePlan
  textures: ReturnType<typeof planMtlTextures>
}
export interface ObjAppearancePlan {
  materials: ObjAppearanceMaterial[]
  geometry: ObjGeometryMaterials
  needsDefault: boolean
  references: ObjRasterReference[]
}

export function readObjAppearanceOptions(options: ObjAppearanceOptions) {
  requireObj(
    options !== null && typeof options === 'object' && !Array.isArray(options),
    'options',
    'Escolha opções de aparência OBJ.',
  )
  for (const key of Object.keys(options))
    requireObj(
      key === 'base' || key === 'textures',
      `options.${key}`,
      'Esta opção de aparência não é conhecida.',
    )
  return {
    base: objOptionGroup('base', () => readMtlBaseOptions(options.base)),
    textures: objOptionGroup('textures', () => readMtlTexturePolicy(options.textures)),
  }
}

/** Compose a complete bundle and its immutable selection, before raster bytes or coordinates are read. */
export function planObjAppearance(
  bundle: Extract<ObjBundleRead, { status: 'ready' }>,
  selection: ObjMaterialSelection,
  options: ObjAppearanceOptions,
): ObjAppearancePlan {
  const { base: basePolicy, textures: texturePolicy } = readObjAppearanceOptions(options),
    effectiveByMaterial = new WeakMap<MtlMaterial, MtlEffectiveProperties>(),
    materials: ObjAppearanceMaterial[] = [],
    references: ObjRasterReference[] = [],
    uvTransforms = new Map<string, ObjUvTransform>(),
    referenced = new Set<string>()
  for (const selected of selection.materials) {
    const library = bundle.libraries[selected.library]!,
      material = library.source.materials[selected.material]!
    try {
      let effective = effectiveByMaterial.get(material)
      if (!effective) {
        effective = selectMtlProperties(material, basePolicy.repeatedProperties)
        effectiveByMaterial.set(material, effective)
      }
      const mapIndices = effective.indices.filter(
          (index) => material.properties[index]!.kind === 'map',
        ),
        textures = planMtlTextures(material, { mapIndices }, selected.useUvTextures, texturePolicy),
        base = planSelectedMtlBase(material, effective, basePolicy, {
          roughness: textures.maps.some((map) => map.role === 'roughness'),
          metalness: textures.maps.some((map) => map.role === 'metalness'),
        })
      materials.push({ ...selected, base, textures })
      if (textures.uv)
        uvTransforms.set(selected.id, {
          offset: [...textures.uv.offset],
          scale: [...textures.uv.scale],
        })
      for (const map of textures.maps) {
        const key = `${selected.library}:${selected.material}:${map.property}`
        if (referenced.has(key)) continue
        referenced.add(key)
        references.push({
          library: selected.library,
          material: selected.material,
          property: map.property,
        })
      }
    } catch (error) {
      if (!(error instanceof ObjInputError)) throw error
      throw new ObjInputError(
        error.reason,
        `files[${JSON.stringify(library.path)}].${error.path}`,
        error.message,
        { cause: error },
      )
    }
  }
  return {
    materials,
    needsDefault: selection.needsDefault,
    references,
    geometry: {
      defaultId: selection.geometry.defaultId,
      byFace: new Map(selection.geometry.byFace),
      uvTransforms,
    },
  }
}
