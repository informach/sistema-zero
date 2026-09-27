/** Unreleased v2 reader. Intentionally separate from the destructive v1 repair/snap path. */

import { isMoldaAssetId } from '../core/id'
import { isTexelsPerUnit, MOLDA_LIMITS } from '../core/limits'
import { isSnap, type MoldaPaletteFields, type Vec3 } from '../core/model'
import { isPaletteId, PALETTE_SIZE } from '../core/palette'
import { base64ToBytes } from '../core/skinCodec'
import { readSceneAlphaMask } from './alphaMask'
import { readSceneBendLimit } from './bendLimit'
import { sceneBounds } from './bounds'
import type {
  ModelSceneNode,
  MoldaSceneDocument,
  SceneImage,
  SceneImageLayer,
  SceneMaterial,
  SceneMirror,
} from './document'
import { indexSceneDocument } from './documentIndex'
import { readSceneImageFlipbook } from './imageFlipbook'
import { SCENE_LIMITS } from './limits'
import { SCENE_MATERIAL_IMAGE_KEYS } from './materialImages'
import { type AffineMatrix, composeTransform, type Quaternion, type SceneTransform } from './matrix'
import { readSceneAnimations } from './readAnimation'
import { readSceneGeometry } from './readGeometry'
import { readSceneSkins } from './readSkin'
import * as v from './validation'

interface ReadBudget {
  vertices: number
  triangles: number
  edges: number
  pixels: number
  layers: number
}

function creationId(raw: unknown): string {
  v.requireScene(isMoldaAssetId(raw), 'id', 'Identificador de criação inválido.')
  return raw
}

function transform(raw: unknown, path: string): SceneTransform {
  const kind = v.choice(v.record(raw, path).kind, ['trs', 'affine'], `${path}.kind`)
  const row = v.record(
    raw,
    path,
    kind === 'trs' ? ['kind', 'translation', 'rotation', 'scale'] : ['kind', 'matrix'],
  )
  const result: SceneTransform =
    kind === 'trs'
      ? {
          kind,
          translation: v.tuple(row.translation, 3, `${path}.translation`) as Vec3,
          rotation: v.tuple(row.rotation, 4, `${path}.rotation`) as Quaternion,
          scale: v.tuple(row.scale, 3, `${path}.scale`) as Vec3,
        }
      : { kind, matrix: v.tuple(row.matrix, 16, `${path}.matrix`) as AffineMatrix }
  composeTransform(result)
  return result
}

function node(raw: unknown, path: string): ModelSceneNode {
  const kind = v.choice(v.record(raw, path).kind, ['mesh', 'group', 'locator'], `${path}.kind`)
  const row = v.record(raw, path, [
    'id',
    'name',
    'parentId',
    'transform',
    'kind',
    'hidden',
    'locked',
    ...(kind === 'mesh' ? ['geometryId', 'materialId'] : ['bendLimit']),
  ])
  const base = {
    id: v.id(row.id, `${path}.id`),
    name: v.text(row.name, `${path}.name`),
    parentId: row.parentId === null ? null : v.id(row.parentId, `${path}.parentId`),
    transform: transform(row.transform, `${path}.transform`),
    hidden: v.boolean(row.hidden, `${path}.hidden`),
    locked: v.boolean(row.locked, `${path}.locked`),
  }
  return kind === 'mesh'
    ? {
        ...base,
        kind,
        geometryId: v.id(row.geometryId, `${path}.geometryId`),
        materialId: v.id(row.materialId, `${path}.materialId`),
      }
    : {
        ...base,
        kind,
        ...(row.bendLimit === undefined
          ? {}
          : { bendLimit: readSceneBendLimit(row.bendLimit, `${path}.bendLimit`) }),
      }
}

