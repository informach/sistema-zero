import type { BbmodelAnimationConstantIssue } from './bbmodelAnimationConstantKey'
import type { BbmodelAnimationBezier, BbmodelAnimationChannel } from './bbmodelAnimationKeyTypes'
import type { BbmodelVec3 } from './bbmodelValues'

export type BbmodelAnimationInterpolation = 'linear' | 'step' | 'catmullrom' | 'bezier'
export interface BbmodelNumericAnimationKey {
  /** Original key index and path, independent of this track's time order. */
  index: number
  path: string
  time: number
  interpolation: BbmodelAnimationInterpolation
  points: [BbmodelVec3] | [BbmodelVec3, BbmodelVec3]
  bezier: BbmodelAnimationBezier | null
}
export type BbmodelAnimationTrackIssue =
  | { code: 'unsupported-channel'; path: string }
  | { code: 'interpolation'; path: string; key: number; interpolation: string }
  | { code: 'point-count'; path: string; key: number; count: number }
  | { code: 'duplicate-time'; path: string; key: number; otherKey: number; time: number }
  | { code: 'legacy-data-points' | 'legacy-bezier-pair'; path: string; key: number }
  | {
      code: 'legacy-literal-rewrite' | 'legacy-shadowed-value'
      path: string
      key: number
      point: number
      axis: 'x' | 'y'
    }
  | { code: 'constant'; path: string; key: number; issues: BbmodelAnimationConstantIssue[] }
export interface BbmodelNumericAnimationTrack {
  channel: BbmodelAnimationChannel
  keys: BbmodelNumericAnimationKey[]
  reordered: boolean
  /** Nonzero scalar sign changes only, not a loss/consent or playback-equivalence report. */
  migration: { pointAxes: number; bezierValueAxes: number }
}
export type BbmodelAnimationTrackResult =
  | ({ status: 'ready' } & BbmodelNumericAnimationTrack)
  /** First blocking key only. Never a partially prepared track or an exhaustive clip report. */
  | { status: 'unresolved'; issue: BbmodelAnimationTrackIssue }
