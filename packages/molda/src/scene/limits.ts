import { MOLDA_LIMITS } from '../core/limits'

/** Aggregate authoring budgets, retaining every valid v1 model during migration. */
export const SCENE_LIMITS = {
  nodes: 512,
  renderedParts: MOLDA_LIMITS.maxParts,
  geometries: MOLDA_LIMITS.maxParts,
  vertices: MOLDA_LIMITS.maxParts * MOLDA_LIMITS.maxMeshVertices,
  looseEdges: MOLDA_LIMITS.maxParts * MOLDA_LIMITS.maxMeshLooseEdges,
  triangles: MOLDA_LIMITS.maxTriangles,
  materials: MOLDA_LIMITS.maxTriangles + MOLDA_LIMITS.maxParts * 7,
  images: MOLDA_LIMITS.maxTriangles,
  imageSide: 1024,
  layersPerImage: 32,
  pixelBytes: 32 * 1024 * 1024,
  faceCorners: 64,
  animationClips: 64,
  animationTracks: 4096,
  animationKeys: 65_536,
  animationSeconds: 600,
} as const
