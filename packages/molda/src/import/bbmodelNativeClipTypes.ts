import type { BbmodelAnimationPoseOptions } from './bbmodelAnimationPose'
import type { BbmodelNumericAnimationTrack } from './bbmodelAnimationTrackTypes'
import type { BbmodelTransform } from './bbmodelTransforms'

/** Private, immutable drafts AFTER binding, source flags and metadata policies are resolved. */
export interface BbmodelNativeClipDraft {
  clip: number
  path: string
  name: string | null
  duration: number
  fps: number
  /** Native standalone playback choice, not source once/hold/loop equivalence. */
  loop: boolean
  /** Resolved finite nonnegative multiplier; no Molang evaluation in the assembler. */
  weight: number
  catmullLoopNeighbours: boolean
  tracks: readonly {
    path: string
    nodeId: string
    base: BbmodelTransform
    track: BbmodelNumericAnimationTrack
  }[]
}

export interface BbmodelNativeClipOptions extends BbmodelAnimationPoseOptions {
  adaptation?: 'reject' | 'continuous-sampled'
  /** A native key has one value. Sampling pre/post cannot preserve its instantaneous jump. */
  discontinuities?: 'reject' | 'sample-pre'
}

export interface BbmodelNativeClipTrackReport {
  path: string
  nodeId: string
  channel: BbmodelNumericAnimationTrack['channel']
  sampling: 'authored' | 'grid'
  sourceKeys: number
  keys: number
  prePostKeys: number
  reordered: boolean
  migration: { pointAxes: number; bezierValueAxes: number }
  /** Counts of sampled local components, not unique axes or proven visual losses. */
  underflowComponents: number
  zeroScaleComponents: number
}

export interface BbmodelNativeClipReport {
  clip: number
  clipId: string
  path: string
  nameChange: 'name-generated' | 'name-shortened' | null
  duration: number
  fps: number
  loop: boolean
  weight: number
  catmullLoopNeighbours: boolean
  tracks: BbmodelNativeClipTrackReport[]
}
