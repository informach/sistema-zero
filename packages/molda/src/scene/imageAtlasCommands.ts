import { newId } from '../core/id'
import type { ShapeFaceId } from '../core/model'
import { requireScenePaintCapacity } from './appearanceCommands'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import { sceneBaseColor, scenePalette } from './composite'
import type {
  MoldaSceneDocument,
  SceneGeometry,
  SceneImage,
  SceneMaterial,
  SceneUvTransform,
} from './document'
import { packSceneImageAtlas, type SceneAtlasTile, sceneAtlasUv } from './imageAtlas'
import { type SceneRgbaRaster, validateSceneRgbaRaster } from './imageImport'
import { SCENE_LIMITS } from './limits'
import { parametricMesh } from './parametricGeometry'
import * as v from './validation'

export function prepareSceneImageAtlas(document: MoldaSceneDocument, nodeId: string) {
  const selected = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selected)
  const node = selected.index.scene.nodes.get(nodeId)
  v.requireScene(node?.kind === 'mesh', 'node', 'Escolha uma peça para juntar as pinturas.')
  const geometry = selected.index.geometries.get(node.geometryId)!
  const derived = geometry.kind === 'mesh' ? null : parametricMesh(geometry)
  const mesh = geometry.kind === 'mesh' ? geometry : derived!.mesh
  const palette = scenePalette(document)
  const materials = new Map<string, SceneMaterial>()
  const images = new Map<string, SceneImage>()
  const tileByMaterial = new Map<string, number>()
  const tileKeys = new Map<string, number>()
  const tiles: SceneAtlasTile[] = []
  for (const face of Object.values(mesh.faces)) {
    const id = face.materialId ?? node.materialId
    const material = selected.index.materials.get(id)!
    if (!material.colorImageId) continue
    v.requireScene(
      !material.normalImageId && !material.roughnessImageId && !material.metalnessImageId,
      'material',
      'Esta pintura também usa mapas de detalhes. Juntá-la mudaria o encaixe desses mapas; mantenha as imagens separadas.',
    )
    v.requireScene(
      face.corners.every(({ uv }) => uv.every((n) => Number.isFinite(n) && n >= 0 && n <= 1)),
      'uv',
      'Há pintura encaixada fora da imagem. Ajuste esses UVs antes de juntar; eles não serão cortados automaticamente.',
    )
    if (materials.has(id)) continue
    const image = selected.index.images.get(material.colorImageId)!
    v.requireScene(
      !image.flipbook,
      'image',
      'Esta imagem tem animação por quadros. Juntá-la mudaria a animação; mantenha as pinturas separadas.',
    )
    const base = sceneBaseColor(material, palette)
    const preserveTransparentRgb = material.alphaMask !== undefined
    const key = JSON.stringify([image.id, base, preserveTransparentRgb])
    let tile = tileKeys.get(key)
    if (tile === undefined) {
      tile = tiles.length
      tileKeys.set(key, tile)
      tiles.push({
        imageId: image.id,
        base,
        ...(preserveTransparentRgb ? { preserveTransparentRgb } : {}),
      })
    }
    tileByMaterial.set(id, tile)
    materials.set(id, material)
    images.set(image.id, image)
  }
  v.requireScene(
    images.size >= 2,
    'images',
    'Esta peça precisa usar pelo menos duas imagens diferentes para juntá-las.',
  )
  const layout = packSceneImageAtlas([...images.values()], tiles)
  const shared = document.nodes.some(
    (n) => n.kind === 'mesh' && n.id !== node.id && n.geometryId === geometry.id,
  )
  v.requireScene(
    document.materials.length + materials.size <= SCENE_LIMITS.materials &&
      document.geometries.length + Number(shared) <= SCENE_LIMITS.geometries,
    'images',
    'Não há espaço para isolar os materiais desta peça.',
  )
  requireScenePaintCapacity(document, layout.width * layout.height * 4, 1, 1)
  return {
    document,
    node,
    geometry,
    surfaceByFace: derived?.surfaceByFace,
    shared,
    materials,
    images: [...images.values()],
    palette,
    tileByMaterial,
    tiles,
    layout,
  }
}

