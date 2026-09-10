import type { SceneImage, SceneMaterial } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import { nativeImportName } from './nativeImportName'
import type { ObjAppearancePlan } from './objAppearance'
import type { ObjBundleRead } from './objBundle'
import type { ObjGeometryMaterials } from './objGeometryPlan'
import { objBudget } from './objInput'
import {
  type ObjMaterialConversionOptions,
  type ObjMaterialIssue,
  readObjMaterialConversionOptions,
} from './objMaterialConversionTypes'
import { type ObjMaterialMap, planObjMaterialImages } from './objMaterialImages'
import { objResourcePath } from './objResourcePath'
import type { RasterBatch } from './rasterBatch'

export interface ObjNativeMaterials {
  materials: SceneMaterial[]
  images: SceneImage[]
  geometry: ObjGeometryMaterials
  /** Materialization report; the caller must ALSO retain selection/base/map/geometry reports. */
  issues: ObjMaterialIssue[]
  pixelBytes: number
}

/** Consume the same complete immutable bundle, appearance plan and decoded selection. No IO or adoption. */
export function convertObjMaterials(
  bundle: Extract<ObjBundleRead, { status: 'ready' }>,
  appearance: ObjAppearancePlan,
  decoded: RasterBatch<string>,
  options: ObjMaterialConversionOptions,
  /** Trusted synchronous composition sink; must not mutate staged inputs. Called before pixel bake. */
  onIssue?: (issue: ObjMaterialIssue) => void,
): ObjNativeMaterials {
  const policy = readObjMaterialConversionOptions(options)
  objBudget(
    appearance.materials.length + (appearance.needsDefault ? 1 : 0),
    SCENE_LIMITS.materials,
    'materials',
  )
  const issues: ObjMaterialIssue[] = []
  function issue(value: ObjMaterialIssue) {
    onIssue?.(value)
    issues.push(value)
  }
  const images = planObjMaterialImages(decoded, issue, policy),
    materials = appearance.materials.map((selected): SceneMaterial => {
      const library = bundle.libraries[selected.library]!,
        input = library.source.materials[selected.material]!,
        at = `files[${JSON.stringify(library.path)}].lines[${input.line}]`,
        { name, change } = nativeImportName(input.name, `Material ${selected.material + 1}`),
        { base, id } = selected,
        native: SceneMaterial = {
          id,
          name,
          baseColor: { kind: 'rgba', value: [...base.baseColor] },
          roughness: base.roughness,
          metalness: base.metalness,
          doubleSided: policy.doubleSided,
        },
        maps = new Map(
          selected.textures.maps.map((map) => {
            const path = `files[${JSON.stringify(library.path)}].lines[${map.line}]`,
              resolved: ObjMaterialMap = {
                map,
                at: path,
                path: objResourcePath(map.filename, library.path, path),
              }
            return [map.role, resolved]
          }),
        )
      if (change) issue({ code: change, path: at, targetId: id })
      issue({
        code: 'surface-sidedness-assumed',
        path: at,
        targetId: id,
        doubleSided: policy.doubleSided,
      })
      const color = maps.get('color'),
        opacity = maps.get('opacity')
      if (color || opacity) {
        native.colorImageId = images.color(
          color ?? null,
          opacity ?? null,
          [...base.linearColor, base.baseColor[3]],
          id,
        )
        // Native base is UNDER paint, not a multiplier. Even opacity-only maps need a transparent base.
        native.baseColor = { kind: 'rgba', value: [0, 0, 0, 0] }
      }
      for (const role of ['roughness', 'metalness', 'normal'] as const) {
        const map = maps.get(role)
        if (!map) continue
        const imageId = images.data(map)
        if (role === 'roughness') native.roughnessImageId = imageId
        else if (role === 'metalness') native.metalnessImageId = imageId
        else if (map.map.sample.kind === 'normal') {
          native.normalImageId = imageId
          native.normalStrength = map.map.sample.strength
          // OBJ UV is already upward; source negative-Y needs inversion in the native tangent frame.
          native.normalFlipY = policy.normalY === 'negative'
          issue({
            code: 'normal-y-interpreted',
            path: map.at,
            targetId: id,
            source: policy.normalY,
            flipY: native.normalFlipY,
          })
        }
      }
      return native
    })
  if (appearance.needsDefault)
    materials.push({
      id: appearance.geometry.defaultId,
      name: 'Material padrão',
      baseColor: { kind: 'rgba', value: [1, 1, 1, 1] },
      roughness: 1,
      metalness: 0,
      doubleSided: policy.doubleSided,
    })
  return {
    materials,
    ...images.materialize(),
    issues,
    geometry: {
      defaultId: appearance.geometry.defaultId,
      byFace: new Map(appearance.geometry.byFace),
      uvTransforms: new Map(
        Array.from(appearance.geometry.uvTransforms ?? [], ([id, uv]) => [
          id,
          { offset: [...uv.offset], scale: [...uv.scale] },
        ]),
      ),
    },
  }
}
