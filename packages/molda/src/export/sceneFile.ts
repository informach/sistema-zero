import { bytesToBase64 } from '../core/skinCodec'
import type { MoldaSceneDocument } from '../scene/document'
import { requireScene } from '../scene/validation'
import { MAX_SCENE_FILE_BYTES, type SceneFileFormat } from './sceneFileFormat'
import { encodeSceneGlb } from './sceneGlb'
import { SceneGlbLossError } from './sceneGlbReport'

/** Convert only our freshly encoded GLB. User files go through the import validators. */
export async function encodeSceneFile(
  document: MoldaSceneDocument,
  options: { format?: SceneFileFormat; allowLosses?: boolean; animatedPaint?: boolean } = {},
) {
  const format = options.format ?? 'glb'
  const result = encodeSceneGlb(document, {
    allowLosses: true,
    animatedPaint: format === 'obj' ? false : options.animatedPaint,
  })
  if (format !== 'glb') {
    const header = new DataView(result.bytes.buffer)
    const jsonEnd = 20 + header.getUint32(12, true)
    if (format === 'gltf') {
      const json = JSON.parse(new TextDecoder().decode(result.bytes.subarray(20, jsonEnd)))
      if (json.buffers?.length) {
        // Buffer length excludes GLB padding. Images keep their bufferView references.
        const buffer = json.buffers[0]
        buffer.uri = `data:application/octet-stream;base64,${bytesToBase64(result.bytes.subarray(jsonEnd + 8, jsonEnd + 8 + buffer.byteLength))}`
      }
      result.bytes = new TextEncoder().encode(JSON.stringify(json))
    } else {
      const { sceneGlbToObj } = await import('./sceneObj')
      const obj = sceneGlbToObj(result.bytes, document.id)
      result.bytes = obj.bytes
      result.issues.push(...obj.issues)
      result.clips = []
      result.stats = { ...result.stats, bones: 0, clips: 0, animationKeys: 0, animationChannels: 0 }
    }
  }
  requireScene(
    result.bytes.byteLength <= MAX_SCENE_FILE_BYTES,
    'export',
    'A cópia ficou grande demais. Reduza a quantidade de peças ou o tamanho das pinturas.',
  )
  if (result.issues.length && !options.allowLosses) throw new SceneGlbLossError(result.issues)
  return result
}
