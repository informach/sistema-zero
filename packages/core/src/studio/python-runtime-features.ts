import { z } from 'zod'

/** Implemented APIs, distinct from per-user permissions and browser requirements. */
export const PYTHON_PROJECT_MISSION_FEATURE = 'project-missions-v1' as const
export const PYTHON_PINTA_WORLD_FEATURE = 'pinta-map-world-v1' as const
/** Complete PNG-4 reader, including the earlier map/world formats and scene-3 physics. */
export const PYTHON_PINTA_PHYSICS_FEATURE = 'pinta-scene-physics-v1' as const
export const STUDIO_PYTHON_RUNTIME_FEATURES = [
  'turtle-compound-shapes',
  PYTHON_PROJECT_MISSION_FEATURE,
  PYTHON_PINTA_WORLD_FEATURE,
  PYTHON_PINTA_PHYSICS_FEATURE,
] as const
export const StudioPythonRuntimeFeatureSchema = z.enum(STUDIO_PYTHON_RUNTIME_FEATURES)
export type StudioPythonRuntimeFeature = z.infer<typeof StudioPythonRuntimeFeatureSchema>
export const StudioPythonRuntimeFeaturesSchema = z
  .array(StudioPythonRuntimeFeatureSchema)
  .max(STUDIO_PYTHON_RUNTIME_FEATURES.length)
  .refine((features) => new Set(features).size === features.length, 'Há recursos Python repetidos.')
