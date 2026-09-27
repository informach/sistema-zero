export interface GltfClipOptions {
  /** Display grid; used for resampling only when cubic is explicitly bake. */
  fps?: number
  loop?: boolean
  cubic?: 'reject' | 'bake'
  rotations?: 'preserve' | 'normalize'
  morphs?: 'reject' | 'omit'
  unresolved?: 'reject' | 'omit'
}
export interface GltfClipIssue {
  code:
    | 'name-generated'
    | 'name-shortened'
    | 'outside-scene-channel'
    | 'unresolved-channel-omitted'
    | 'morph-channel-omitted'
    | 'empty-clip-omitted'
    | 'zero-duration-expanded'
    | 'cubic-resampled'
    | 'rotation-keys-normalized'
  path: string
  /** Stable prospective ID, including omitted clips. */
  clipId: string
  count: number
  fps?: number
  maximumNormError?: number
}
