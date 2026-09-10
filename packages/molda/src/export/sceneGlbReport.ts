/** Stable codes for confirmation UI; reports never retain the document or pixel buffers. */
export type SceneGlbIssue =
  | { code: 'hidden-node'; sourceId: string }
  | { code: 'skin-dependency'; sourceId: string }
  | { code: 'skin-precision'; sourceId: string }
  | { code: 'skin-zero-slots'; sourceId: string }
  | { code: 'skin-render-space'; sourceId: string }
  | { code: 'bend-limit-omitted'; sourceId: string }
  | { code: 'face-omitted'; sourceId: string; faceId: string; reason: string }
  | { code: 'loose-geometry'; sourceId: string; edges: number; vertices: number }
  | { code: 'flipbook-first-frame'; sourceId: string }
  | { code: 'runtime-tangent-space'; sourceId: string }
  | {
      code: 'animation-resampled'
      sourceId: string
      nodeId: string
      channel: 'translation' | 'rotation' | 'scale'
      samples: number
    }
  | { code: 'clip-omitted'; sourceId: string; reason: 'empty' | 'hidden' }
  | { code: 'clip-renamed'; sourceId: string; originalName: string; name: string }

/** Small, ordered manifest of the clips actually written to the GLB. No tracks or source references. */
export interface SceneGlbClip {
  id: string
  name: string
  duration: number
  fps: number
  loop: boolean
}

export class SceneGlbLossError extends Error {
  constructor(readonly issues: readonly SceneGlbIssue[]) {
    super(
      'Este GLB precisa converter ou deixar itens de fora. Confira as mudanças antes de baixar.',
    )
    this.name = 'SceneGlbLossError'
  }
}
