import { indexSceneAnimations } from './animationIndex'
import { readSceneBendLimit } from './bendLimit'
import type { MoldaSceneDocument } from './document'
import { indexSceneNodes } from './graph'
import { SCENE_LIMITS } from './limits'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { parametricTriangleCount } from './parametricGeometry'
import { indexSceneSkins } from './skinIndex'
import { requireScene, uniqueById } from './validation'

/** Cross-resource references and aggregate costs. Never repairs orphaned topology/materials. */
export function indexSceneDocument(document: MoldaSceneDocument) {
  const scene = indexSceneNodes(document.nodes)
  const animations = indexSceneAnimations(document, scene)
  const geometries = uniqueById(document.geometries, 'geometries')
  const materials = uniqueById(document.materials, 'materials')
  const images = uniqueById(document.images, 'images')
  const mirrors = uniqueById(document.mirrors, 'mirrors')
  const skins = indexSceneSkins(document.skins ?? [], scene, geometries)
  const triangles = new Map<string, number>()
  let vertexCount = 0
  let looseEdgeCount = 0
  for (const geometry of geometries.values()) {
    if (geometry.kind === 'mesh') {
      vertexCount += Object.keys(geometry.vertices).length
      looseEdgeCount += geometry.looseEdges.length
      let count = 0
      for (const [faceId, face] of Object.entries(geometry.faces)) {
        count += face.corners.length - 2
        for (const corner of face.corners)
          requireScene(
            Object.hasOwn(geometry.vertices, corner.vertexId),
            `geometries.${geometry.id}.${faceId}`,
            'Vértice ausente.',
          )
        if (face.materialId !== undefined)
          requireScene(
            materials.has(face.materialId),
            `geometries.${geometry.id}.${faceId}`,
            'Material ausente.',
          )
      }
      for (const edge of geometry.looseEdges) {
        requireScene(
          edge[0] !== edge[1] && edge.every((id) => Object.hasOwn(geometry.vertices, id)),
          `geometries.${geometry.id}.looseEdges`,
          'Aresta inválida.',
        )
      }
      triangles.set(geometry.id, count)
    } else {
      if (geometry.kind === 'path') vertexCount += geometry.points.length
      triangles.set(geometry.id, parametricTriangleCount(geometry))
      for (const surface of Object.values(geometry.surfaces)) {
        if (surface.materialId !== undefined)
          requireScene(
            materials.has(surface.materialId),
            `geometries.${geometry.id}`,
            'Material ausente.',
          )
      }
    }
  }
  requireScene(
    [...triangles.values()].reduce((total, count) => total + count, 0) <= SCENE_LIMITS.triangles,
    'geometries',
    'A geometria guardada ultrapassa o tamanho permitido para uma criação.',
  )
  requireScene(
    vertexCount <= SCENE_LIMITS.vertices && looseEdgeCount <= SCENE_LIMITS.looseEdges,
    'geometries',
    'Geometria fora do orçamento.',
  )
  for (const material of materials.values()) {
    for (const field of SCENE_MATERIAL_IMAGE_KEYS) {
      const id = material[field]
      if (id === undefined) continue
      const image = images.get(id)
      requireScene(image, `materials.${material.id}.${field}`, 'Imagem ausente.')
      requireScene(
        field === 'colorImageId' || image.encoding === 'rgba',
        `materials.${material.id}.${field}`,
        'Mapas de detalhes precisam de cores livres, sem vínculo com a paleta.',
      )
    }
  }
  let renderedParts = 0
  let triangleCount = 0
  for (const node of scene.nodes.values()) {
    if (node.kind !== 'mesh' && node.bendLimit !== undefined)
      readSceneBendLimit(node.bendLimit, `nodes.${node.id}.bendLimit`)
    if (node.kind !== 'mesh') continue
    requireScene(
      geometries.has(node.geometryId) && materials.has(node.materialId),
      `nodes.${node.id}`,
      'Geometria ou material ausente.',
    )
    renderedParts += 1
    triangleCount += triangles.get(node.geometryId) ?? 0
  }
  for (const mirror of mirrors.values()) {
    const source = scene.nodes.get(mirror.sourceId)
    requireScene(
      !scene.nodes.has(mirror.id) && source?.kind === 'mesh',
      `mirrors.${mirror.id}`,
      'Espelho sem origem válida ou com identidade repetida.',
    )
    renderedParts += 1
    triangleCount += triangles.get(source.geometryId) ?? 0
  }
  requireScene(
    renderedParts <= SCENE_LIMITS.renderedParts && triangleCount <= SCENE_LIMITS.triangles,
    'nodes',
    'Modelo fora do orçamento de desenho.',
  )
  return {
    ...animations,
    ...skins,
    scene,
    geometries,
    materials,
    images,
    mirrors,
    vertexCount,
    triangleCount,
    renderedParts,
  }
}
