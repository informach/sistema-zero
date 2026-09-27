/** Authoring commands consume a validated revision and return one immutable revision. */
import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import { firstPaintableIndex } from '../core/palette'
import { resolvePaletteColors } from '../core/sanitize'
import { requireSceneAnimationReparent } from './animationIndex'
import { duplicateSceneAnimationTargets } from './animationTargets'
import { sceneBounds } from './bounds'
import {
  allocateSceneId as allocateId,
  requireEditableScene as editable,
  finishSceneCommand as finish,
  sceneCommandSelection as selection,
} from './commandContext'
import type {
  ModelSceneNode,
  MoldaSceneDocument,
  SceneGeometry,
  SceneMeshGeometry,
  SceneMirror,
  ScenePrimitiveGeometry,
} from './document'
import { indexSceneDocument } from './documentIndex'
import { reparentPreservingWorld } from './graph'
import { SCENE_MATERIAL_IMAGE_KEYS, sceneMaterialImageIds } from './materialImages'
import {
  type AffineMatrix,
  affineInverse,
  affineMultiply,
  composeTransform,
  identityMatrix,
  transformPoint,
} from './matrix'
import { parametricMesh } from './parametricGeometry'
import { primitiveDetail, readPrimitiveDetail } from './primitiveDetail'
import { duplicateSceneSkinTargets } from './skinTargets'
import { triangulateFace } from './triangulate'
import { boolean, choice, number, requireScene, text, tuple } from './validation'

export type SceneIdFactory = () => string

export function addSceneBox(
  document: MoldaSceneDocument,
  name: string,
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  return addScenePrimitive(document, 'box', name, nextId)
}

