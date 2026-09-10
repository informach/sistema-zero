import { newId } from '../core/id'
import { resolvePaletteColors } from '../core/sanitize'
import { requireEditableAppearance, sceneAppearanceUsage } from './appearanceUsage'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import type { MoldaSceneDocument, SceneGeometry, SceneImage, SceneMaterial } from './document'
import { type SceneRgbaRaster, validateSceneRgbaRaster } from './imageImport'
import { SCENE_LIMITS } from './limits'
import {
  SCENE_MATERIAL_IMAGE_FIELDS,
  SCENE_MATERIAL_IMAGE_KEYS,
  SCENE_MATERIAL_IMAGE_KINDS,
  type SceneMaterialImageField,
  type SceneMaterialImageKind,
  sceneMaterialImageIds,
} from './materialImages'
import { readSceneMaterial } from './readDocument'
import * as v from './validation'

export type SceneMaterialPatch = Partial<
  Pick<
    SceneMaterial,
    | 'name'
    | 'baseColor'
    | 'roughness'
    | 'metalness'
    | 'doubleSided'
    | 'normalStrength'
    | 'normalFlipY'
  >
> &
  Partial<Record<SceneMaterialImageField, string | null>> & {
    alphaMask?: SceneMaterial['alphaMask'] | null
  }

export function patchSceneMaterial(
  document: MoldaSceneDocument,
  id: string,
  patch: SceneMaterialPatch,
) {
  v.record(patch, 'material', [
    'name',
    'baseColor',
    'roughness',
    'metalness',
    'doubleSided',
    ...SCENE_MATERIAL_IMAGE_KEYS,
    'normalStrength',
    'normalFlipY',
    'alphaMask',
  ])
  const usage = sceneAppearanceUsage(document)
  const source = usage.index.materials.get(id)
  v.requireScene(source, 'material', 'Esse material não existe mais.')
  requireEditableAppearance(usage, usage.materials.get(id) ?? [])
  const draft = { ...source, ...patch }
  if (draft.alphaMask === null) delete draft.alphaMask
  for (const field of SCENE_MATERIAL_IMAGE_KEYS) if (draft[field] === null) delete draft[field]
  const next = readSceneMaterial(draft, 'material', resolvePaletteColors(document).length)
  const sameColor =
    source.baseColor.kind === 'palette'
      ? next.baseColor.kind === 'palette' && next.baseColor.index === source.baseColor.index
      : next.baseColor.kind === 'rgba' &&
        source.baseColor.value.every(
          (value, i) => next.baseColor.kind === 'rgba' && next.baseColor.value[i] === value,
        )
  if (
    sameColor &&
    next.name === source.name &&
    SCENE_MATERIAL_IMAGE_KEYS.every((field) => next[field] === source[field]) &&
    (next.normalStrength ?? 1) === (source.normalStrength ?? 1) &&
    (next.normalFlipY ?? false) === (source.normalFlipY ?? false) &&
    next.alphaMask?.cutoff === source.alphaMask?.cutoff &&
    next.alphaMask?.opacity === source.alphaMask?.opacity &&
    next.roughness === source.roughness &&
    next.metalness === source.metalness &&
    next.doubleSided === source.doubleSided
  )
    return document
  return finishSceneCommand({
    ...document,
    materials: document.materials.map((m) => (m.id === id ? next : m)),
  })
}

export function requireScenePaintCapacity(
  document: MoldaSceneDocument,
  addedBytes: number,
  addedLayers = 0,
  addedImages = 0,
) {
  let bytes = addedBytes
  let layers = addedLayers
  for (const image of document.images) {
    layers += image.layers.length
    for (const layer of image.layers) bytes += layer.pixels.byteLength
  }
  v.requireScene(
    bytes <= SCENE_LIMITS.pixelBytes &&
      layers <= SCENE_LIMITS.images &&
      document.images.length + addedImages <= SCENE_LIMITS.images,
    'images',
    'Essa mudança ultrapassa o espaço para pintura. Use uma imagem menor ou menos camadas.',
  )
}

/** New blank source is bound explicitly; old paint remains recoverable in the document library. */
export function createSceneColorImage(
  document: MoldaSceneDocument,
  materialId: string,
  input: { name: string; width: number; height: number; encoding: SceneImage['encoding'] },
  nextId: () => string = newId,
) {
  v.record(input, 'image', ['name', 'width', 'height', 'encoding'])
  return createSceneMaterialImage(document, materialId, { ...input, kind: 'color' }, nextId)
}

export function createSceneMaterialImage(
  document: MoldaSceneDocument,
  materialId: string,
  input: {
    kind: SceneMaterialImageKind
    name: string
    width: number
    height: number
    encoding: SceneImage['encoding']
  },
  nextId: () => string = newId,
) {
  v.record(input, 'image', ['kind', 'name', 'width', 'height', 'encoding'])
  const kind = v.choice(input.kind, SCENE_MATERIAL_IMAGE_KINDS, 'kind')
  const name = v.text(input.name, 'image.name')
  const width = v.number(input.width, 'image.width', 1, SCENE_LIMITS.imageSide, true)
  const height = v.number(input.height, 'image.height', 1, SCENE_LIMITS.imageSide, true)
  const encoding = v.choice(input.encoding, ['indexed', 'rgba'], 'image.encoding')
  v.requireScene(
    kind === 'color' || encoding === 'rgba',
    'encoding',
    'Mapas de detalhes precisam de cores livres.',
  )
  return bindNewMaterialImage(
    document,
    materialId,
    kind,
    { name, width, height, encoding },
    () => new Uint8Array(width * height * (encoding === 'rgba' ? 4 : 1)),
    nextId,
  )
}