export function readSceneMaterial(raw: unknown, path: string, paletteSize: number): SceneMaterial {
  const row = v.record(raw, path, [
    'id',
    'name',
    'baseColor',
    ...SCENE_MATERIAL_IMAGE_KEYS,
    'normalStrength',
    'normalFlipY',
    'alphaMask',
    'roughness',
    'metalness',
    'doubleSided',
  ])
  const colorKind = v.choice(
    v.record(row.baseColor, `${path}.baseColor`).kind,
    ['palette', 'rgba'],
    `${path}.baseColor.kind`,
  )
  const color = v.record(row.baseColor, `${path}.baseColor`, [
    'kind',
    colorKind === 'palette' ? 'index' : 'value',
  ])
  const baseColor: SceneMaterial['baseColor'] =
    colorKind === 'palette'
      ? {
          kind: colorKind,
          index: v.number(color.index, `${path}.baseColor.index`, 1, paletteSize - 1, true),
        }
      : {
          kind: colorKind,
          value: v
            .tuple(color.value, 4, `${path}.baseColor.value`)
            .map((component) => v.number(component, path, 0, 1)) as [
            number,
            number,
            number,
            number,
          ],
        }
  return {
    id: v.id(row.id, `${path}.id`),
    name: v.text(row.name, `${path}.name`),
    baseColor,
    ...Object.fromEntries(
      SCENE_MATERIAL_IMAGE_KEYS.flatMap((field) =>
        row[field] === undefined ? [] : [[field, v.id(row[field], `${path}.${field}`)]],
      ),
    ),
    ...(row.normalStrength === undefined
      ? {}
      : { normalStrength: v.number(row.normalStrength, `${path}.normalStrength`, 0, 4) }),
    ...(row.normalFlipY === undefined
      ? {}
      : { normalFlipY: v.boolean(row.normalFlipY, `${path}.normalFlipY`) }),
    ...(row.alphaMask === undefined
      ? {}
      : { alphaMask: readSceneAlphaMask(row.alphaMask, `${path}.alphaMask`) }),
    roughness: v.number(row.roughness, `${path}.roughness`, 0, 1),
    metalness: v.number(row.metalness, `${path}.metalness`, 0, 1),
    doubleSided: v.boolean(row.doubleSided, `${path}.doubleSided`),
  }
}

export function readSceneImage(
  raw: unknown,
  path: string,
  budget: Pick<ReadBudget, 'pixels' | 'layers'>,
  paletteSize: number,
): SceneImage {
  return readSceneImageStructure(raw, path, budget, (rawPixels, bytes, path, encoding) => {
    let pixels: Uint8Array | null
    if (rawPixels instanceof Uint8Array) {
      v.requireScene(rawPixels.byteLength === bytes, path, 'Quantidade de pixels inválida.')
      pixels = new Uint8Array(rawPixels)
    } else {
      v.requireScene(
        typeof rawPixels === 'string' && rawPixels.length === Math.ceil(bytes / 3) * 4,
        path,
        'Bitmap base64 inválido.',
      )
      pixels = base64ToBytes(rawPixels)
    }
    v.requireScene(
      pixels !== null && pixels.length === bytes,
      path,
      'Quantidade de pixels inválida.',
    )
    if (encoding === 'indexed') {
      for (const index of pixels)
        v.requireScene(index < paletteSize, path, 'Índice de cor ausente.')
    }
    return pixels
  })
}

export type SceneImageStructure<Pixel> = Omit<SceneImage, 'layers'> & {
  layers: Array<Omit<SceneImageLayer, 'pixels'> & { pixels: Pixel }>
}

