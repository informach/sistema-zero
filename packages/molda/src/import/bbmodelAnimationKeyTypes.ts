import type { BbmodelAnimationAnimator, BbmodelAnimationExpression } from './bbmodelAnimationTypes'
import type { BbmodelVec3 } from './bbmodelValues'

export type BbmodelAnimationChannel = 'rotation' | 'position' | 'scale'
export interface BbmodelAnimationPoint {
  path: string
  layout: 'direct' | 'point' | 'point-values'
  values: [BbmodelAnimationExpression, BbmodelAnimationExpression, BbmodelAnimationExpression]
  source: Readonly<Record<string, unknown>>
  /** Legacy point.values overlay; own axis properties take precedence. Not used for direct keys. */
  aliasSource: Readonly<Record<string, unknown>> | null
}
export interface BbmodelAnimationBezier {
  linked: boolean
  leftTime: BbmodelVec3
  leftValue: BbmodelVec3
  rightTime: BbmodelVec3
  rightValue: BbmodelVec3
}
export type BbmodelAnimationKey = {
  index: number
  path: string
  source: Readonly<Record<string, unknown>>
} & (
  | { kind: 'unresolved'; channel: string }
  | {
      kind: 'transform'
      channel: BbmodelAnimationChannel
      uuid: string | null
      /** Source order, finite values and duplicate times are preserved, not approved for playback. */
      time: number
      color: number
      uniform: boolean | null
      interpolation: string
      /** Null means inactive and no declared handles. Active/mixed curves use source defaults. */
      bezier: BbmodelAnimationBezier | null
      points: BbmodelAnimationPoint[]
    }
)
export type BbmodelKeyAnimator = {
  index: number
  /** Borrowed, read-only declaration from the structure reader. No target binding yet. */
  declaration: BbmodelAnimationAnimator
} & (
  | { kind: 'unresolved' }
  | {
      kind: 'transform'
      sourceType: 'bone' | 'armature_bone' | 'null_object'
      rotationGlobal: boolean
      quaternionInterpolation: boolean | null
      keys: BbmodelAnimationKey[]
    }
)
export interface BbmodelAnimationKeyframes {
  clips: { clip: number; animators: BbmodelKeyAnimator[] }[]
  counts: {
    transformAnimators: number
    unresolvedAnimators: number
    transformKeys: number
    unresolvedKeys: number
    points: number
    /** Effective known string occurrences only; separate from structure metadata's budget. */
    textChars: number
  }
}