export function addScenePrimitive(
  document: MoldaSceneDocument,
  kind: ScenePrimitiveGeometry['kind'],
  name: string,
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  choice(kind, ['box', 'wedge', 'cylinder', 'sphere'], 'kind')
  const allocate = allocateId(document, nextId)
  const nodeId = allocate()
  const geometryId = allocate()
  const materialId = allocate()
  const colors = resolvePaletteColors(document)
  const color = colors[8] ? 8 : firstPaintableIndex(colors)
  const validName = text(name, 'name', 48)
  return finish({
    ...document,
    nodes: [
      ...document.nodes,
      {
        id: nodeId,
        kind: 'mesh',
        name: validName,
        parentId: null,
        geometryId,
        materialId,
        hidden: false,
        locked: false,
        transform: {
          kind: 'trs',
          translation: [0, 1, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      },
    ],
    geometries: [
      ...document.geometries,
      { id: geometryId, kind, from: [-1, -1, -1], to: [1, 1, 1], surfaces: {} },
    ],
    materials: [
      ...document.materials,
      {
        id: materialId,
        name: validName,
        baseColor: { kind: 'palette', index: color },
        roughness: 1,
        metalness: 0,
        doubleSided: false,
      },
    ],
  })
}

export function addSceneLocator(
  document: MoldaSceneDocument,
  name: string,
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  return finish({
    ...document,
    nodes: [
      ...document.nodes,
      {
        id: allocateId(document, nextId)(),
        kind: 'locator',
        name: text(name, 'name', 48),
        parentId: null,
        hidden: false,
        locked: false,
        transform: {
          kind: 'trs',
          translation: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        },
      },
    ],
  })
}

/** Change local dimensions while preserving origin, surface bindings and other geometry users. */
export function resizeScenePrimitive(
  document: MoldaSceneDocument,
  nodeId: string,
  dimensions: Vec3,
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  tuple(dimensions, 3, 'dimensions')
  requireScene(
    dimensions.every((value) => value > 0),
    'dimensions',
    'Use medidas maiores que zero.',
  )
  const selected = selection(document, [nodeId])
  editable(selected)
  const node = selected.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma forma para mudar as medidas.')
  const geometry = selected.index.geometries.get(node.geometryId)
  requireScene(
    geometry && geometry.kind !== 'mesh' && geometry.kind !== 'path',
    'geometry',
    'Essa peça já tem pontos editáveis.',
  )
  if (
    dimensions.every(
      (value, axis) => value === (geometry.to[axis] ?? 0) - (geometry.from[axis] ?? 0),
    )
  )
    return document
  const shared = document.nodes.some(
    (other) => other.id !== nodeId && other.kind === 'mesh' && other.geometryId === node.geometryId,
  )
  const id = shared ? allocateId(document, nextId)() : geometry.id
  const from: Vec3 = [0, 0, 0]
  const to: Vec3 = [0, 0, 0]
  for (let axis = 0; axis < 3; axis++) {
    const center = (geometry.from[axis] ?? 0) / 2 + (geometry.to[axis] ?? 0) / 2
    const half = (dimensions[axis] ?? 0) / 2
    from[axis] = center - half
    to[axis] = center + half
    requireScene(
      from[axis] !== to[axis],
      'dimensions',
      'Essas medidas ultrapassam a precisão da peça.',
    )
  }
  const resized: ScenePrimitiveGeometry = { ...geometry, id, from, to }
  return finish({
    ...document,
    geometries: shared
      ? [...document.geometries, resized]
      : document.geometries.map((entry) => (entry.id === id ? resized : entry)),
    nodes: shared
      ? document.nodes.map((entry) => (entry.id === nodeId ? { ...node, geometryId: id } : entry))
      : document.nodes,
  })
}

/** Detail is authorial, shared by all render/export paths, and isolated from unselected geometry users. */
export function setScenePrimitiveDetail(
  document: MoldaSceneDocument,
  nodeId: string,
  detail: { around: number; down?: number },
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  const selected = selection(document, [nodeId])
  editable(selected)
  const node = selected.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma forma curva para mudar os detalhes.')
  const geometry = selected.index.geometries.get(node.geometryId)
  requireScene(
    geometry?.kind === 'cylinder' || geometry?.kind === 'sphere',
    'geometry',
    'Esse ajuste é para cilindros e esferas que ainda são formas.',
  )
  const changed =
    geometry.kind === 'cylinder'
      ? { ...geometry, tessellation: readPrimitiveDetail('cylinder', detail) }
      : { ...geometry, tessellation: readPrimitiveDetail('sphere', detail) }
  const before = primitiveDetail(geometry)
  const after = primitiveDetail(changed)
  if (before.around === after.around && before.down === after.down) return document
  const shared = document.nodes.some(
    (other) => other.id !== nodeId && other.kind === 'mesh' && other.geometryId === node.geometryId,
  )
  const id = shared ? allocateId(document, nextId)() : geometry.id
  const result = { ...changed, id }
  return finish({
    ...document,
    geometries: shared
      ? [...document.geometries, result]
      : document.geometries.map((g) => (g.id === id ? result : g)),
    nodes: shared
      ? document.nodes.map((n) => (n.id === nodeId ? { ...node, geometryId: id } : n))
      : document.nodes,
  })
}

/** Convert selected subtrees atomically; unselected users keep their parametric geometry. */
export function convertSceneNodesToMesh(
  document: MoldaSceneDocument,
  ids: readonly string[],
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  const selected = selection(document, ids)
  editable(selected)
  const usedOutside = new Set(
    document.nodes.flatMap((node) =>
      node.kind === 'mesh' && !selected.covered.has(node.id) ? [node.geometryId] : [],
    ),
  )
  const converted = new Map<string, SceneGeometry>()
  const allocate = allocateId(document, nextId)
  for (const node of document.nodes) {
    if (node.kind !== 'mesh' || !selected.covered.has(node.id) || converted.has(node.geometryId))
      continue
    const source = selected.index.geometries.get(node.geometryId)
    if (!source) throw new Error('Geometria ausente no índice.')
    if (source.kind === 'mesh') continue
    const { mesh } = parametricMesh(source)
    for (const face of Object.values(mesh.faces)) {
      const points = face.corners.map((corner) => {
        const point = mesh.vertices[corner.vertexId]
        if (!point) throw new Error('Vértice ausente na forma.')
        return point
      })
      requireScene(
        triangulateFace(points).status === 'ok',
        'geometry',
        'Essa forma tem medidas que impedem a conversão. Ajuste as medidas primeiro.',
      )
    }
    converted.set(source.id, usedOutside.has(source.id) ? { ...mesh, id: allocate() } : mesh)
  }
  if (!converted.size) return document
  return finish({
    ...document,
    nodes: document.nodes.map((node) => {
      if (node.kind !== 'mesh' || !selected.covered.has(node.id)) return node
      const mesh = converted.get(node.geometryId)
      return mesh && mesh.id !== node.geometryId ? { ...node, geometryId: mesh.id } : node
    }),
    geometries: [
      ...document.geometries.map((geometry) =>
        usedOutside.has(geometry.id) ? geometry : (converted.get(geometry.id) ?? geometry),
      ),
      ...[...converted].flatMap(([id, mesh]) => (usedOutside.has(id) ? [mesh] : [])),
    ],
  })
}

/** Shared mutation boundary for mesh tools: locks, copy-on-write and aggregate budgets. */
export function editSceneMesh(
  document: MoldaSceneDocument,
  nodeId: string,
  edit: (mesh: SceneMeshGeometry) => SceneMeshGeometry,
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  const selected = selection(document, [nodeId])
  editable(selected)
  const node = selected.index.scene.nodes.get(nodeId)
  requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça para editar.')
  const source = selected.index.geometries.get(node.geometryId)
  requireScene(source?.kind === 'mesh', 'geometry', 'Transforme a forma em malha primeiro.')
  const result = edit(source)
  if (result === source) return document
  requireScene(result.id === source.id, 'geometry', 'A identidade da malha mudou durante a edição.')
  const shared = document.nodes.some(
    (other) => other.kind === 'mesh' && other.id !== nodeId && other.geometryId === source.id,
  )
  const changed = shared ? { ...result, id: allocateId(document, nextId)() } : result
  return finish({
    ...document,
    nodes: shared
      ? document.nodes.map((other) =>
          other.id === nodeId ? { ...node, geometryId: changed.id } : other,
        )
      : document.nodes,
    geometries: shared
      ? [...document.geometries, changed]
      : document.geometries.map((geometry) => (geometry.id === source.id ? changed : geometry)),
  })
}

function translation(offset: Vec3): AffineMatrix {
  tuple(offset, 3, 'offset')
  const matrix = identityMatrix()
  matrix[12] = offset[0]
  matrix[13] = offset[1]
  matrix[14] = offset[2]
  return matrix
}

export function reparentSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
  parentId: string | null,
): MoldaSceneDocument {
  const selected = selection(document, ids)
  editable(selected)
  requireScene(parentId === null || !selected.locked.has(parentId), 'parentId', 'Destrave o grupo.')
  requireSceneAnimationReparent(
    selected.index.scene,
    selected.index.animatedNodes,
    selected.roots,
    parentId,
  )
  const nodes = reparentPreservingWorld(document.nodes, ids, parentId)
  return nodes === document.nodes ? document : finish({ ...document, nodes: [...nodes] })
}

/** One world-space delta for selected roots; descendants never receive it twice. */
export function transformSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
  delta: AffineMatrix,
): MoldaSceneDocument {
  composeTransform({ kind: 'affine', matrix: delta })
  const selected = selection(document, ids)
  editable(selected)
  if (!selected.roots.size || delta.every((value, i) => value === identityMatrix()[i]))
    return document
  const nodes = document.nodes.map((node): ModelSceneNode => {
    if (!selected.roots.has(node.id)) return node
    const world = selected.index.scene.worldMatrices.get(node.id)
    const parent =
      node.parentId === null
        ? identityMatrix()
        : selected.index.scene.worldMatrices.get(node.parentId)
    const inverse = parent ? affineInverse(parent) : null
    requireScene(
      world && inverse,
      `nodes.${node.id}`,
      'O grupo tem uma escala que impede essa mudança.',
    )
    return {
      ...node,
      transform: { kind: 'affine', matrix: affineMultiply(inverse, affineMultiply(delta, world)) },
    }
  })
  return finish({ ...document, nodes })
}

