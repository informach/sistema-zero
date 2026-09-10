import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { duplicateSceneAnimationTargets } from './animationTargets'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import type { MoldaSceneDocument, SceneMeshGeometry, ScenePathGeometry } from './document'
import { meshComponentEdges } from './meshComponents'
import { PATH_LIMITS, readPathParameters } from './pathParameters'
import { record, requireScene, text } from './validation'

export type ScenePathSettings = Pick<ScenePathGeometry, 'radius' | 'around' | 'endCaps' | 'closed'>

/** Traverse a single chain independently of selection order; a closed loop needs explicit consent, and forks are refused. */
export function meshPathPoints(
  mesh: SceneMeshGeometry,
  edgeIds: readonly string[],
  allowClosed = false,
): ScenePathGeometry['points'] {
  const chosen = [...new Set(edgeIds)]
  requireScene(
    chosen.length > 0 && chosen.length <= PATH_LIMITS.points - (allowClosed ? 0 : 1),
    'edges',
    'Escolha de 1 a 127 linhas ligadas para criar o caminho.',
  )
  const edges = meshComponentEdges(mesh)
  const adjacent = new Map<string, string[]>()
  for (const id of chosen) {
    const edge = edges.get(id)
    requireScene(edge, 'edges', 'Essa linha não existe mais. Escolha o caminho novamente.')
    for (const [a, b] of [edge, [edge[1], edge[0]]] as const) {
      const neighbors = adjacent.get(a) ?? []
      neighbors.push(b)
      adjacent.set(a, neighbors)
      requireScene(neighbors.length <= 2, 'edges', 'Escolha um caminho sem bifurcações.')
    }
  }
  const ends = [...adjacent]
    .filter(([, neighbors]) => neighbors.length === 1)
    .map(([id]) => id)
    .sort()
  requireScene(
    ends.length === 2 || (allowClosed && ends.length === 0),
    'edges',
    'Para unir linhas em laço, marque Caminho fechado.',
  )
  const seen = new Set<string>()
  const points: ScenePathGeometry['points'] = []
  let current: string | undefined = ends[0] ?? [...adjacent.keys()].sort()[0]
  while (current !== undefined) {
    seen.add(current)
    const point = mesh.vertices[current]
    requireScene(
      Object.hasOwn(mesh.vertices, current) && point,
      'points',
      'Ponto ausente no caminho.',
    )
    points.push({ id: current, position: [...point] })
    current = adjacent
      .get(current)
      ?.slice()
      .sort()
      .find((id) => !seen.has(id))
  }
  requireScene(
    seen.size === adjacent.size,
    'edges',
    'Todas as linhas escolhidas precisam formar um único caminho.',
  )
  return points
}

/** Copy the chosen chain into its own parametric piece, retaining the source and its local parent/transform. */
export function createScenePath(
  document: MoldaSceneDocument,
  nodeId: string,
  edgeIds: readonly string[],
  settings: ScenePathSettings,
  name: string,
  nextId: () => string = newId,
) {
  const selected = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selected)
  const node = selected.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha as linhas de uma peça para criar o tubo.')
  const mesh = selected.index.geometries.get(node.geometryId)
  requireScene(
    mesh?.kind === 'mesh',
    'geometry',
    'Transforme a forma em malha para escolher suas linhas.',
  )
  record(settings, 'settings', ['radius', 'around', 'endCaps', 'closed'])
  const parameters = readPathParameters({
    ...settings,
    points: meshPathPoints(mesh, edgeIds, settings.closed === true),
  })
  const validName = text(name, 'name', 48)
  const allocate = allocateSceneId(document, nextId)
  const geometryId = allocate()
  const pathNodeId = allocate()
  const path: ScenePathGeometry = { id: geometryId, kind: 'path', ...parameters, surfaces: {} }
  return finishSceneCommand({
    ...document,
    geometries: [...document.geometries, path],
    nodes: [...document.nodes, { ...node, id: pathNodeId, geometryId, name: validName }],
    ...duplicateSceneAnimationTargets(document, new Map([[nodeId, pathNodeId]])),
  })
}

/** Adjust radius/divisions/caps or a control point without rebuilding editable GPU data. */
export function editScenePath(
  document: MoldaSceneDocument,
  nodeId: string,
  change: ScenePathSettings | { point: string; position: Vec3 },
  nextId: () => string = newId,
) {
  const selected = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selected)
  const node = selected.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha um tubo para ajustar.')
  const path = selected.index.geometries.get(node.geometryId)
  requireScene(path?.kind === 'path', 'geometry', 'Essa peça não é mais um caminho editável.')
  record(change, 'change')
  record(
    change,
    'change',
    'point' in change ? ['point', 'position'] : ['radius', 'around', 'endCaps', 'closed'],
  )
  let points = path.points
  if ('point' in change) {
    requireScene(
      points.some((p) => p.id === change.point),
      'point',
      'Esse ponto não existe mais. Escolha outro ponto do caminho.',
    )
    points = points.map((p) => (p.id === change.point ? { ...p, position: change.position } : p))
  }
  const parameters = readPathParameters(
    'point' in change ? { ...path, points } : { ...path, ...change },
  )
  const samePoints = parameters.points.every(
    (p, i) =>
      p.id === path.points[i]!.id &&
      p.position.every((v, axis) => v === path.points[i]!.position[axis]),
  )
  if (
    parameters.radius === path.radius &&
    parameters.around === path.around &&
    parameters.endCaps === path.endCaps &&
    (parameters.closed ?? false) === (path.closed ?? false) &&
    samePoints
  )
    return document
  const shared = document.nodes.some(
    (n) => n.kind === 'mesh' && n.id !== nodeId && n.geometryId === path.id,
  )
  const id = shared ? allocateSceneId(document, nextId)() : path.id
  const result: ScenePathGeometry = {
    ...path,
    ...parameters,
    id,
    points: samePoints
      ? path.points
      : parameters.points.map((p, i) =>
          p.id === path.points[i]!.id &&
          p.position.every((v, axis) => v === path.points[i]!.position[axis])
            ? path.points[i]!
            : p,
        ),
  }
  return finishSceneCommand({
    ...document,
    geometries: shared
      ? [...document.geometries, result]
      : document.geometries.map((g) => (g.id === path.id ? result : g)),
    nodes: shared
      ? document.nodes.map((n) => (n.id === nodeId ? { ...node, geometryId: id } : n))
      : document.nodes,
  })
}
