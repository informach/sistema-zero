import type { BbmodelVersion } from './bbmodelEnvelope'

export type BbmodelAnimationExpression = number | string
export interface BbmodelAnimationMarker {
  path: string
  time: number
  color: number
  /** The source application's unnamed marker sentinel is numeric zero. */
  name: string | 0
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelAnimationAnimator {
  key: string
  path: string
  name: string | null
  /** Declared type only, not resolved from target/name or approved as supported. */
  type: string | null
  /** Owned list of borrowed, read-only source records; values/curves are NOT validated yet. */
  keyframes: Readonly<Record<string, unknown>>[]
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelAnimationSource {
  index: number
  path: string
  uuid: string
  name: string | null
  loop: string
  override: boolean
  selected: boolean
  /** Declared finite values, not clamped, derived from keys, or native-duration approval. */
  length: number
  snapping: number | null
  scope: number | null
  saved: boolean | null
  filePath: string | null
  groupName: string | null
  timing: {
    timeUpdate: BbmodelAnimationExpression
    blendWeight: BbmodelAnimationExpression
    startDelay: BbmodelAnimationExpression
    loopDelay: BbmodelAnimationExpression
  }
  markers: BbmodelAnimationMarker[]
  animators: BbmodelAnimationAnimator[]
  source: Readonly<Record<string, unknown>>
}
export interface BbmodelAnimationStructure {
  version: BbmodelVersion
  clips: BbmodelAnimationSource[]
  byUuid: ReadonlyMap<string, number>
  counts: {
    clips: number
    animators: number
    keys: number
    /** Structural slots, including direct-value fallback; never decoded or sampled values. */
    dataPoints: number
    markers: number
    metadataChars: number
  }
}
