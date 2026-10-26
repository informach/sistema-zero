import { newId } from '../core/id'
import { requireScenePaintCapacity } from './appearanceCommands'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import { convertSceneNodesToMesh } from './commands'
import type { MoldaSceneDocument, SceneImage, SceneMeshGeometry } from './document'
import { pixelMeshUv } from './meshPixelUv'
import { meshSymmetrySource } from './meshSymmetry'
import { reprojectScenePaint } from './reprojectPaint'
import { requireScene } from './validation'

/** Explicit, atomic UV regeneration. Existing paint libraries and other instances stay untouched. */
export function simpleScenePaintUv(
  document: MoldaSceneDocument,
  nodeId: string,
  nextId: () => string = newId,
) {
  const selected = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selected)
  const originalNode = selected.index.scene.nodes.get(nodeId)
  requireScene(originalNode?.kind === 'mesh', 'node', 'Escolha uma peça para organizar a grade.')
  let next = convertSceneNodesToMesh(document, [nodeId], nextId)
  const node = next.nodes.find((entry) => entry.id === nodeId)!
  requireScene(node.kind === 'mesh', 'node', 'Escolha uma peça para organizar a grade.')
  const geometry = next.geometries.find((entry) => entry.id === node.geometryId)!
  requireScene(geometry.kind === 'mesh', 'geometry', 'Essa peça precisa de uma malha para mapear.')
  const sourceMesh = meshSymmetrySource(geometry)
  const bindings = new Map<string, string[]>()
  for (const [id, face] of Object.entries(sourceMesh.faces)) {
    const material = face.materialId ?? node.materialId
    const faces = bindings.get(material) ?? []
    faces.push(id)
    bindings.set(material, faces)
  }
  const plans = [...bindings].map(([materialId, faces]) => {
    const material = next.materials.find((entry) => entry.id === materialId)!
    requireScene(
      !material.normalImageId && !material.roughnessImageId && !material.metalnessImageId,
      'material',
      'Esta peça usa mapas de relevo ou brilho. Organize esses mapas juntos na área UV.',
    )
    const image = next.images.find((entry) => entry.id === material.colorImageId)
    requireScene(
      !image?.flipbook,
      'image',
      'Essa pintura tem animação. Mantenha o mapa dela para preservar os quadros.',
    )
    const plan = pixelMeshUv(
      sourceMesh,
      faces,
      image?.texelsPerUnit ?? document.settings.texelsPerUnit,
      selected.index.scene.worldMatrices.get(nodeId)!,
    )
    return { materialId, faces, material, image, plan }
  })
  requireScene(plans.length, 'faces', 'Essa peça não tem faces para mapear.')
  if (
    next === document &&
    plans.every(
      ({ faces, image, plan }) =>
        image?.width === plan.width &&
        image.height === plan.height &&
        faces.every((id) =>
          geometry.faces[id]!.corners.every((corner, i) =>
            corner.uv.every((value, axis) => value === plan.mesh.faces[id]!.corners[i]!.uv[axis]),
          ),
        ),
    )
  )
    return document
  for (const { materialId, material, faces, image, plan } of plans) {
    const channels = image?.encoding === 'rgba' ? 4 : 1
    const layerCount = image?.layers.length ?? 1
    requireScenePaintCapacity(next, plan.width * plan.height * channels * layerCount, layerCount, 1)
    const allocate = allocateSceneId(next, nextId)
    const newMaterialId = allocate(),
      imageId = allocate()
    const remapped: SceneImage = image
      ? reprojectScenePaint(image, geometry, plan.mesh, faces, plan.width, plan.height)
      : {
          id: imageId,
          name: node.name,
          width: plan.width,
          height: plan.height,
          texelsPerUnit: document.settings.texelsPerUnit,
          encoding: 'indexed',
          layers: [
            {
              id: allocate(),
              name: 'Desenho',
              visible: true,
              opacity: 1,
              pixels: new Uint8Array(plan.width * plan.height),
            },
          ],
        }
    const paint: SceneImage = {
      ...remapped,
      id: imageId,
      texelsPerUnit: image?.texelsPerUnit ?? document.settings.texelsPerUnit,
      layers: image
        ? remapped.layers.map((layer) => ({ ...layer, id: allocate() }))
        : remapped.layers,
    }
    const current = next.nodes.find((entry) => entry.id === nodeId)!
    requireScene(current.kind === 'mesh', 'node', 'Essa peça mudou.')
    const mesh = next.geometries.find((entry) => entry.id === current.geometryId)!
    requireScene(mesh.kind === 'mesh', 'geometry', 'Essa peça mudou.')
    const changed: SceneMeshGeometry = { ...mesh, faces: { ...mesh.faces } }
    for (const id of faces) {
      changed.faces[id] = {
        ...mesh.faces[id]!,
        materialId: newMaterialId,
        corners: plan.mesh.faces[id]!.corners,
      }
      const reflectedId = mesh.symmetry?.faces[id]
      if (reflectedId) {
        const reflected = mesh.faces[reflectedId]!
        const corners = [...plan.mesh.faces[id]!.corners].reverse()
        changed.faces[reflectedId] = {
          ...reflected,
          materialId: newMaterialId,
          corners: reflected.corners.map((corner, i) => ({ ...corner, uv: corners[i]!.uv })),
        }
      }
    }
    const shared = next.nodes.some(
      (entry) => entry.kind === 'mesh' && entry.id !== nodeId && entry.geometryId === mesh.id,
    )
    if (shared) changed.id = allocate()
    next = finishSceneCommand({
      ...next,
      nodes: next.nodes.map((entry) =>
        entry.id === nodeId
          ? {
              ...current,
              geometryId: changed.id,
              materialId: current.materialId === materialId ? newMaterialId : current.materialId,
            }
          : entry,
      ),
      materials: [...next.materials, { ...material, id: newMaterialId, colorImageId: imageId }],
      images: [...next.images, paint],
      geometries: shared
        ? [...next.geometries, changed]
        : next.geometries.map((entry) => (entry.id === mesh.id ? changed : entry)),
    })
  }
  return next
}
