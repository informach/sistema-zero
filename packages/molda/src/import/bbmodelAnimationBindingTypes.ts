export interface BbmodelAnimationBindingOptions {
  nameReferences?: 'reject' | 'unique-name'
}
export type BbmodelAnimationBindingVia = 'uuid' | 'key-name' | 'declared-name'
export type BbmodelAnimationBinding = {
  /** Original animator position within its clip, not a display name or native node ID. */
  animator: number
  path: string
  reference: string
} & (
  | {
      kind: 'bound'
      node: number
      selected: boolean
      via: BbmodelAnimationBindingVia
    }
  | {
      kind: 'conflict'
      node: number
      selected: boolean
      via: BbmodelAnimationBindingVia
      /** All animators aimed at this node in this clip, including empty/omitted ones. */
      count: number
    }
  | {
      kind: 'unresolved'
      detail:
        | { code: 'animator-type'; type: string | null }
        | { code: 'missing-target' }
        | { code: 'target-type'; node: number }
        | { code: 'name-reference-rejected'; via: 'key-name' | 'declared-name' }
        | { code: 'ambiguous-name'; via: 'key-name' | 'declared-name'; count: number }
    }
)
export interface BbmodelAnimationBindings {
  options: { nameReferences: 'reject' | 'unique-name' }
  clips: { clip: number; animators: BbmodelAnimationBinding[] }[]
  counts: {
    bound: number
    unresolved: number
    conflicting: number
    /** Bound/conflicting animator entries whose source target is outside native selection. */
    omittedTargets: number
  }
}