/** Group pivot starts at the selected geometry's world center. Different parents join at root. */
export function groupSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
  options: { name?: string; nextId?: SceneIdFactory } = {},
): MoldaSceneDocument {
  const selected = selection(document, ids)
  editable(selected)
  if (!selected.roots.size) return document
  const parents = new Set(
    document.nodes.filter((node) => selected.roots.has(node.id)).map((node) => node.parentId),
  )
  const parentId = parents.size === 1 ? ([...parents][0] ?? null) : null
  requireSceneAnimationReparent(
    selected.index.scene,
    selected.index.animatedNodes,
    selected.roots,
    parentId,
  )
  const parentWorld =
    parentId === null ? identityMatrix() : selected.index.scene.worldMatrices.get(parentId)
  const inverse = parentWorld ? affineInverse(parentWorld) : null
  requireScene(inverse, 'parentId', 'O grupo tem uma escala que impede essa mudança.')
  const bounds = sceneBounds(selected.index, { nodeIds: selected.covered, includeMirrors: false })
  const center: Vec3 = bounds
    ? [
        bounds.min[0] / 2 + bounds.max[0] / 2,
        bounds.min[1] / 2 + bounds.max[1] / 2,
        bounds.min[2] / 2 + bounds.max[2] / 2,
      ]
    : [0, 0, 0]
  const group: ModelSceneNode = {
    id: allocateId(document, options.nextId ?? newId)(),
    name: text(options.name ?? 'Grupo', 'name', 48),
    parentId,
    kind: 'group',
    hidden: false,
    locked: false,
    transform: {
      kind: 'trs',
      translation: transformPoint(inverse, center),
      rotation: [0, 0, 0, 1],
      scale: [1, 1, 1],
    },
  }
  const nodes = reparentPreservingWorld([...document.nodes, group], [...selected.roots], group.id)
  return finish({ ...document, nodes: [...nodes] })
}

