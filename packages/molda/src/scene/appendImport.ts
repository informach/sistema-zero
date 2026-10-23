import { newId } from '../core/id'
import { resolvePaletteColors } from '../core/sanitize'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import { sceneBaseColor, scenePalette } from './composite'
import type { MoldaSceneDocument, SceneGeometry } from './document'
import { convertSceneImageRgba } from './imageOperations'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { text } from './validation'

/** Add a reviewed native import as one movable group, retaining the current project's identity. */
export function appendSceneImport(
  current: MoldaSceneDocument,
  imported: MoldaSceneDocument,
  modelName: string,
  nextId: () => string = newId,
): MoldaSceneDocument {
  if (
    !imported.nodes.length &&
    !imported.geometries.length &&
    !imported.materials.length &&
    !imported.images.length &&
    !imported.mirrors.length &&
    !imported.animations?.length &&
    !imported.skins?.length
  )
    return current

  const allocate = allocateSceneId(current, nextId)
  const ids = (entries: readonly { id: string }[]) =>
    new Map(entries.map((entry) => [entry.id, allocate()]))
  const nodeIds = ids(imported.nodes)
  const geometryIds = ids(imported.geometries)
  const materialIds = ids(imported.materials)
  const imageIds = ids(imported.images)
  const mirrorIds = ids(imported.mirrors)
  const animationIds = ids(imported.animations ?? [])
  const skinIds = ids(imported.skins ?? [])
  const groupId = imported.nodes.length ? allocate() : null
  const mapId = (map: ReadonlyMap<string, string>, id: string) => {
    const mapped = map.get(id)
    if (!mapped) throw new Error(`Referência ausente no modelo importado: ${id}`)
    return mapped
  }

  const sourceColors = resolvePaletteColors(imported)
  const targetColors = resolvePaletteColors(current)
  const samePalette = sourceColors.every(
    (color, index) => color.toLowerCase() === targetColors[index]?.toLowerCase(),
  )
  const palette = scenePalette(imported)
  const surfaces = (geometry: Extract<SceneGeometry, { surfaces: unknown }>) =>
    Object.fromEntries(
      Object.entries(geometry.surfaces).map(([face, surface]) => [
        face,
        surface?.materialId
          ? { ...surface, materialId: mapId(materialIds, surface.materialId) }
          : surface,
      ]),
    )
  const nodes = imported.nodes.map((node) => ({
    ...node,
    id: mapId(nodeIds, node.id),
    parentId: node.parentId ? mapId(nodeIds, node.parentId) : groupId,
    ...(node.kind === 'mesh'
      ? {
          geometryId: mapId(geometryIds, node.geometryId),
          materialId: mapId(materialIds, node.materialId),
        }
      : {}),
  })) as MoldaSceneDocument['nodes']
  const geometries = imported.geometries.map((geometry) =>
    geometry.kind === 'mesh'
      ? {
          ...geometry,
          id: mapId(geometryIds, geometry.id),
          faces: Object.fromEntries(
            Object.entries(geometry.faces).map(([faceId, face]) => [
              faceId,
              face.materialId ? { ...face, materialId: mapId(materialIds, face.materialId) } : face,
            ]),
          ),
        }
      : { ...geometry, id: mapId(geometryIds, geometry.id), surfaces: surfaces(geometry) },
  ) as SceneGeometry[]
  const materials = imported.materials.map((material) => ({
    ...material,
    id: mapId(materialIds, material.id),
    baseColor:
      samePalette || material.baseColor.kind === 'rgba'
        ? material.baseColor
        : { kind: 'rgba' as const, value: sceneBaseColor(material, palette) },
    ...Object.fromEntries(
      SCENE_MATERIAL_IMAGE_KEYS.flatMap((field) =>
        material[field] ? [[field, mapId(imageIds, material[field])]] : [],
      ),
    ),
  }))
  const images = imported.images.map((image) => ({
    ...(samePalette ? image : convertSceneImageRgba(image, palette)),
    id: mapId(imageIds, image.id),
  }))
  const mirrors = imported.mirrors.map((mirror) => ({
    ...mirror,
    id: mapId(mirrorIds, mirror.id),
    sourceId: mapId(nodeIds, mirror.sourceId),
  }))
  const animations = imported.animations?.map((clip) => ({
    ...clip,
    id: mapId(animationIds, clip.id),
    tracks: clip.tracks.map((track) => ({ ...track, nodeId: mapId(nodeIds, track.nodeId) })),
  }))
  const skins = imported.skins?.map((skin) => ({
    ...skin,
    id: mapId(skinIds, skin.id),
    nodeId: mapId(nodeIds, skin.nodeId),
    joints: skin.joints.map((joint) => ({ ...joint, nodeId: mapId(nodeIds, joint.nodeId) })),
    weights: Object.fromEntries(
      Object.entries(skin.weights).map(([vertexId, influences]) => [
        vertexId,
        influences.map((influence) => ({
          ...influence,
          jointId: mapId(nodeIds, influence.jointId),
        })),
      ]),
    ),
  }))
  return finishSceneCommand({
    ...current,
    thumb: undefined,
    nodes: [
      ...current.nodes,
      ...(groupId
        ? [
            {
              id: groupId,
              kind: 'group' as const,
              name: text(modelName, 'name', 48),
              parentId: null,
              hidden: false,
              locked: false,
              transform: {
                kind: 'trs' as const,
                translation: [0, 0, 0] as [number, number, number],
                rotation: [0, 0, 0, 1] as [number, number, number, number],
                scale: [1, 1, 1] as [number, number, number],
              },
            },
          ]
        : []),
      ...nodes,
    ],
    geometries: [...current.geometries, ...geometries],
    materials: [...current.materials, ...materials],
    images: [...current.images, ...images],
    mirrors: [...current.mirrors, ...mirrors],
    ...(animations?.length ? { animations: [...(current.animations ?? []), ...animations] } : {}),
    ...(skins?.length ? { skins: [...(current.skins ?? []), ...skins] } : {}),
  })
}
