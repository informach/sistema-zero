import { Euler, Quaternion as ThreeQuaternion } from 'three'
import { COPY } from '../../../core/copy'
import type { Vec3 } from '../../../core/model'
import type { SceneAnimationClip, SceneAnimationTrack } from '../../../scene/animation'
import type { SceneAnimationKeyInput } from '../../../scene/animationCommands'
import type { ModelSceneNode } from '../../../scene/document'
import { type Quaternion, quaternionFromEulerXYZ } from '../../../scene/matrix'
import { sampleSceneAnimationTrack } from '../../../scene/sampleAnimation'
import { number, requireScene } from '../../../scene/validation'

export function sceneAnimationFormValue(
  node: ModelSceneNode,
  clip: SceneAnimationClip,
  channel: SceneAnimationTrack['channel'],
  time: number,
) {
  const track = clip.tracks.find((track) => track.nodeId === node.id && track.channel === channel)
  const exact = track?.keys.find((key) => key.time === time)
  const fallback =
    clip.space === 'local' && node.transform.kind === 'trs'
      ? node.transform[channel]
      : channel === 'rotation'
        ? ([0, 0, 0, 1] as Quaternion)
        : channel === 'scale'
          ? ([1, 1, 1] as Vec3)
          : ([0, 0, 0] as Vec3)
  const value = exact?.value ?? (track ? sampleSceneAnimationTrack(track, time) : fallback)
  const angles =
    channel === 'rotation'
      ? new Euler().setFromQuaternion(new ThreeQuaternion().fromArray(value).normalize(), 'XYZ')
      : null
  const display = angles
    ? [angles.x, angles.y, angles.z].map((v) => String(Number(((v * 180) / Math.PI).toFixed(6))))
    : value.map(String)
  return {
    value,
    display,
    exact,
    angles: angles
      ? ([angles.x, angles.y, angles.z].map((v) => (v * 180) / Math.PI) as Vec3)
      : null,
  }
}

export function sceneAnimationFormNumber(data: FormData, name: string) {
  const raw = data.get(name)
  requireScene(typeof raw === 'string' && raw.trim() !== '', name, COPY.scene.invalidNumber)
  return number(Number(raw), name)
}

/** Unchanged displayed angles keep the original quaternion, not an Euler-roundtripped replacement. */
export function sceneAnimationFormKey(
  nodeId: string,
  channel: SceneAnimationTrack['channel'],
  time: number,
  initial: ReturnType<typeof sceneAnimationFormValue>,
  data: FormData,
): SceneAnimationKeyInput {
  const values = [0, 1, 2].map((i) =>
    data.get(`axis${i}`) === initial.display[i]
      ? (initial.angles ?? initial.value)[i]!
      : sceneAnimationFormNumber(data, `axis${i}`),
  ) as Vec3
  const interpolation = data.get('interpolation')
  requireScene(
    interpolation === 'step' || interpolation === 'linear' || interpolation === 'smooth',
    'interpolation',
    COPY.scene.invalidNumber,
  )
  const unchanged = [0, 1, 2].every((i) => data.get(`axis${i}`) === initial.display[i])
  return channel === 'rotation'
    ? {
        nodeId,
        channel,
        key: {
          time,
          value: unchanged ? ([...initial.value] as Quaternion) : quaternionFromEulerXYZ(values),
          interpolation,
        },
      }
    : { nodeId, channel, key: { time, value: values, interpolation } }
}