/** Remove group shells, retaining transforms AND inherited visibility on surviving children. */
export function ungroupSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
): MoldaSceneDocument {
  const selected = selection(document, ids)
  editable(selected)
  for (const id of selected.selected)
    requireScene(
      selected.index.scene.nodes.get(id)?.kind === 'group',
      `nodes.${id}`,
      'Escolha um grupo para separar.',
    )
  if (!selected.selected.size) return document
  for (const id of selected.selected)
    requireScene(
      !selected.index.animatedNodes.has(id),
      `nodes.${id}`,
      'Esse grupo tem movimentos próprios. Converta o movimento antes de separar as peças.',
    )
  const removed = new Map<
    string,
    { parentId: string | null; matrix: AffineMatrix; hidden: boolean }
  >()
  const changes = new Map<string, ModelSceneNode>()
  for (const id of selected.index.scene.order) {
    const node = selected.index.scene.nodes.get(id)
    if (!node) throw new Error('Índice de cena incompleto.')
    const parent = node.parentId === null ? undefined : removed.get(node.parentId)
    const matrix = parent
      ? affineMultiply(parent.matrix, composeTransform(node.transform))
      : composeTransform(node.transform)
    const parentId = parent ? parent.parentId : node.parentId
    const hidden = node.hidden || parent?.hidden === true
    if (selected.selected.has(id)) removed.set(id, { parentId, matrix, hidden })
    else if (parent)
      changes.set(id, { ...node, parentId, hidden, transform: { kind: 'affine', matrix } })
  }
  return finish({
    ...document,
    nodes: document.nodes
      .filter((node) => !removed.has(node.id))
      .map((node) => changes.get(node.id) ?? node),
  })
}

/** Remove geometry owned only by deleted nodes; shared/orphan geometry and paint libraries survive. */
export function deleteSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
): MoldaSceneDocument {
  const selected = selection(document, ids)
  editable(selected)
  if (!selected.covered.size) return document
  const nodes = document.nodes.filter((node) => !selected.covered.has(node.id))
  const removedGeometry = new Set(
    document.nodes.flatMap((node) =>
      selected.covered.has(node.id) && node.kind === 'mesh' ? [node.geometryId] : [],
    ),
  )
  for (const node of nodes) if (node.kind === 'mesh') removedGeometry.delete(node.geometryId)
  return finish({
    ...document,
    nodes,
    geometries: document.geometries.filter((geometry) => !removedGeometry.has(geometry.id)),
    mirrors: document.mirrors.filter((mirror) => !selected.covered.has(mirror.sourceId)),
    ...(document.skins === undefined
      ? {}
      : { skins: document.skins.filter((skin) => !selected.covered.has(skin.nodeId)) }),
    ...(document.animations === undefined
      ? {}
      : {
          animations: document.animations.map((clip) => {
            const tracks = clip.tracks.filter((track) => !selected.covered.has(track.nodeId))
            return tracks.length === clip.tracks.length ? clip : { ...clip, tracks }
          }),
        }),
  })
}

export function renameSceneNode(
  document: MoldaSceneDocument,
  nodeId: string,
  name: string,
): MoldaSceneDocument {
  const selected = selection(document, [nodeId])
  requireScene(!selected.locked.has(nodeId), `nodes.${nodeId}`, 'Destrave a peça para renomear.')
  const validName = text(name.trim(), 'name', 48)
  const nodes = document.nodes.map((node) =>
    node.id === nodeId && node.name !== validName ? { ...node, name: validName } : node,
  )
  return nodes.every((node, i) => node === document.nodes[i]) ? document : { ...document, nodes }
}

