import { SCENE_LIMITS } from './limits'
import type { AffineMatrix } from './matrix'

/** Internal phase-7 document contract. Not a public capability yet. */
export const SCENE_SKIN_LIMITS = {
  bindings: SCENE_LIMITS.renderedParts,
  joints: 256,
  influences: 4,
  weightedVertices: SCENE_LIMITS.vertices,
} as const

export interface SceneSkinInfluence {
  jointId: string
  weight: number
}

export interface SceneSkinBinding {
  id: string
  name: string
  nodeId: string
  /** Stable existing group/locator ids; hierarchy and animation remain in the scene. */
  joints: Array<{ nodeId: string; inverseBindMatrix: AffineMatrix }>
  /** Complete explicit mesh vertices, not UV corners or derived primitive vertices. */
  weights: Record<string, SceneSkinInfluence[]>
}

/** Tolerance for a stored Double sum, not permission to repair imported weights. */
export const SCENE_SKIN_WEIGHT_TOLERANCE = 1e-8
