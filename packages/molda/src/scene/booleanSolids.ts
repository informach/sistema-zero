import type { Manifold, ManifoldToplevel, Mesh } from 'manifold-3d'
import { newId } from '../core/id'
import { MOLDA_LIMITS } from '../core/limits'
import type { Vec3 } from '../core/model'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import type { MoldaSceneDocument, SceneMeshGeometry, Vec2 } from './document'
import { affineDeterminant, affineInverse, affineMultiply, transformPoint } from './matrix'
import { requireClosedSceneMesh, sceneMeshVolume } from './meshSolid'
import { requireNonIntersectingSceneSolid } from './meshSolidIntersections'
import { sceneGeometryMesh } from './parametricGeometry'
import { triangulateFace } from './triangulate'
import { requireScene, SceneValidationError } from './validation'

export type SceneBooleanOperation = 'union' | 'intersection' | 'difference'

let manifoldModule: Promise<ManifoldToplevel> | null = null
function loadManifold(): Promise<ManifoldToplevel> {
  manifoldModule ??= import('manifold-3d')
    .then(async ({ default: Module }) => {
      const module = await Module()
      module.setup()
      return module
    })
    .catch((error: unknown) => {
      manifoldModule = null
      throw error
    })
  return manifoldModule
}

/** Resolve a pair into the first node's local space, without modifying either source. */
export async function booleanSceneSolids(
  document: MoldaSceneDocument,
  ids: readonly string[],
  operation: SceneBooleanOperation,
  nextId: () => string = newId,
): Promise<MoldaSceneDocument> {
  requireScene(
    ids.length === 2 && ids[0] !== ids[1],
    'nodes',
    'Escolha exatamente duas peças: primeiro a base, depois a segunda peça.',
  )
  requireScene(
    ['union', 'intersection', 'difference'].includes(operation),
    'operation',
    'Operação desconhecida.',
  )
  const selected = sceneCommandSelection(document, ids)
  requireEditableScene(selected)
  const [baseId, toolId] = ids as [string, string]
  const base = selected.index.scene.nodes.get(baseId)
  const tool = selected.index.scene.nodes.get(toolId)
  requireScene(
    base?.kind === 'mesh' && tool?.kind === 'mesh',
    'nodes',
    'Escolha duas peças sólidas.',
  )
  requireScene(
    !selected.index.scene.children.get(toolId)?.length,
    'nodes',
    'A segunda peça tem filhos. Separe-os antes de combinar.',
  )
  requireScene(
    !document.mirrors.some((mirror) => ids.includes(mirror.sourceId)),
    'mirrors',
    'Remova os espelhos dessas peças antes de combinar.',
  )
  requireScene(
    !ids.some(
      (id) =>
        selected.index.animatedNodes.has(id) ||
        document.skins?.some(
          (skin) => skin.nodeId === id || skin.joints.some((joint) => joint.nodeId === id),
        ),
    ),
    'nodes',
    'Essas peças têm animação ou ossos. Remova o vínculo antes de combinar.',
  )
  const baseGeometry = selected.index.geometries.get(base.geometryId)
  const toolGeometry = selected.index.geometries.get(tool.geometryId)
  requireScene(baseGeometry && toolGeometry, 'geometries', 'A geometria da peça não existe mais.')
  const a = sceneGeometryMesh(baseGeometry)
  const b = sceneGeometryMesh(toolGeometry)
  for (const mesh of [a, b]) {
    requireScene(!mesh.symmetry, 'geometry', 'Aplique a simetria antes de combinar as peças.')
    requireClosedSceneMesh(mesh)
    requireScene(
      sceneMeshVolume(mesh) > 0,
      'geometry',
      'A peça precisa ter faces voltadas para fora.',
    )
    requireNonIntersectingSceneSolid(mesh)
  }
  const baseWorld = selected.index.scene.worldMatrices.get(baseId)!
  const toolWorld = selected.index.scene.worldMatrices.get(toolId)!
  const inverse = affineInverse(baseWorld)
  requireScene(
    inverse,
    'nodes',
    'A base tem uma transformação sem inversa. Ajuste o tamanho da peça.',
  )
  const relative = affineMultiply(inverse, toolWorld)
  requireScene(
    Math.abs(affineDeterminant(relative)) > 1e-12,
    'nodes',
    'A segunda peça está achatada. Ajuste o tamanho antes de combinar.',
  )
  const materialIds = [
    ...new Set([
      base.materialId,
      tool.materialId,
      ...Object.values(a.faces).map((face) => face.materialId ?? base.materialId),
      ...Object.values(b.faces).map((face) => face.materialId ?? tool.materialId),
    ]),
  ]
  const module = await loadManifold()
  const firstMaterialId = module.Manifold.reserveIDs(materialIds.length)
  let left: Manifold | undefined
  let right: Manifold | undefined
  let result: Manifold | undefined
  try {
    left = new module.Manifold(
      toManifoldMesh(module, a, base.materialId, materialIds, firstMaterialId),
    )
    right = new module.Manifold(
      toManifoldMesh(module, b, tool.materialId, materialIds, firstMaterialId, relative),
    )
    result = module.Manifold[operation](left, right)
    requireScene(!result.isEmpty(), 'geometry', 'As peças não produzem um volume nessa operação.')
    const geometryId = allocateSceneId(document, nextId)()
    const mesh = fromManifoldMesh(
      result.getMesh(),
      geometryId,
      materialIds,
      firstMaterialId,
      base.materialId,
    )
    requireScene(
      Object.keys(mesh.vertices).length <= MOLDA_LIMITS.maxMeshVertices &&
        Object.keys(mesh.faces).length <= MOLDA_LIMITS.maxMeshFaces,
      'geometry',
      'O resultado tem detalhes demais. Simplifique as peças antes de combinar.',
    )
    requireClosedSceneMesh(mesh)
    requireScene(sceneMeshVolume(mesh) > 0, 'geometry', 'O resultado não tem um volume válido.')
    requireNonIntersectingSceneSolid(mesh)
    const nodes = document.nodes
      .filter((node) => node.id !== toolId)
      .map((node) => (node.id === baseId && node.kind === 'mesh' ? { ...node, geometryId } : node))
    const used = new Set(nodes.flatMap((node) => (node.kind === 'mesh' ? [node.geometryId] : [])))
    const replaced = new Set([base.geometryId, tool.geometryId])
    return finishSceneCommand({
      ...document,
      nodes,
      geometries: [
        ...document.geometries.filter(
          (geometry) => !replaced.has(geometry.id) || used.has(geometry.id),
        ),
        mesh,
      ],
    })
  } catch (error) {
    if (error instanceof SceneValidationError) throw error
    throw new SceneValidationError(
      'geometry',
      'Não foi possível combinar essas peças. Confira se ambas são sólidos fechados e não se tocam apenas numa linha ou ponto.',
    )
  } finally {
    result?.delete()
    right?.delete()
    left?.delete()
  }
}

