import { SCENE_LIMITS } from '../scene/limits'
import { MTL_TEXTURE_ROLES } from './mtlTexturePlanTypes'
import type { ObjBundleRead } from './objBundle'
import { ObjInputError, objBudget, requireObj } from './objInput'
import { objResourcePath } from './objResourcePath'
import { decodeRasterBatch, type RasterSource } from './rasterBatch'
import { RasterInputError } from './rasterInput'

export interface ObjRasterReference {
  library: number
  material: number
  /** Retained source map property, not the index of a map within a filtered list. */
  property: number
}
function index(value: number, size: number, path: string) {
  requireObj(
    Number.isSafeInteger(value) && value >= 0 && value < size,
    path,
    'A referência precisa apontar para um item da fonte.',
  )
  return value
}

/** Only references retained by material/map planning. Complete bundle is private and immutable. No IO. */
export function decodeObjRasters(
  bundle: Extract<ObjBundleRead, { status: 'ready' }>,
  references: readonly ObjRasterReference[],
) {
  requireObj(
    Array.isArray(references),
    'images.references',
    'Esperava uma lista de mapas selecionados.',
  )
  objBudget(
    references.length,
    SCENE_LIMITS.materials * MTL_TEXTURE_ROLES.length,
    'images.references',
  )
  function* sources(): Generator<RasterSource<string>> {
    const paths = new Set<string>()
    for (let i = 0; i < references.length; i++) {
      const reference = references[i],
        at = `images.references[${i}]`
      requireObj(
        reference !== null && typeof reference === 'object' && !Array.isArray(reference),
        at,
        'Esperava uma referência de mapa.',
      )
      for (const key of Object.keys(reference))
        requireObj(
          key === 'library' || key === 'material' || key === 'property',
          `${at}.${key}`,
          'Este campo de referência não é conhecido.',
        )
      const library =
          bundle.libraries[index(reference.library, bundle.libraries.length, `${at}.library`)]!,
        material =
          library.source.materials[
            index(reference.material, library.source.materials.length, `${at}.material`)
          ]!,
        property =
          material.properties[
            index(reference.property, material.properties.length, `${at}.property`)
          ]!
      requireObj(
        property.kind === 'map',
        `${at}.property`,
        'A referência selecionada precisa ser um mapa de textura.',
      )
      const path = objResourcePath(
        property.value.filename,
        library.path,
        `files[${JSON.stringify(library.path)}].lines[${property.line}]`,
      )
      if (paths.has(path)) continue
      const bytes = bundle.resources.get(path)
      requireObj(
        bytes !== undefined,
        `files[${JSON.stringify(path)}]`,
        'O recurso selecionado não está no conjunto completo.',
      )
      paths.add(path)
      yield { key: path, path: `files[${JSON.stringify(path)}]`, bytes }
    }
  }
  try {
    return decodeRasterBatch(sources())
  } catch (error) {
    if (!(error instanceof RasterInputError)) throw error
    throw new ObjInputError(error.reason, error.path, error.message, { cause: error })
  }
}
