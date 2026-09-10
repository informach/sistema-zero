import type { SceneAnimationClip, SceneAnimationTrack } from '../scene/animation'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from './fixtures'

export function sceneAnimationClip(nodeId = 'body'): SceneAnimationClip {
  return {
    id: 'clip',
    name: 'Acenar',
    duration: 2,
    fps: 24,
    loop: true,
    space: 'local-delta',
    tracks: [
      {
        nodeId,
        channel: 'translation',
        keys: [
          { time: 0, value: [0, 0, 0], interpolation: 'linear' },
          {
            time: 1.123456789123,
            value: [1.123456789, Number.MIN_VALUE, -2.234567891],
            interpolation: 'smooth',
          },
          { time: 2, value: [0, 0, 0], interpolation: 'step' },
        ],
      },
    ],
  }
}

export function animatedScene() {
  return { ...migrateLegacyModel(makeModel()).document, animations: [sceneAnimationClip()] }
}

export function sceneRotationTrack(nodeId = 'body'): SceneAnimationTrack {
  return {
    nodeId,
    channel: 'rotation',
    keys: [
      { time: 0, value: [0, 0, 0, 1], interpolation: 'linear' },
      { time: 2, value: [0, 0, 1, 0], interpolation: 'linear' },
    ],
  }
}
