import type { Vec3 } from '../core/model'
import type { SceneAnimationClip, SceneAnimationKey, SceneAnimationTrack } from './animation'
import { SCENE_LIMITS } from './limits'
import { type Quaternion, UNIT_QUATERNION_TOLERANCE } from './matrix'
import * as v from './validation'

interface AnimationBudget {
  tracks: number
  keys: number
}

export function readSceneAnimationClip(
  raw: unknown,
  path = 'animation',
  budget: AnimationBudget = { tracks: 0, keys: 0 },
): SceneAnimationClip {
  const row = v.record(raw, path, ['id', 'name', 'duration', 'fps', 'loop', 'space', 'tracks'])
  const duration = v.number(
    row.duration,
    `${path}.duration`,
    Number.MIN_VALUE,
    SCENE_LIMITS.animationSeconds,
  )
  const tracks = v.list(row.tracks, `${path}.tracks`, SCENE_LIMITS.animationTracks - budget.tracks)
  budget.tracks += tracks.length
  const pairs = new Set<string>()
  return {
    id: v.id(row.id, `${path}.id`),
    name: v.text(row.name, `${path}.name`),
    duration,
    fps: v.number(row.fps, `${path}.fps`, 1, 120, true),
    loop: v.boolean(row.loop, `${path}.loop`),
    space: v.choice(row.space, ['local-delta', 'local'], `${path}.space`),
    tracks: tracks.map((raw, i): SceneAnimationTrack => {
      const trackPath = `${path}.tracks[${i}]`
      const track = v.record(raw, trackPath, ['nodeId', 'channel', 'keys'])
      const nodeId = v.id(track.nodeId, `${trackPath}.nodeId`)
      const channel = v.choice(
        track.channel,
        ['translation', 'rotation', 'scale'],
        `${trackPath}.channel`,
      )
      const pair = JSON.stringify([nodeId, channel])
      v.requireScene(!pairs.has(pair), trackPath, 'Essa peça já tem uma trilha desse movimento.')
      pairs.add(pair)
      const keys = v.list(track.keys, `${trackPath}.keys`, SCENE_LIMITS.animationKeys - budget.keys)
      budget.keys += keys.length
      v.requireScene(
        keys.length > 0,
        `${trackPath}.keys`,
        'A trilha precisa de pelo menos uma chave.',
      )
      let previous = -1
      const readKey = <T extends Vec3 | Quaternion>(
        raw: unknown,
        j: number,
        size: 3 | 4,
      ): SceneAnimationKey<T> => {
        const keyPath = `${trackPath}.keys[${j}]`
        const key = v.record(raw, keyPath, ['time', 'value', 'interpolation'])
        const time = v.number(key.time, `${keyPath}.time`, 0, duration)
        v.requireScene(
          time > previous,
          `${keyPath}.time`,
          'As chaves precisam estar em ordem, sem tempos repetidos.',
        )
        previous = time
        const value = v.tuple(key.value, size, `${keyPath}.value`) as T
        if (size === 4)
          v.requireScene(
            Math.abs(Math.hypot(...value) - 1) <= UNIT_QUATERNION_TOLERANCE,
            `${keyPath}.value`,
            'Rotação inválida.',
          )
        return {
          time,
          value,
          interpolation: v.choice(
            key.interpolation,
            ['step', 'linear', 'smooth'],
            `${keyPath}.interpolation`,
          ),
        }
      }
      return channel === 'rotation'
        ? { nodeId, channel, keys: keys.map((raw, j) => readKey<Quaternion>(raw, j, 4)) }
        : { nodeId, channel, keys: keys.map((raw, j) => readKey<Vec3>(raw, j, 3)) }
    }),
  }
}

/** Aggregate budgets are checked before allocating each track's owned key/value copies. */
export function readSceneAnimations(raw: unknown): SceneAnimationClip[] {
  const budget: AnimationBudget = { tracks: 0, keys: 0 }
  const clips = v
    .list(raw, 'animations', SCENE_LIMITS.animationClips)
    .map((clip, i) => readSceneAnimationClip(clip, `animations[${i}]`, budget))
  v.uniqueById(clips, 'animations')
  return clips
}
