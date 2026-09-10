import { SCENE_LIMITS } from '../scene/limits'
import { id, SceneValidationError } from '../scene/validation'
import type { ObjDocument } from './objDocument'
import { ObjInputError, objBudget, requireObj } from './objInput'
import { type ObjUvTransform, readObjUvTransforms } from './objUvTransform'

export interface ObjGeometryMaterials {
  defaultId: string
  /** Native material per SOURCE ELEMENT index. A later MTL stage may vary by face UV availability. */
  byFace?: ReadonlyMap<number, string>
  /** One shared surface-map transform per material, applied before native V inversion. */
  uvTransforms?: ReadonlyMap<string, ObjUvTransform>
}
export interface ObjGeometryElementPlan {
  index: number
  count: number
  closingCorners: number
  materialId: string | null
  uvTransform: ObjUvTransform | null
}
export interface ObjGeometryPlan {
  /** Null is a separate construction part for globally unreferenced positions. */
  objectLine: number | null
  geometryId: string
  path: string
  vertices: number[]
  elements: ObjGeometryElementPlan[]
  cost: { vertices: number; triangles: number; looseEdges: number }
}

function materialId(value: string, path: string) {
  try {
    return id(value, path)
  } catch (error) {
    if (!(error instanceof SceneValidationError)) throw error
    throw new ObjInputError('invalid', path, error.message)
  }
}

/** Validated immutable source; only material bindings form a new input boundary here. */
export function planObjGeometries(
  source: ObjDocument,
  materials: ObjGeometryMaterials,
): ObjGeometryPlan[] {
  const defaultId = materialId(materials.defaultId, 'materials.defaultId'),
    bindings = new Map<number, string>(),
    materialIds = new Set([defaultId])
  objBudget(materials.byFace?.size ?? 0, source.elements.length, 'materials.byFace')
  for (const [index, value] of materials.byFace ?? []) {
    const path = `materials.byFace[${index}]`
    requireObj(
      Number.isSafeInteger(index) &&
        index >= 0 &&
        index < source.elements.length &&
        source.elements[index]!.kind === 'face',
      path,
      'O vínculo precisa apontar para uma face da fonte.',
    )
    const converted = materialId(value, path)
    bindings.set(index, converted)
    materialIds.add(converted)
    objBudget(materialIds.size, SCENE_LIMITS.materials, 'materials')
  }
  const uvTransforms = readObjUvTransforms(materials.uvTransforms, materialIds),
    positionCount = source.positions.length / 4
  // Every source position survives, so this is a lower bound even before per-object duplication.
  objBudget(positionCount, SCENE_LIMITS.vertices, 'vertices')
  const used = new Uint8Array(positionCount),
    parts = new Map<number, { plan: ObjGeometryPlan; vertices: Set<number> }>()
  let vertexCount = 0,
    triangles = 0,
    edges = 0
  for (let index = 0; index < source.elements.length; index++) {
    const element = source.elements[index]!,
      state = source.states[element.state]!,
      path = `lines[${element.line}]`
    let part = parts.get(state.objectLine)
    if (!part) {
      objBudget(parts.size + 1, SCENE_LIMITS.geometries, path)
      part = {
        plan: {
          objectLine: state.objectLine,
          geometryId: `obj_geometry_${state.objectLine}`,
          path: state.objectLine ? `lines[${state.objectLine}]` : 'objects.default',
          vertices: [],
          elements: [],
          cost: { vertices: 0, triangles: 0, looseEdges: 0 },
        },
        vertices: new Set(),
      }
      parts.set(state.objectLine, part)
    }
    let count = element.count,
      convertedMaterial: string | null = null,
      uvTransform: ObjUvTransform | null = null,
      elementEdges = 0
    if (element.kind === 'face') {
      const first = element.offset * 3
      while (count > 3) {
        const last = (element.offset + count - 1) * 3
        if (
          [0, 1, 2].some((field) => source.corners[first + field] !== source.corners[last + field])
        )
          break
        count--
      }
      if (count > SCENE_LIMITS.faceCorners)
        throw new ObjInputError(
          'unsupported',
          path,
          'Esta face tem cantos demais para editar sem dividi-la. A fonte foi preservada.',
        )
      const distinct = new Set<number>()
      for (let corner = 0; corner < count; corner++) {
        const vertex = source.corners[(element.offset + corner) * 3]!
        if (distinct.has(vertex))
          throw new ObjInputError(
            'unsupported',
            path,
            'Esta face repete pontos além de um fechamento simples. Ela não foi descartada ou soldada.',
          )
        distinct.add(vertex)
      }
      triangles += count - 2
      objBudget(triangles, SCENE_LIMITS.triangles, path)
      part.plan.cost.triangles += count - 2
      convertedMaterial = bindings.get(index) ?? null
      requireObj(
        convertedMaterial !== null || state.material === null,
        `${path}.material`,
        'Falta o vínculo do material desta face.',
      )
      convertedMaterial ??= defaultId
      uvTransform = uvTransforms.get(convertedMaterial) ?? null
      requireObj(
        uvTransform === null || element.hasUv,
        `${path}.uv`,
        'Uma transformação de textura exige UV em todos os cantos. Use a variante sem textura nesta face.',
      )
    } else if (element.kind === 'line') {
      for (let corner = 1; corner < count; corner++)
        if (
          source.corners[(element.offset + corner - 1) * 3] !==
          source.corners[(element.offset + corner) * 3]
        )
          elementEdges++
      edges += elementEdges
      objBudget(edges, SCENE_LIMITS.looseEdges, path)
      part.plan.cost.looseEdges += elementEdges
    }
    for (let corner = 0; corner < count; corner++) {
      const vertex = source.corners[(element.offset + corner) * 3]!
      used[vertex] = 1
      if (!part.vertices.has(vertex)) {
        objBudget(++vertexCount, SCENE_LIMITS.vertices, path)
        part.vertices.add(vertex)
      }
    }
    part.plan.elements.push({
      index,
      count,
      closingCorners: element.count - count,
      materialId: convertedMaterial,
      uvTransform,
    })
  }
  const unused: number[] = []
  for (let vertex = 0; vertex < positionCount; vertex++)
    if (!used[vertex]) {
      objBudget(++vertexCount, SCENE_LIMITS.vertices, 'vertices.unused')
      unused.push(vertex)
    }
  objBudget(parts.size + Number(unused.length > 0), SCENE_LIMITS.geometries, 'geometries')
  const plans = [...parts.values()].map(({ plan, vertices }) => ({
    ...plan,
    vertices: [...vertices].sort((a, b) => a - b),
    cost: { ...plan.cost, vertices: vertices.size },
  }))
  if (unused.length)
    plans.push({
      objectLine: null,
      geometryId: 'obj_geometry_unused',
      path: 'vertices.unused',
      vertices: unused,
      elements: [],
      cost: { vertices: unused.length, triangles: 0, looseEdges: 0 },
    })
  return plans
}
