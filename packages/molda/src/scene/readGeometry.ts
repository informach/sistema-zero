/** Strict geometry parser shared by document and worker boundaries. Material links are checked by the document index. */
import type { ShapeFaceId, Vec3 } from '../core/model'
import { FACES_BY_SHAPE } from '../model/shapes'
import type {
  SceneGeometry,
  SceneMeshFace,
  ScenePathGeometry,
  ScenePrimitiveGeometry,
  SceneUvTransform,
  Vec2,
} from './document'
import { SCENE_LIMITS } from './limits'
import { pathTriangleCount, readPathParameters } from './pathParameters'
import { primitiveTriangleCount, readPrimitiveDetail } from './primitiveDetail'
import * as v from './validation'

export interface SceneGeometryReadBudget {
  vertices: number
  triangles: number
  edges: number
}

function materialLink(raw: Record<string, unknown>, path: string): { materialId?: string } {
  return raw.materialId === undefined
    ? {}
    : { materialId: v.id(raw.materialId, `${path}.materialId`) }
}

function uv(raw: unknown, path: string): SceneUvTransform {
  const row = v.record(raw, path, ['origin', 'u', 'v'])
  return {
    origin: v.tuple(row.origin, 2, `${path}.origin`) as Vec2,
    u: v.tuple(row.u, 2, `${path}.u`) as Vec2,
    v: v.tuple(row.v, 2, `${path}.v`) as Vec2,
  }
}

export function readSceneGeometry(
  raw: unknown,
  path = 'geometry',
  budget: SceneGeometryReadBudget = { vertices: 0, triangles: 0, edges: 0 },
): SceneGeometry {
  const kind = v.choice(
    v.record(raw, path).kind,
    ['box', 'wedge', 'cylinder', 'sphere', 'mesh', 'path'],
    `${path}.kind`,
  )
  const row = v.record(raw, path, [
    'id',
    'kind',
    ...(kind === 'mesh'
      ? ['vertices', 'faces', 'looseEdges']
      : kind === 'path'
        ? ['points', 'radius', 'around', 'endCaps', 'closed', 'surfaces']
        : ['from', 'to', 'surfaces']),
    ...(kind === 'cylinder' || kind === 'sphere' ? ['tessellation'] : []),
  ])
  const id = v.id(row.id, `${path}.id`)
  if (kind === 'path') {
    const result: ScenePathGeometry = {
      id,
      kind,
      ...readPathParameters({
        points: row.points,
        radius: row.radius,
        around: row.around,
        endCaps: row.endCaps,
        closed: row.closed,
      }),
      surfaces: readSurfaces(row.surfaces, path, ['side', 'top', 'bottom']),
    }
    budget.triangles += pathTriangleCount(result.points.length, result)
    budget.vertices += result.points.length
    v.requireScene(budget.vertices <= SCENE_LIMITS.vertices, path, 'Vértices fora do orçamento.')
    v.requireScene(budget.triangles <= SCENE_LIMITS.triangles, path, 'Geometria fora do orçamento.')
    return result
  }
  if (kind !== 'mesh') {
    const from = v.tuple(row.from, 3, `${path}.from`) as Vec3
    const to = v.tuple(row.to, 3, `${path}.to`) as Vec3
    v.requireScene(
      from.every((value, axis) => value < (to[axis] as number)),
      path,
      'Dimensões da forma inválidas.',
    )
    const base = {
      id,
      from,
      to,
      surfaces: readSurfaces(row.surfaces, path, FACES_BY_SHAPE[kind]),
    }
    const primitive: ScenePrimitiveGeometry =
      kind === 'cylinder'
        ? {
            ...base,
            kind,
            ...(row.tessellation === undefined
              ? {}
              : { tessellation: readPrimitiveDetail('cylinder', row.tessellation) }),
          }
        : kind === 'sphere'
          ? {
              ...base,
              kind,
              ...(row.tessellation === undefined
                ? {}
                : { tessellation: readPrimitiveDetail('sphere', row.tessellation) }),
            }
          : { ...base, kind }
    budget.triangles += primitiveTriangleCount(primitive)
    v.requireScene(budget.triangles <= SCENE_LIMITS.triangles, path, 'Geometria fora do orçamento.')
    return primitive
  }
  const vertices = v.record(row.vertices, `${path}.vertices`)
  budget.vertices += Object.keys(vertices).length
  v.requireScene(budget.vertices <= SCENE_LIMITS.vertices, path, 'Vértices fora do orçamento.')
  const faces = v.record(row.faces, `${path}.faces`)
  v.requireScene(
    Object.keys(faces).length <= SCENE_LIMITS.triangles - budget.triangles,
    path,
    'Faces fora do orçamento.',
  )
  const parsedFaces = Object.fromEntries(
    Object.entries(faces).map(([faceId, raw]): [string, SceneMeshFace] => {
      const facePath = `${path}.faces.${v.id(faceId, path)}`
      const face = v.record(raw, facePath, ['corners', 'materialId'])
      const corners = v.list(face.corners, `${facePath}.corners`, SCENE_LIMITS.faceCorners)
      v.requireScene(corners.length >= 3, facePath, 'A face precisa de pelo menos três cantos.')
      budget.triangles += corners.length - 2
      v.requireScene(
        budget.triangles <= SCENE_LIMITS.triangles,
        path,
        'Triângulos fora do orçamento.',
      )
      const parsed = corners.map((raw, i) => {
        const cornerPath = `${facePath}.corners[${i}]`
        const corner = v.record(raw, cornerPath, ['vertexId', 'uv'])
        const vertexId = v.id(corner.vertexId, `${cornerPath}.vertexId`)
        v.requireScene(Object.hasOwn(vertices, vertexId), cornerPath, 'Vértice ausente.')
        return {
          vertexId,
          uv: v.tuple(corner.uv, 2, `${cornerPath}.uv`) as Vec2,
        }
      })
      v.requireScene(
        new Set(parsed.map((corner) => corner.vertexId)).size === parsed.length,
        facePath,
        'Vértice repetido na face.',
      )
      return [faceId, { corners: parsed, ...materialLink(face, facePath) }]
    }),
  )
  const edges = v.list(row.looseEdges, `${path}.looseEdges`, SCENE_LIMITS.looseEdges - budget.edges)
  budget.edges += edges.length
  return {
    id,
    kind,
    faces: parsedFaces,
    vertices: Object.fromEntries(
      Object.entries(vertices).map(([id, point]) => [
        v.id(id, path),
        v.tuple(point, 3, `${path}.vertices.${id}`) as Vec3,
      ]),
    ),
    looseEdges: edges.map((edge, i) => {
      const pair = v.list(edge, `${path}.looseEdges[${i}]`, 2)
      v.requireScene(pair.length === 2, path, 'A aresta precisa de dois vértices.')
      const a = v.id(pair[0], path)
      const b = v.id(pair[1], path)
      v.requireScene(
        a !== b && Object.hasOwn(vertices, a) && Object.hasOwn(vertices, b),
        path,
        'Aresta inválida.',
      )
      return [a, b]
    }),
  }
}

function readSurfaces(raw: unknown, path: string, allowed: readonly string[]) {
  const surfaces = v.record(raw, `${path}.surfaces`, allowed)
  return Object.fromEntries(
    Object.entries(surfaces).map(([face, value]) => {
      const surfacePath = `${path}.surfaces.${face}`
      const surface = v.record(value, surfacePath, ['materialId', 'uv'])
      return [
        face as ShapeFaceId,
        { ...materialLink(surface, surfacePath), uv: uv(surface.uv, `${surfacePath}.uv`) },
      ]
    }),
  )
}