export type SceneImageAtlasPlan = ReturnType<typeof prepareSceneImageAtlas>

/** Revision owner supplies the plan. Copy only the selected node's bindings; never edit shared sources. */
export function applySceneImageAtlas(
  document: MoldaSceneDocument,
  plan: SceneImageAtlasPlan,
  raster: SceneRgbaRaster,
  nextId: () => string = newId,
) {
  v.requireScene(
    document === plan.document,
    'revision',
    'A criação mudou. Prepare a imagem compartilhada novamente.',
  )
  const checked = validateSceneRgbaRaster(raster)
  const { layout, geometry, node } = plan
  v.requireScene(
    checked.width === layout.width && checked.height === layout.height,
    'raster',
    'Tamanho diferente da prévia preparada.',
  )
  const allocate = allocateSceneId(document, nextId)
  const imageId = allocate(),
    layerId = allocate()
  const replacements = new Map([...plan.materials.keys()].map((id) => [id, allocate()]))
  const materialId = (id: string) => replacements.get(id) ?? id
  const slotFor = (id: string) => {
    const slot = plan.tileByMaterial.get(id)
    return slot === undefined ? undefined : layout.slots[slot]
  }
  let changed: SceneGeometry
  if (geometry.kind === 'mesh') {
    changed = {
      ...geometry,
      faces: Object.fromEntries(
        Object.entries(geometry.faces).map(([id, face]) => {
          const source = face.materialId ?? node.materialId
          const slot = slotFor(source)
          return [
            id,
            slot
              ? {
                  ...face,
                  materialId: materialId(source),
                  corners: face.corners.map((corner) => ({
                    ...corner,
                    uv: sceneAtlasUv(layout, slot, corner.uv),
                  })),
                }
              : face,
          ]
        }),
      ),
    }
  } else {
    const surfaces = { ...geometry.surfaces }
    const identity: SceneUvTransform = { origin: [0, 0], u: [1, 0], v: [0, 1] }
    for (const id of new Set<ShapeFaceId>(plan.surfaceByFace!.values())) {
      const surface = geometry.surfaces[id]
      const source = surface?.materialId ?? node.materialId
      const slot = slotFor(source)
      if (!slot) continue
      const uv = surface?.uv ?? identity
      surfaces[id] = {
        materialId: materialId(source),
        uv: {
          origin: sceneAtlasUv(layout, slot, uv.origin),
          u: [(uv.u[0] * slot.width) / layout.width, (uv.u[1] * slot.height) / layout.height],
          v: [(uv.v[0] * slot.width) / layout.width, (uv.v[1] * slot.height) / layout.height],
        },
      }
    }
    changed = { ...geometry, surfaces }
  }
  if (plan.shared) changed = { ...changed, id: allocate() }
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((n) =>
      n.id === node.id
        ? { ...node, geometryId: changed.id, materialId: materialId(node.materialId) }
        : n,
    ),
    geometries: plan.shared
      ? [...document.geometries, changed]
      : document.geometries.map((g) => (g === geometry ? changed : g)),
    materials: [
      ...document.materials,
      ...[...plan.materials.values()].map(
        (m): SceneMaterial => ({
          ...m,
          id: materialId(m.id),
          baseColor: { kind: 'rgba', value: [0, 0, 0, 0] },
          colorImageId: imageId,
        }),
      ),
    ],
    images: [
      ...document.images,
      {
        id: imageId,
        name: 'Pinturas juntas',
        width: raster.width,
        height: raster.height,
        encoding: 'rgba',
        layers: [
          {
            id: layerId,
            name: 'Aparência reunida',
            visible: true,
            opacity: 1,
            pixels: raster.pixels.slice(),
          },
        ],
      },
    ],
  })
}
