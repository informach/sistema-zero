import { MoldaUnsupportedVersionError } from '../core/documentVersion'
import { bytesToBase64 } from '../core/skinCodec'
import type { MoldaSceneDocument, SceneImage, SceneImageLayer } from './document'
import { readSceneDocument } from './readDocument'
import { SceneValidationError } from './validation'

type SceneLayerJson = Omit<SceneImageLayer, 'pixels'> & { pixels: string }
type SceneImageJson = Omit<SceneImage, 'layers'> & { layers: SceneLayerJson[] }
export type MoldaSceneJson = Omit<MoldaSceneDocument, 'images'> & { images: SceneImageJson[] }

/** Internal codec, not an enabled persistence writer. Owns all returned arrays/objects. */
export function sceneToJson(source: MoldaSceneDocument): MoldaSceneJson {
  const read = readSceneDocument(source)
  if (read.status === 'unsupported') throw new MoldaUnsupportedVersionError(read.version)
  if (read.status === 'invalid') throw new SceneValidationError(read.path, read.message)
  return {
    ...read.document,
    images: read.document.images.map((image) => ({
      ...image,
      layers: image.layers.map(({ pixels, ...layer }) => ({
        ...layer,
        pixels: bytesToBase64(pixels),
      })),
    })),
  }
}