/** Unlock remains possible; descendant locks are independent and are never cleared implicitly. */
export function setSceneNodeFlag(
  document: MoldaSceneDocument,
  ids: readonly string[],
  flag: 'hidden' | 'locked',
  value: boolean,
): MoldaSceneDocument {
  choice(flag, ['hidden', 'locked'], 'flag')
  boolean(value, 'value')
  const selected = selection(document, ids)
  const nodes = document.nodes.map((node) =>
    selected.selected.has(node.id) && node[flag] !== value ? { ...node, [flag]: value } : node,
  )
  return nodes.every((node, i) => node === document.nodes[i]) ? document : { ...document, nodes }
}

function offsetGeometry(geometry: SceneGeometry, offset: Vec3, id: string): SceneGeometry {
  const move = (point: Vec3): Vec3 => [
    point[0] - offset[0],
    point[1] - offset[1],
    point[2] - offset[2],
  ]
  return geometry.kind === 'mesh'
    ? {
        ...geometry,
        id,
        vertices: Object.fromEntries(
          Object.entries(geometry.vertices).map(([key, point]) => [key, move(point)]),
        ),
      }
    : geometry.kind === 'path'
      ? {
          ...geometry,
          id,
          points: geometry.points.map((point) => ({ ...point, position: move(point.position) })),
        }
      : { ...geometry, id, from: move(geometry.from), to: move(geometry.to) }
}

/** Relocate the local origin without moving geometry or children. Shared geometry is copy-on-write. */
export function moveScenePivot(
  document: MoldaSceneDocument,
  nodeId: string,
  offset: Vec3,
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  tuple(offset, 3, 'offset')
  const selected = selection(document, [nodeId])
  editable(selected)
  if (offset.every((value) => value === 0)) return document
  requireScene(
    !selected.index.skinsByNode.has(nodeId) && !selected.index.skinJointNodes.has(nodeId),
    `nodes.${nodeId}`,
    'Desvincule a peça antes de mudar o pivô da peça ou de seus ossos.',
  )
  requireScene(
    !selected.index.animatedNodes.has(nodeId),
    `nodes.${nodeId}`,
    'Essa peça já tem movimentos. Converta o movimento antes de mudar seu pivô.',
  )
  const node = selected.index.scene.nodes.get(nodeId)
  if (!node) throw new Error('Índice de cena incompleto.')
  const forward = translation(offset)
  const backward = translation([-offset[0], -offset[1], -offset[2]])
  let geometries = document.geometries
  let changed: ModelSceneNode = {
    ...node,
    transform: {
      kind: 'affine',
      matrix: affineMultiply(composeTransform(node.transform), forward),
    },
  }
  if (node.kind === 'mesh') {
    const geometry = selected.index.geometries.get(node.geometryId)
    if (!geometry) throw new Error('Geometria ausente no índice.')
    const shared = document.nodes.some(
      (entry) =>
        entry.id !== nodeId && entry.kind === 'mesh' && entry.geometryId === node.geometryId,
    )
    const geometryId = shared ? allocateId(document, nextId)() : geometry.id
    const moved = offsetGeometry(geometry, offset, geometryId)
    geometries = shared
      ? [...geometries, moved]
      : geometries.map((entry) => (entry.id === geometry.id ? moved : entry))
    changed = { ...changed, kind: 'mesh', geometryId, materialId: node.materialId }
  }
  return finish({
    ...document,
    geometries,
    nodes: document.nodes.map((entry): ModelSceneNode => {
      if (entry.id === nodeId) return changed
      if (entry.parentId !== nodeId) return entry
      return {
        ...entry,
        transform: {
          kind: 'affine',
          matrix: affineMultiply(backward, composeTransform(entry.transform)),
        },
      }
    }),
  })
}