/** Shared field reader. Pixel interpretation belongs to the selected inline/storage codec. */
export function readSceneImageStructure<Pixel>(
  raw: unknown,
  path: string,
  budget: Pick<ReadBudget, 'pixels' | 'layers'>,
  readPixels: (
    raw: unknown,
    bytes: number,
    path: string,
    encoding: SceneImage['encoding'],
  ) => Pixel,
): SceneImageStructure<Pixel> {
  const row = v.record(raw, path, [
    'id',
    'name',
    'width',
    'height',
    'encoding',
    'layers',
    'flipbook',
  ])
  const width = v.number(row.width, `${path}.width`, 1, SCENE_LIMITS.imageSide, true)
  const height = v.number(row.height, `${path}.height`, 1, SCENE_LIMITS.imageSide, true)
  const flipbook =
    row.flipbook === undefined ? undefined : readSceneImageFlipbook(row.flipbook, { width, height })
  const encoding = v.choice(row.encoding, ['indexed', 'rgba'], `${path}.encoding`)
  const bytes = width * height * (encoding === 'rgba' ? 4 : 1)
  const layers = v.list(row.layers, `${path}.layers`, SCENE_LIMITS.layersPerImage)
  budget.layers += layers.length
  budget.pixels += bytes * layers.length
  v.requireScene(
    layers.length > 0 &&
      budget.layers <= SCENE_LIMITS.images &&
      budget.pixels <= SCENE_LIMITS.pixelBytes,
    path,
    'Camadas fora do orçamento.',
  )
  const parsedLayers = layers.map((raw, i) => {
    const layerPath = `${path}.layers[${i}]`
    const layer = v.record(raw, layerPath, ['id', 'name', 'visible', 'opacity', 'pixels'])
    const pixels = readPixels(layer.pixels, bytes, `${layerPath}.pixels`, encoding)
    return {
      id: v.id(layer.id, `${layerPath}.id`),
      name: v.text(layer.name, `${layerPath}.name`),
      pixels,
      visible: v.boolean(layer.visible, `${layerPath}.visible`),
      opacity: v.number(layer.opacity, `${layerPath}.opacity`, 0, 1),
    }
  })
  v.uniqueById(parsedLayers, `${path}.layers`)
  return {
    id: v.id(row.id, `${path}.id`),
    name: v.text(row.name, `${path}.name`),
    width,
    height,
    encoding,
    layers: parsedLayers,
    ...(flipbook ? { flipbook } : {}),
  }
}

function palette(row: Record<string, unknown>): MoldaPaletteFields {
  v.requireScene(
    row.paletteId === 'custom' || isPaletteId(row.paletteId),
    'paletteId',
    'Paleta desconhecida.',
  )
  const result: MoldaPaletteFields = { paletteId: row.paletteId }
  const hex = (raw: unknown, path: string, empty = false): string => {
    const color = v.text(raw, path, 7, empty)
    v.requireScene(
      (empty && color === '') || /^#[a-fA-F0-9]{6}$/.test(color),
      path,
      'Cor inválida.',
    )
    return color
  }
  if (row.customPalette !== undefined || row.paletteId === 'custom') {
    const custom = v.record(row.customPalette, 'customPalette', ['name', 'colors'])
    const colors = v
      .list(custom.colors, 'customPalette.colors', PALETTE_SIZE)
      .map((color) => hex(color, 'customPalette.colors', true))
    v.requireScene(
      colors.length === PALETTE_SIZE && colors[0] === '' && colors.some(Boolean),
      'customPalette.colors',
      'Paleta vazia ou sem índice reservado.',
    )
    result.customPalette = {
      name: v.text(custom.name, 'customPalette.name', MOLDA_LIMITS.maxNameChars),
      colors,
    }
  }
  if (row.extraColors !== undefined)
    result.extraColors = v
      .list(row.extraColors, 'extraColors', MOLDA_LIMITS.maxExtraColors)
      .map((color) => hex(color, 'extraColors'))
  return result
}

export type SceneDocumentStructure<Image> = Omit<MoldaSceneDocument, 'images'> & {
  images: Image[]
}
export type SceneDocumentStructureRead<Image> =
  | { status: 'valid'; document: SceneDocumentStructure<Image> }
  | { status: 'unsupported'; version: number; raw: unknown }
  | { status: 'invalid'; path: string; message: string; raw: unknown }
export type SceneDocumentRead = SceneDocumentStructureRead<SceneImage>

/** Internal/dev reader only; callers retain raw on failure. The public capability is still v1. */
export function readSceneDocument(raw: unknown): SceneDocumentRead {
  const read = readSceneDocumentStructure(raw, (rawImages, paletteSize) => {
    const budget = { pixels: 0, layers: 0 }
    return v
      .list(rawImages, 'images', SCENE_LIMITS.images)
      .map((raw, i) => readSceneImage(raw, `images[${i}]`, budget, paletteSize))
  })
  if (read.status !== 'valid') return read
  try {
    sceneBounds(indexSceneDocument(read.document))
    return read
  } catch (error) {
    return {
      status: 'invalid',
      raw,
      path: error instanceof v.SceneValidationError ? error.path : '$',
      message: error instanceof Error ? error.message : 'Documento inválido.',
    }
  }
}

