import type { SceneAnimationClip } from '../scene/animation'
import { SCENE_LIMITS } from '../scene/limits'
import * as v from '../scene/validation'
import { readSceneGlbRequest, type SceneGlbRequest } from './sceneGlbProtocol'

const INTERPOLATIONS = ['step', 'linear', 'smooth'] as const
const STRIDE = 5 // time + up to four Double components; unused vector component is zero.

/** Private worker transport only. Not a document version, import format or persisted schema. */
function packAnimations(clips: readonly SceneAnimationClip[]) {
  v.requireScene(clips.length <= SCENE_LIMITS.animationClips, 'clips', 'Muitos movimentos.')
  let keyCount = 0,
    trackCount = 0
  for (const clip of clips) {
    v.record(clip, 'clip', ['id', 'name', 'duration', 'fps', 'loop', 'space', 'tracks'])
    trackCount += clip.tracks.length
    v.number(trackCount, 'tracks', 0, SCENE_LIMITS.animationTracks, true)
    for (const track of clip.tracks) {
      v.record(track, 'track', ['nodeId', 'channel', 'keys'])
      keyCount += track.keys.length
      v.number(keyCount, 'keys', 0, SCENE_LIMITS.animationKeys, true)
    }
  }
  const values = new Float64Array(keyCount * STRIDE),
    curves = new Uint8Array(keyCount)
  let cursor = 0
  return {
    values,
    curves,
    clips: clips.map((clip) => ({
      ...clip,
      tracks: clip.tracks.map((track) => {
        const { keys, ...metadata } = track
        const size = track.channel === 'rotation' ? 4 : 3
        for (const key of keys) {
          // Packing may not coerce malformed caller data into valid keys or hide unknown fields.
          v.record(key, 'key', ['time', 'value', 'interpolation'])
          v.requireScene(
            typeof key.time === 'number' && Array.isArray(key.value) && key.value.length === size,
            'key',
            'Chave inválida.',
          )
          const offset = cursor * STRIDE
          values[offset] = key.time
          for (let i = 0; i < size; i++) {
            const value = key.value[i]
            v.requireScene(typeof value === 'number', 'key.value', 'Valor de chave inválido.')
            values[offset + 1 + i] = value
          }
          const curve = INTERPOLATIONS.indexOf(key.interpolation)
          v.requireScene(curve >= 0, 'key.interpolation', 'Curva inválida.')
          curves[cursor++] = curve
        }
        return { ...metadata, keyCount: keys.length }
      }),
    })),
  }
}

/** Owns only the derived animation arrays. Live document geometry/pixels are still structured-cloned. */
export function packSceneGlbRequest(request: SceneGlbRequest) {
  v.record(request, 'request', ['documentId', 'revision', 'animatedPaint', 'document'])
  const { animations, ...document } = request.document
  return {
    ...request,
    version: 1 as const,
    document,
    ...(animations === undefined ? {} : { animations: packAnimations(animations) }),
  }
}

/** Structural reconstruction only; the enclosing reader MUST validate the full native document. */
function unpackAnimations(raw: unknown) {
  const packet = v.record(raw, 'animations', ['clips', 'values', 'curves'])
  const { values, curves } = packet
  v.requireScene(
    curves instanceof Uint8Array &&
      curves.buffer instanceof ArrayBuffer &&
      curves.byteOffset === 0 &&
      curves.byteLength === curves.buffer.byteLength &&
      curves.length <= SCENE_LIMITS.animationKeys,
    'curves',
    'Curvas fora do orçamento.',
  )
  v.requireScene(
    values instanceof Float64Array &&
      values.buffer instanceof ArrayBuffer &&
      values.byteOffset === 0 &&
      values.byteLength === values.buffer.byteLength &&
      values.length === curves.length * STRIDE,
    'values',
    'Valores de animação inválidos.',
  )
  let cursor = 0,
    trackCount = 0
  const clips = v.list(packet.clips, 'clips', SCENE_LIMITS.animationClips).map((raw) => {
    const clip = v.record(raw, 'clip', ['id', 'name', 'duration', 'fps', 'loop', 'space', 'tracks'])
    const tracks = v.list(clip.tracks, 'tracks', SCENE_LIMITS.animationTracks - trackCount)
    trackCount += tracks.length
    return {
      ...clip,
      tracks: tracks.map((raw) => {
        const track = v.record(raw, 'track', ['nodeId', 'channel', 'keyCount'])
        const count = v.number(track.keyCount, 'keyCount', 1, curves.length - cursor, true)
        const channel = v.choice(track.channel, ['translation', 'rotation', 'scale'], 'channel')
        const keys = Array.from({ length: count }, () => {
          const offset = cursor * STRIDE
          const interpolation = INTERPOLATIONS[curves[cursor++]!]
          v.requireScene(interpolation !== undefined, 'curve', 'Curva inválida.')
          if (channel !== 'rotation')
            v.requireScene(values[offset + 4] === 0, 'value', 'Componente extra de chave.')
          return {
            time: values[offset],
            interpolation,
            value:
              channel === 'rotation'
                ? [values[offset + 1], values[offset + 2], values[offset + 3], values[offset + 4]]
                : [values[offset + 1], values[offset + 2], values[offset + 3]],
          }
        })
        return { nodeId: track.nodeId, channel, keys }
      }),
    }
  })
  v.requireScene(cursor === curves.length, 'keys', 'Chaves sem trilha.')
  return clips
}

/** All reconstructed times, values, clip metadata, references and domain budgets use the existing reader. */
export function readSceneGlbWireRequest(raw: unknown): SceneGlbRequest {
  const row = v.record(raw, 'request', [
    'version',
    'documentId',
    'revision',
    'animatedPaint',
    'document',
    'animations',
  ])
  v.requireScene(row.version === 1, 'version', 'Transporte de exportação não suportado.')
  const document = v.record(row.document, 'document')
  v.requireScene(
    !Object.hasOwn(document, 'animations'),
    'animations',
    'Animações duplicadas no transporte.',
  )
  return readSceneGlbRequest({
    documentId: row.documentId,
    revision: row.revision,
    animatedPaint: row.animatedPaint,
    document: {
      ...document,
      ...(row.animations === undefined ? {} : { animations: unpackAnimations(row.animations) }),
    },
  })
}
