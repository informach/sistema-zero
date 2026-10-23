import { newId } from '../core/id'
import { requireScenePaintCapacity } from './appearanceCommands'
import { allocateSceneId, finishSceneCommand } from './commandContext'
import { compositeSceneImage, sceneBaseColor, scenePalette } from './composite'
import type { MoldaSceneDocument, SceneImage, SceneMaterial } from './document'
import { convertSceneImageRgba } from './imageOperations'
import {
  paintSceneImageSegment,
  resolveScenePaintTarget,
  type ScenePaintColor,
  type ScenePaintSegment,
  type ScenePaintTarget,
} from './imagePaint'
import { SCENE_LIMITS } from './limits'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { requireScene } from './validation'

/** Erase the visible pixel, including its background, without flattening authored layers. */
export function eraseScenePaintCutout(
  document: MoldaSceneDocument,
  target: ScenePaintTarget,
  segment: Omit<ScenePaintSegment, 'color'>,
  nextId: () => string = newId,
): MoldaSceneDocument {
  const resolved = resolveScenePaintTarget(document, target)
  requireScene(
    resolved.imageKind === 'color',
    'paint',
    'Escolha a pintura de cor para deixar vazado.',
  )
  let image = resolved.image
  const source = resolved.material
  const palette = scenePalette(document)
  const base = sceneBaseColor(source, palette)
  // A zero-cutoff MASK draws even zero-alpha RGB. Materialize only those visible
  // colors underneath the existing layers before enabling real pixel cutouts.
  const zeroCutoff = source.alphaMask?.cutoff === 0
  const visible = zeroCutoff ? compositeSceneImage(image, palette, base, true) : undefined
  const visibleBacking = visible?.some((value, index) => index % 4 === 3 && value === 0) ?? false
  const binary =
    !source.alphaMask &&
    (base[3] === 0 || base[3] === 1) &&
    image.layers.every(
      (layer) =>
        !layer.visible ||
        layer.opacity === 0 ||
        (layer.opacity === 1 &&
          (image.encoding === 'indexed' ||
            layer.pixels.every((value, index) => index % 4 !== 3 || value === 0 || value === 255))),
    )
  const allocate = allocateSceneId(document, nextId)
  let material: SceneMaterial = source
  let retained: SceneImage | undefined
  let materials = document.materials

  // Color/base composition belongs to this material. Keep every other use of the
  // image (including normal/scalar maps on this same material) exactly as authored.
  const shared = document.materials.some((entry) =>
    SCENE_MATERIAL_IMAGE_KEYS.some(
      (field) => entry[field] === image.id && !(entry.id === source.id && field === 'colorImageId'),
    ),
  )
  if (shared) {
    requireScenePaintCapacity(
      document,
      image.layers.reduce((sum, layer) => sum + layer.pixels.byteLength, 0),
      image.layers.length,
      1,
    )
    retained = {
      ...image,
      id: allocate(),
      layers: image.layers.map((layer) => ({ ...layer, pixels: layer.pixels.slice() })),
    }
    materials = materials.map((entry) => {
      const copy = { ...entry }
      for (const field of SCENE_MATERIAL_IMAGE_KEYS)
        if (copy[field] === image.id && !(entry.id === source.id && field === 'colorImageId'))
          copy[field] = retained!.id
      return copy
    })
    material = materials.find((entry) => entry.id === source.id)!
  }
  if (base[3] > 0 || visibleBacking) {
    requireScene(
      image.layers.length < SCENE_LIMITS.layersPerImage,
      'layers',
      'Essa imagem já tem o máximo de camadas.',
    )
    const rgba = image.encoding === 'rgba' || source.baseColor.kind === 'rgba' || visibleBacking
    const convertedBytes =
      rgba && image.encoding === 'indexed'
        ? image.width * image.height * image.layers.length * 3
        : 0
    requireScenePaintCapacity(
      { ...document, images: retained ? [...document.images, retained] : document.images },
      convertedBytes + image.width * image.height * (rgba ? 4 : 1),
      1,
    )
    if (rgba && image.encoding === 'indexed') image = convertSceneImageRgba(image, palette)
    const pixels = new Uint8Array(image.width * image.height * (rgba ? 4 : 1))
    if (rgba) {
      const color = base.map((value) => Math.round(value * 255))
      for (let offset = 0; offset < pixels.length; offset += 4) {
        if (visible && visible[offset + 3] === 0) {
          pixels.set(visible.subarray(offset, offset + 4), offset)
          pixels[offset + 3] = 255
        } else pixels.set(color, offset)
      }
    } else if (source.baseColor.kind === 'palette') pixels.fill(source.baseColor.index)
    let id = allocate()
    while (image.layers.some((layer) => layer.id === id)) id = allocate()
    image = {
      ...image,
      layers: [{ id, name: 'Cor de fundo', visible: true, opacity: 1, pixels }, ...image.layers],
    }
    material = { ...material, baseColor: { kind: 'rgba', value: [0, 0, 0, 0] } }
  }
  const empty: ScenePaintColor = image.encoding === 'indexed' ? 0 : [0, 0, 0, 0]
  for (const layer of image.layers)
    if (layer.visible && layer.opacity > 0)
      image = paintSceneImageSegment(image, layer.id, { ...segment, color: empty }, palette.length)
  // Imported MASK policies remain intact; new cutouts use binary pixel edges.
  if (zeroCutoff)
    // Zero cutoff ignored the old opacity for visibility. Every nonzero byte
    // must survive the new cutoff, including pixels with just 1/255 alpha.
    material = { ...material, alphaMask: { cutoff: 0.5 / 255, opacity: 1 } }
  else if (binary && !material.alphaMask)
    material = {
      ...material,
      alphaMask: { cutoff: 0.5, opacity: 1 },
    }
  if (image === resolved.image && material === source && !retained) return document
  return finishSceneCommand({
    ...document,
    materials: materials.map((entry) => (entry.id === source.id ? material : entry)),
    images: [
      ...document.images.map((entry) => (entry.id === image.id ? image : entry)),
      ...(retained ? [retained] : []),
    ],
  })
}