/** Deep-copy the reachable authoring resources once, preserving sharing inside the duplicate. */
export function duplicateSceneNodes(
  document: MoldaSceneDocument,
  ids: readonly string[],
  nextId: SceneIdFactory = newId,
): MoldaSceneDocument {
  const selected = selection(document, ids)
  editable(selected)
  if (!selected.covered.size) return document
  const allocate = allocateId(document, nextId)
  const nodeIds = new Map<string, string>()
  const geometryIds = new Map<string, string>()
  const materialIds = new Map<string, string>()
  const imageIds = new Map<string, string>()
  const include = (map: Map<string, string>, id: string) => {
    if (!map.has(id)) map.set(id, allocate())
  }
  for (const node of document.nodes) {
    if (!selected.covered.has(node.id)) continue
    include(nodeIds, node.id)
    if (node.kind === 'mesh') {
      include(geometryIds, node.geometryId)
      include(materialIds, node.materialId)
    }
  }
  for (const geometry of document.geometries) {
    if (!geometryIds.has(geometry.id)) continue
    const faces =
      geometry.kind === 'mesh' ? Object.values(geometry.faces) : Object.values(geometry.surfaces)
    for (const face of faces)
      if (face.materialId !== undefined) include(materialIds, face.materialId)
  }
  for (const material of document.materials)
    if (materialIds.has(material.id))
      for (const id of sceneMaterialImageIds(material)) include(imageIds, id)
  const mapped = (map: ReadonlyMap<string, string>, id: string) => {
    const result = map.get(id)
    if (!result) throw new Error('Referência não preparada para duplicação.')
    return result
  }
  const nodes = document.nodes
    .filter((node) => nodeIds.has(node.id))
    .map((node): ModelSceneNode => {
      const copy = structuredClone(node)
      copy.id = mapped(nodeIds, node.id)
      copy.parentId = node.parentId === null ? null : (nodeIds.get(node.parentId) ?? node.parentId)
      if (copy.kind === 'mesh') {
        copy.geometryId = mapped(geometryIds, copy.geometryId)
        copy.materialId = mapped(materialIds, copy.materialId)
      }
      return copy
    })
  const geometries = document.geometries
    .filter((geometry) => geometryIds.has(geometry.id))
    .map((geometry) => {
      const copy = structuredClone(geometry)
      copy.id = mapped(geometryIds, geometry.id)
      const faces = copy.kind === 'mesh' ? Object.values(copy.faces) : Object.values(copy.surfaces)
      for (const face of faces)
        if (face.materialId !== undefined) face.materialId = mapped(materialIds, face.materialId)
      return copy
    })
  const materials = document.materials
    .filter((material) => materialIds.has(material.id))
    .map((material) => {
      const copy = structuredClone(material)
      copy.id = mapped(materialIds, material.id)
      for (const field of SCENE_MATERIAL_IMAGE_KEYS)
        if (copy[field] !== undefined) copy[field] = mapped(imageIds, copy[field])
      return copy
    })
  const images = document.images
    .filter((image) => imageIds.has(image.id))
    .map((image) => ({ ...structuredClone(image), id: mapped(imageIds, image.id) }))
  const mirrors = document.mirrors
    .filter((mirror) => nodeIds.has(mirror.sourceId))
    .map((mirror) => ({ ...mirror, id: allocate(), sourceId: mapped(nodeIds, mirror.sourceId) }))
  return finish({
    ...document,
    nodes: [...document.nodes, ...nodes],
    geometries: [...document.geometries, ...geometries],
    materials: [...document.materials, ...materials],
    images: [...document.images, ...images],
    mirrors: [...document.mirrors, ...mirrors],
    ...duplicateSceneAnimationTargets(document, nodeIds),
    ...duplicateSceneSkinTargets(document, nodeIds, allocate),
  })
}

export function addSceneMirror(
  document: MoldaSceneDocument,
  nodeId: string,
  options: { axis: SceneMirror['axis']; offset: number; nextId?: SceneIdFactory },
): MoldaSceneDocument {
  const selected = selection(document, [nodeId])
  editable(selected)
  const source = selected.index.scene.nodes.get(nodeId)
  requireScene(source?.kind === 'mesh', `nodes.${nodeId}`, 'Escolha uma peça para espelhar.')
  const axis = choice(options.axis, ['x', 'y', 'z'], 'axis')
  const offset = number(options.offset, 'offset')
  // O mesmo espelho duas vezes desenharia duas cópias uma em cima da outra: nada muda.
  if (
    document.mirrors.some(
      (mirror) => mirror.sourceId === nodeId && mirror.axis === axis && mirror.offset === offset,
    )
  )
    return document
  const mirror: SceneMirror = {
    id: allocateId(document, options.nextId ?? newId)(),
    name: source.name,
    sourceId: nodeId,
    axis,
    offset,
  }
  return finish({ ...document, mirrors: [...document.mirrors, mirror] })
}

export function removeSceneMirrors(
  document: MoldaSceneDocument,
  ids: readonly string[],
): MoldaSceneDocument {
  const selected = new Set(ids)
  const index = indexSceneDocument(document)
  for (const id of selected)
    requireScene(index.mirrors.has(id), `mirrors.${id}`, 'O espelho escolhido não existe.')
  editable(
    selection(
      document,
      document.mirrors.filter((mirror) => selected.has(mirror.id)).map((mirror) => mirror.sourceId),
    ),
  )
  return !selected.size
    ? document
    : { ...document, mirrors: document.mirrors.filter((mirror) => !selected.has(mirror.id)) }
}
