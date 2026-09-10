import { newId } from '../core/id'
import type { Vec3 } from '../core/model'
import type { SceneAnimationTrack } from './animation'
import {
  allocateSceneId,
  finishSceneCommand,
  requireEditableScene,
  sceneCommandSelection,
} from './commandContext'
import type { MoldaSceneDocument } from './document'
import { SCENE_LIMITS } from './limits'
import { quaternionFromEulerXYZ } from './matrix'
import { readSceneAnimationClip } from './readAnimation'
import * as v from './validation'

export interface SceneAnimationPresetOptions {
  kind: 'bounce' | 'sway' | 'spin'
  name: string
  duration: number
  axis: 'x' | 'y' | 'z'
  /** Local units for bounce, degrees for sway, whole turns for spin. */
  amount: number
}

/** Returns an editable, independent clip. The caller previews this candidate before committing it. */
export function createSceneAnimationPreset(
  document: MoldaSceneDocument,
  ids: readonly string[],
  options: SceneAnimationPresetOptions,
  nextId = newId,
) {
  const selected = sceneCommandSelection(document, ids)
  requireEditableScene(selected)
  v.requireScene(
    selected.roots.size > 0,
    'nodes',
    'Escolha uma peça ou grupo para experimentar um movimento.',
  )
  const row = v.record(options, 'preset', ['kind', 'name', 'duration', 'axis', 'amount'])
  const kind = v.choice(row.kind, ['bounce', 'sway', 'spin'], 'kind')
  const duration = v.number(
    row.duration,
    'duration',
    Number.MIN_VALUE,
    SCENE_LIMITS.animationSeconds,
  )
  const name = v.text(v.text(row.name, 'name', 48).trim(), 'name', 48)
  const axis = ['x', 'y', 'z'].indexOf(v.choice(row.axis, ['x', 'y', 'z'], 'axis'))
  const maximum = kind === 'bounce' ? 1000 : kind === 'sway' ? 90 : 10
  const amount = v.number(row.amount, 'amount', -maximum, maximum, kind === 'spin')
  const steps = kind === 'bounce' ? 2 : kind === 'sway' ? 4 : Math.max(1, Math.abs(amount) * 4)
  v.requireScene(
    selected.index.animations.size < SCENE_LIMITS.animationClips &&
      selected.index.animationTrackCount + selected.roots.size <= SCENE_LIMITS.animationTracks &&
      selected.index.animationKeyCount + selected.roots.size * (steps + 1) <=
        SCENE_LIMITS.animationKeys,
    'preset',
    'Esse movimento ultrapassa o orçamento de animação da criação.',
  )
  const tracks = [...selected.roots].map((nodeId): SceneAnimationTrack => {
    const keys = Array.from({ length: steps + 1 }, (_, i) => {
      const value: Vec3 = [0, 0, 0]
      value[axis] =
        kind === 'bounce'
          ? i === 1
            ? amount
            : 0
          : kind === 'sway'
            ? [0, amount, 0, -amount, 0][i]!
            : amount * 360 * (i / steps)
      return {
        time: i === steps ? duration : duration * (i / steps),
        value,
        interpolation: kind === 'spin' ? ('linear' as const) : ('smooth' as const),
      }
    })
    return kind === 'bounce'
      ? { nodeId, channel: 'translation', keys }
      : {
          nodeId,
          channel: 'rotation',
          keys: keys.map((key) => ({ ...key, value: quaternionFromEulerXYZ(key.value) })),
        }
  })
  const clip = readSceneAnimationClip({
    id: allocateSceneId(document, nextId)(),
    name,
    duration,
    fps: 24,
    loop: true,
    space: 'local-delta',
    tracks,
  })
  return finishSceneCommand({ ...document, animations: [...(document.animations ?? []), clip] })
}