export function importSceneColorImage(
  document: MoldaSceneDocument,
  materialId: string,
  name: string,
  raster: SceneRgbaRaster,
  nextId: () => string = newId,
) {
  return importSceneMaterialImage(document, materialId, 'color', name, raster, nextId)
}

export function importSceneMaterialImage(
  document: MoldaSceneDocument,
  materialId: string,
  kind: SceneMaterialImageKind,
  name: string,
  raster: SceneRgbaRaster,
  nextId: () => string = newId,
) {
  const checkedKind = v.choice(kind, SCENE_MATERIAL_IMAGE_KINDS, 'kind')
  const checkedName = v.text(name, 'image.name')
  const { width, height, pixels } = validateSceneRgbaRaster(raster)
  return bindNewMaterialImage(
    document,
    materialId,
    checkedKind,
    { name: checkedName, width, height, encoding: 'rgba' },
    () => pixels.slice(),
    nextId,
  )
}

function bindNewMaterialImage(
  document: MoldaSceneDocument,
  materialId: string,
  kind: SceneMaterialImageKind,
  metadata: Pick<SceneImage, 'name' | 'width' | 'height' | 'encoding'>,
  createPixels: () => Uint8Array,
  nextId: () => string,
) {
  const { name, width, height, encoding } = metadata
  const usage = sceneAppearanceUsage(document)
  v.requireScene(
    usage.index.materials.has(materialId),
    'material',
    'Esse material não existe mais.',
  )
  requireEditableAppearance(usage, usage.materials.get(materialId) ?? [])
  const bytes = width * height * (encoding === 'rgba' ? 4 : 1)
  requireScenePaintCapacity(document, bytes, 1, 1)
  const allocate = allocateSceneId(document, nextId)
  const id = allocate()
  const layerId = allocate()
  const image: SceneImage = {
    id,
    name,
    width,
    height,
    encoding,
    layers: [{ id: layerId, name, visible: true, opacity: 1, pixels: createPixels() }],
  }
  return finishSceneCommand({
    ...document,
    images: [...document.images, image],
    materials: document.materials.map((m) =>
      m.id === materialId ? { ...m, [SCENE_MATERIAL_IMAGE_FIELDS[kind]]: id } : m,
    ),
  })
}

/** Explicit isolation copies reachable paint once, remapping only this node's material bindings. */
export function copySceneMaterialForNode(
  document: MoldaSceneDocument,
  nodeId: string,
  materialId: string,
  nextId: () => string = newId,
) {
  const selected = sceneCommandSelection(document, [nodeId])
  requireEditableScene(selected)
  const usage = sceneAppearanceUsage(document)
  const node = selected.index.scene.nodes.get(nodeId)
  const source = usage.index.materials.get(materialId)
  v.requireScene(
    node?.kind === 'mesh' && source && usage.byNode.get(nodeId)?.has(materialId),
    'material',
    'Escolha um material desta peça.',
  )
  const geometry = selected.index.geometries.get(node.geometryId)!
  const images = [...sceneMaterialImageIds(source)].map((id) => usage.index.images.get(id)!)
  const bytes = images.reduce(
    (total, image) =>
      total + image.layers.reduce((total, layer) => total + layer.pixels.byteLength, 0),
    0,
  )
  requireScenePaintCapacity(
    document,
    bytes,
    images.reduce((total, image) => total + image.layers.length, 0),
    images.length,
  )
  const allocate = allocateSceneId(document, nextId)
  const id = allocate()
  const imageIds = new Map(images.map((image) => [image.id, allocate()]))
  const copiedImages = images.map((image) => ({
    ...image,
    id: imageIds.get(image.id)!,
    layers: image.layers.map((layer) => ({ ...layer, pixels: layer.pixels.slice() })),
  }))
  const copiedMaterial = { ...source, id }
  for (const field of SCENE_MATERIAL_IMAGE_KEYS)
    if (source[field] !== undefined) copiedMaterial[field] = imageIds.get(source[field])!
  let changed: SceneGeometry = geometry
  const remap = <T extends { materialId?: string }>(face: T): T =>
    face.materialId === materialId ? { ...face, materialId: id } : face
  if (geometry.kind === 'mesh') {
    if (Object.values(geometry.faces).some((f) => f.materialId === materialId))
      changed = {
        ...geometry,
        faces: Object.fromEntries(
          Object.entries(geometry.faces).map(([key, face]) => [key, remap(face)]),
        ),
      }
  } else if (Object.values(geometry.surfaces).some((f) => f.materialId === materialId))
    changed = {
      ...geometry,
      surfaces: Object.fromEntries(
        Object.entries(geometry.surfaces).map(([key, face]) => [key, remap(face)]),
      ),
    }
  const shared =
    changed !== geometry &&
    document.nodes.some((n) => n.kind === 'mesh' && n.id !== nodeId && n.geometryId === geometry.id)
  if (shared) changed = { ...changed, id: allocate() }
  return finishSceneCommand({
    ...document,
    nodes: document.nodes.map((n) =>
      n.id === nodeId
        ? {
            ...node,
            geometryId: changed.id,
            materialId: node.materialId === materialId ? id : node.materialId,
          }
        : n,
    ),
    geometries:
      changed === geometry
        ? document.geometries
        : shared
          ? [...document.geometries, changed]
          : document.geometries.map((g) => (g.id === geometry.id ? changed : g)),
    materials: [...document.materials, copiedMaterial],
    images: copiedImages.length ? [...document.images, ...copiedImages] : document.images,
  })
}
