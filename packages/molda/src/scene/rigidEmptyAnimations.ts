import type { SceneAnimationClip, SceneAnimationTrack } from './animation'
import type { MoldaSceneDocument } from './document'
import type { Quaternion } from './matrix'
import { composeTransform, transformPoint } from './matrix'
import { rigidSceneTransform } from './transformTrs'

/** Upgrade each decomposable affine node without letting unrelated shear decide clip space. */
export function rigidSceneDocument(document: MoldaSceneDocument): MoldaSceneDocument {
  if (document.nodes.every((node) => node.transform.kind === 'trs')) return document
  const nodes = document.nodes.map((node) => ({
    ...node,
    transform: rigidSceneTransform(node.transform),
  }))
  return nodes.some((node, i) => node.transform !== document.nodes[i]!.transform)
    ? { ...document, nodes }
    : document
}

function multiplyQuaternions(a: Quaternion, b: Quaternion): Quaternion {
  const [ax, ay, az, aw] = a
  const [bx, by, bz, bw] = b
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

/** Reinterpret compatible relative channels as rigid local channels, preserving their keys. */
export function rigidSceneAnimationClip(
  document: MoldaSceneDocument,
  clip: SceneAnimationClip,
): SceneAnimationClip {
  if (clip.space !== 'local-delta') return clip
  if (clip.tracks.length === 0 && !document.nodes.some((node) => node.transform.kind === 'trs'))
    return clip
  const nodes = new Map(document.nodes.map((node) => [node.id, node]))
  if (
    clip.tracks.some(
      (track) =>
        nodes.get(track.nodeId)?.transform.kind !== 'trs' ||
        track.keys.some((key) => key.incomingPivot),
    )
  )
    return clip
  const tracks = clip.tracks.map((track): SceneAnimationTrack => {
    const node = nodes.get(track.nodeId)!
    if (node.transform.kind !== 'trs') throw new Error('Expected rigid animation target')
    const rest = node.transform
    const matrix = composeTransform(rest)
    if (track.channel === 'translation')
      return {
        ...track,
        keys: track.keys.map((key) => ({
          ...key,
          value: transformPoint(matrix, key.value),
        })),
      }
    if (track.channel === 'rotation')
      return {
        ...track,
        keys: track.keys.map((key) => ({
          ...key,
          value: multiplyQuaternions(rest.rotation, key.value),
        })),
      }
    return {
      ...track,
      keys: track.keys.map((key) => ({
        ...key,
        value: key.value.map((value, axis) => value * rest.scale[axis]!) as typeof key.value,
      })),
    }
  })
  return { ...clip, space: 'local', tracks }
}

/** Rigid legacy poses can use native local channels; affine targets retain relative semantics. */
export function rigidEmptyAnimations(document: MoldaSceneDocument): MoldaSceneDocument {
  const rigid = rigidSceneDocument(document)
  if (!rigid.animations?.some((clip) => clip.space === 'local-delta')) return rigid
  const animations = rigid.animations!.map((clip) => rigidSceneAnimationClip(rigid, clip))
  return animations.some((clip, i) => clip !== rigid.animations![i])
    ? { ...rigid, animations }
    : rigid
}