function toManifoldMesh(
  module: ManifoldToplevel,
  mesh: SceneMeshGeometry,
  defaultMaterial: string,
  materialIds: readonly string[],
  firstMaterialId: number,
  matrix?: ReturnType<typeof affineMultiply>,
): Mesh {
  const groups = new Map<string, Array<Array<{ point: Vec3; uv: Vec2 }>>>()
  const reverse = matrix && affineDeterminant(matrix) < 0
  for (const face of Object.values(mesh.faces)) {
    const points = face.corners.map((corner) => mesh.vertices[corner.vertexId]!)
    const triangles = triangulateFace(points)
    requireScene(
      triangles.status === 'ok',
      'geometry',
      'Uma face da peça não pôde ser triangulada.',
    )
    const materialId = face.materialId ?? defaultMaterial
    const group = groups.get(materialId) ?? []
    for (const triangle of triangles.triangles) {
      group.push(
        (reverse ? [...triangle].reverse() : triangle).map((index) => {
          const corner = face.corners[index]!
          return {
            point: matrix
              ? transformPoint(matrix, mesh.vertices[corner.vertexId]!)
              : mesh.vertices[corner.vertexId]!,
            uv: corner.uv,
          }
        }),
      )
    }
    groups.set(materialId, group)
  }
  const properties: number[] = []
  const runIndex: number[] = []
  const runOriginalID: number[] = []
  for (const materialId of materialIds) {
    const group = groups.get(materialId)
    if (!group?.length) continue
    runIndex.push(properties.length / 5)
    runOriginalID.push(firstMaterialId + materialIds.indexOf(materialId))
    for (const triangle of group)
      for (const corner of triangle) properties.push(...corner.point, ...corner.uv)
  }
  requireScene(
    properties.length <= 60_000,
    'geometry',
    'Essas peças têm triângulos demais para combinar.',
  )
  const manifoldMesh = new module.Mesh({
    numProp: 5,
    vertProperties: new Float32Array(properties),
    triVerts: Uint32Array.from({ length: properties.length / 5 }, (_, index) => index),
    runIndex: new Uint32Array(runIndex),
    runOriginalID: new Uint32Array(runOriginalID),
  })
  manifoldMesh.merge()
  return manifoldMesh
}

function fromManifoldMesh(
  mesh: Mesh,
  id: string,
  materialIds: readonly string[],
  firstMaterialId: number,
  defaultMaterial: string,
): SceneMeshGeometry {
  requireScene(
    mesh.triVerts.length <= MOLDA_LIMITS.maxMeshFaces * 3,
    'geometry',
    'O resultado tem detalhes demais. Simplifique as peças antes de combinar.',
  )
  const vertices: SceneMeshGeometry['vertices'] = {}
  const faces: SceneMeshGeometry['faces'] = {}
  const parents = new Map<number, number>()
  for (let i = 0; i < mesh.mergeFromVert.length; i++)
    parents.set(mesh.mergeFromVert[i]!, mesh.mergeToVert[i]!)
  const canonical = (index: number): number => {
    while (parents.has(index)) index = parents.get(index)!
    return index
  }
  let faceNumber = 0
  for (let run = 0; run < mesh.numRun; run++) {
    const materialId = materialIds[mesh.runOriginalID[run]! - firstMaterialId]
    requireScene(materialId, 'geometry', 'O resultado perdeu a origem de um material.')
    for (let offset = mesh.runIndex[run]!; offset < mesh.runIndex[run + 1]!; offset += 3) {
      const corners: Array<{ vertexId: string; uv: Vec2 }> = []
      for (let i = offset; i < offset + 3; i++) {
        const index = mesh.triVerts[i]!
        const vertexId = `v${canonical(index)}`
        const pointOffset = canonical(index) * mesh.numProp
        vertices[vertexId] ??= [
          mesh.vertProperties[pointOffset]!,
          mesh.vertProperties[pointOffset + 1]!,
          mesh.vertProperties[pointOffset + 2]!,
        ]
        const uvOffset = index * mesh.numProp + 3
        corners.push({
          vertexId,
          uv: [mesh.vertProperties[uvOffset]!, mesh.vertProperties[uvOffset + 1]!],
        })
      }
      faces[`f${faceNumber++}`] = {
        corners,
        ...(materialId === defaultMaterial ? {} : { materialId }),
      }
    }
  }
  return { id, kind: 'mesh', vertices, faces, looseEdges: [] }
}
