import type { BbmodelAnimationBinding } from './bbmodelAnimationBindingTypes'
import type { BbmodelAnimationTrackIssue } from './bbmodelAnimationTrackTypes'
import type { BbmodelNativeClipOptions } from './bbmodelNativeClipTypes'

export interface BbmodelClipOptions extends BbmodelNativeClipOptions {
  fps?: number
  duration?: 'declared' | 'fit-keys'
  nameReferences?: 'reject' | 'unique-name'
  unresolved?: 'reject' | 'omit-clip'
  metadata?: 'reject' | 'discard'
  unmapped?: 'reject' | 'discard'
}
export type BbmodelClipProblem = { path: string } & (
  | { code: 'binding'; binding: BbmodelAnimationBinding }
  | { code: 'animator-mode'; mode: 'global' | 'quaternion' | 'unsupported-type' }
  | { code: 'channel'; channel: string }
  | { code: 'track'; issue: BbmodelAnimationTrackIssue }
  | { code: 'timing' }
  | { code: 'weight'; reason: 'expression' | 'overflow' | 'underflow' }
  | { code: 'loop'; value: string }
  | { code: 'duration'; value: number }
  | { code: 'pre-post' }
  | { code: 'metadata' | 'unmapped' }
)
export type BbmodelClipPlanReport = {
  clip: number
  path: string
  sourceUuid: string
  sourceName: string | null
} & (
  | { kind: 'omitted'; problem: BbmodelClipProblem }
  | {
      kind: 'prepared'
      duration: { mode: 'declared' | 'fit-keys'; source: number; native: number }
      playback: { source: 'once' | 'hold' | 'loop'; nativeLoop: boolean; standalone: true }
      weight: { value: number; defaulted: boolean; clamped: boolean }
      metadataFields: number
      unmappedFields: number
      /** First location only; counts cover all discarded field occurrences, not a path list. */
      firstMetadataPath: string | null
      firstUnmappedPath: string | null
      markers: number
      nameReferences: number
      emptyAnimators: number
    }
)
