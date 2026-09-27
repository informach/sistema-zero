import { SCENE_LIMITS } from '../scene/limits'
import { id, record, SceneValidationError, tuple } from '../scene/validation'
import { ObjInputError, objBudget, requireObj } from './objInput'

export interface ObjUvTransform {
  offset: [number, number]
  scale: [number, number]
}

/** Material bindings form an input boundary. Snapshot transforms before coordinates are read. */
export function readObjUvTransforms(
  value: ReadonlyMap<string, ObjUvTransform> | undefined,
  materialIds: ReadonlySet<string>,
): Map<string, ObjUvTransform> {
  const result = new Map<string, ObjUvTransform>(),
    path = 'materials.uvTransforms'
  if (value === undefined) return result
  requireObj(value instanceof Map, path, 'Esperava um mapa de transformações por material.')
  objBudget(value.size, SCENE_LIMITS.materials, path)
  for (const [key, transform] of value) {
    const at = `${path}.${key}`
    try {
      id(key, at)
      requireObj(
        materialIds.has(key),
        at,
        'A transformação aponta para um material sem vínculo nesta geometria.',
      )
      const source = record(transform, at, ['offset', 'scale']),
        offset = tuple(source.offset, 2, `${at}.offset`),
        scale = tuple(source.scale, 2, `${at}.scale`)
      result.set(key, { offset: [offset[0]!, offset[1]!], scale: [scale[0]!, scale[1]!] })
    } catch (error) {
      if (!(error instanceof SceneValidationError)) throw error
      throw new ObjInputError('invalid', error.path, error.message, { cause: error })
    }
  }
  return result
}

/** OBJ and native V both run upward; apply the authored texture transform without wrapping. */
export function objNativeUv(
  u: number,
  v: number,
  transform: ObjUvTransform,
  path = 'uv',
): [number, number] {
  const result: [number, number] = [
    u * transform.scale[0] + transform.offset[0],
    v * transform.scale[1] + transform.offset[1],
  ]
  if (!result.every(Number.isFinite))
    throw new ObjInputError(
      'unsupported',
      path,
      'A transformação de textura excede o intervalo numérico; ela não foi recortada.',
    )
  return result
}
