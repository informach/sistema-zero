import type { Vec3 } from '../core/model'
import type { Quaternion } from './matrix'

/** Seconds remain Double precision; fps is a display/bake grid, never a source-data snap. */
export interface SceneAnimationKey<T extends Vec3 | Quaternion> {
  time: number
  value: T
  /** Interpolation from this key to the next; smooth is bounded ease-in/out, not a spline. */
  interpolation: 'step' | 'linear' | 'smooth'
}

export type SceneAnimationTrack = { nodeId: string } & (
  | { channel: 'translation' | 'scale'; keys: SceneAnimationKey<Vec3>[] }
  | { channel: 'rotation'; keys: SceneAnimationKey<Quaternion>[] }
)

export interface SceneAnimationClip {
  id: string
  name: string
  duration: number
  fps: number
  loop: boolean
  /** Native authoring: base affine matrix × animated TRS delta, preserving shear/rest pose.
   * Absolute local TRS supports imported clips without an approximate decomposition.
   */
  space: 'local-delta' | 'local'
  tracks: SceneAnimationTrack[]
}
