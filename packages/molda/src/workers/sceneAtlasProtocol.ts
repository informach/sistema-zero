import { isMoldaAssetId } from '../core/id'
import type { SceneRgba } from '../scene/composite'
import type { SceneImage } from '../scene/document'
import { packSceneImageAtlas, type SceneAtlasTile } from '../scene/imageAtlas'
import { type SceneRgbaRaster, validateSceneRgbaRaster } from '../scene/imageImport'
import { SCENE_LIMITS } from '../scene/limits'
import { readSceneImage } from '../scene/readDocument'
import * as v from '../scene/validation'
import { readSceneWorkerPalette } from './scenePaletteProtocol'
import type { TaskReply } from './workerTask'

export interface SceneAtlasRequest {
  documentId: string
  revision: number
  images: SceneImage[]
  tiles: SceneAtlasTile[]
  palette: SceneRgba[]
}
export function readSceneAtlasRequest(raw: unknown): SceneAtlasRequest {
  const row = v.record(raw, 'request', ['documentId', 'revision', 'images', 'tiles', 'palette'])
  v.requireScene(isMoldaAssetId(row.documentId), 'documentId', 'Identificador de criação inválido.')
  const revision = v.number(row.revision, 'revision', 0, Number.MAX_SAFE_INTEGER, true)
  const palette = readSceneWorkerPalette(row.palette)
  const budget = { pixels: 0, layers: 0 }
  const images = v
    .list(row.images, 'images', SCENE_LIMITS.images)
    .map((raw, i) => readSceneImage(raw, `images[${i}]`, budget, palette.length))
  const index = v.uniqueById(images, 'images')
  const keys = new Set<string>(),
    used = new Set<string>()
  const tiles = v.list(row.tiles, 'tiles', SCENE_LIMITS.materials).map((raw): SceneAtlasTile => {
    const tile = v.record(raw, 'tile', ['imageId', 'base', 'preserveTransparentRgb'])
    const imageId = v.id(tile.imageId, 'imageId')
    v.requireScene(index.has(imageId), 'imageId', 'Imagem ausente.')
    const base = v.tuple(tile.base, 4, 'base').map((n) => v.number(n, 'base', 0, 1)) as SceneRgba
    const preserveTransparentRgb =
      tile.preserveTransparentRgb === undefined
        ? undefined
        : v.boolean(tile.preserveTransparentRgb, 'tile.preserveTransparentRgb')
    const key = JSON.stringify([imageId, base, preserveTransparentRgb ?? false])
    v.requireScene(!keys.has(key), 'tiles', 'Pintura repetida.')
    keys.add(key)
    used.add(imageId)
    return {
      imageId,
      base,
      ...(preserveTransparentRgb === undefined ? {} : { preserveTransparentRgb }),
    }
  })
  v.requireScene(used.size === images.length, 'images', 'Imagem fora da conversão.')
  packSceneImageAtlas(images, tiles)
  return { documentId: row.documentId, revision, images, tiles, palette }
}

export function sceneAtlasReply(request: SceneAtlasRequest, raster: SceneRgbaRaster) {
  return {
    documentId: request.documentId,
    revision: request.revision,
    type: 'result' as const,
    raster,
  }
}
export function readSceneAtlasReply(
  raw: unknown,
  expected: SceneAtlasRequest,
): TaskReply<SceneRgbaRaster, never> {
  const row = v.record(raw, 'reply')
  v.requireScene(
    row.documentId === expected.documentId && row.revision === expected.revision,
    'reply',
    'Esse resultado pertence a outra criação ou revisão.',
  )
  const type = v.choice(row.type, ['result', 'error'], 'type')
  if (type === 'error') {
    v.record(row, 'reply', ['documentId', 'revision', 'type', 'message'])
    return { type, message: v.text(row.message, 'message', 512) }
  }
  v.record(row, 'reply', ['documentId', 'revision', 'type', 'raster'])
  const raster = validateSceneRgbaRaster(row.raster)
  const layout = packSceneImageAtlas(expected.images, expected.tiles)
  v.requireScene(
    raster.width === layout.width && raster.height === layout.height,
    'raster',
    'Tamanho diferente da imagem preparada.',
  )
  return { type, result: { ...raster, pixels: raster.pixels.slice() } }
}