/**
 * Owns native fields without assuming pixels are loaded. This is NOT a complete
 * document validation: hydrated callers must still use readSceneDocument for
 * cross-references, bounds, animation and skin consistency. No public entrypoint.
 */
export function readSceneDocumentStructure<Image>(
  raw: unknown,
  readImages: (raw: unknown, paletteSize: number) => Image[],
): SceneDocumentStructureRead<Image> {
  try {
    const row = v.record(raw, '$')
    const version = v.number(row.formatVersion, 'formatVersion', 1, Number.MAX_SAFE_INTEGER, true)
    if (version !== 2) return { status: 'unsupported', version, raw }
    v.record(row, '$', [
      'id',
      'name',
      'createdAt',
      'updatedAt',
      'thumb',
      'formatVersion',
      'kind',
      'paletteId',
      'customPalette',
      'extraColors',
      'settings',
      'nodes',
      'geometries',
      'materials',
      'images',
      'mirrors',
      'animations',
      'skins',
    ])
    v.requireScene(row.kind === 'model', 'kind', 'Tipo de criação desconhecido.')
    const settings = v.record(row.settings, 'settings', ['texelsPerUnit', 'snap', 'mirrorX'])
    v.requireScene(
      isTexelsPerUnit(settings.texelsPerUnit) && isSnap(settings.snap),
      'settings',
      'Configuração de grade inválida.',
    )
    const paletteFields = palette(row)
    const paletteSize = PALETTE_SIZE + (paletteFields.extraColors?.length ?? 0)
    const budget: ReadBudget = { vertices: 0, triangles: 0, edges: 0, pixels: 0, layers: 0 }
    const animations =
      row.animations === undefined ? undefined : readSceneAnimations(row.animations)
    const document: SceneDocumentStructure<Image> = {
      id: creationId(row.id),
      name: v.text(row.name, 'name', MOLDA_LIMITS.maxNameChars),
      createdAt: v.number(row.createdAt, 'createdAt'),
      updatedAt: v.number(row.updatedAt, 'updatedAt'),
      ...(row.thumb === undefined
        ? {}
        : { thumb: v.text(row.thumb, 'thumb', MOLDA_LIMITS.maxThumbChars) }),
      kind: 'model',
      formatVersion: 2,
      ...(animations === undefined ? {} : { animations }),
      ...(row.skins === undefined ? {} : { skins: readSceneSkins(row.skins) }),
      ...paletteFields,
      settings: {
        texelsPerUnit: settings.texelsPerUnit,
        snap: settings.snap,
        mirrorX: v.boolean(settings.mirrorX, 'settings.mirrorX'),
      },
      nodes: v
        .list(row.nodes, 'nodes', SCENE_LIMITS.nodes)
        .map((raw, i) => node(raw, `nodes[${i}]`)),
      geometries: v
        .list(row.geometries, 'geometries', SCENE_LIMITS.geometries)
        .map((raw, i) => readSceneGeometry(raw, `geometries[${i}]`, budget)),
      materials: v
        .list(row.materials, 'materials', SCENE_LIMITS.materials)
        .map((raw, i) => readSceneMaterial(raw, `materials[${i}]`, paletteSize)),
      images: readImages(row.images, paletteSize),
      mirrors: v
        .list(row.mirrors, 'mirrors', SCENE_LIMITS.renderedParts)
        .map((raw, i): SceneMirror => {
          const path = `mirrors[${i}]`
          const mirror = v.record(raw, path, ['id', 'name', 'sourceId', 'axis', 'offset'])
          return {
            id: v.id(mirror.id, `${path}.id`),
            name: v.text(mirror.name, `${path}.name`),
            sourceId: v.id(mirror.sourceId, `${path}.sourceId`),
            axis: v.choice(mirror.axis, ['x', 'y', 'z'], `${path}.axis`),
            offset: v.number(mirror.offset, `${path}.offset`),
          }
        }),
    }
    if (document.thumb !== undefined)
      v.requireScene(document.thumb.startsWith('data:image/'), 'thumb', 'Miniatura inválida.')
    return { status: 'valid', document }
  } catch (error) {
    return {
      status: 'invalid',
      raw,
      path: error instanceof v.SceneValidationError ? error.path : '$',
      message: error instanceof Error ? error.message : 'Documento inválido.',
    }
  }
}
