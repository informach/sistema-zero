import { z } from 'zod'

/** Implemented APIs, distinct from per-user permissions and browser requirements. */
export const STUDIO_PYTHON_RUNTIME_FEATURES = ['turtle-compound-shapes'] as const
export const StudioPythonRuntimeFeatureSchema = z.enum(STUDIO_PYTHON_RUNTIME_FEATURES)
export type StudioPythonRuntimeFeature = z.infer<typeof StudioPythonRuntimeFeatureSchema>
export const StudioPythonRuntimeFeaturesSchema = z
  .array(StudioPythonRuntimeFeatureSchema)
  .max(STUDIO_PYTHON_RUNTIME_FEATURES.length)
  .refine((features) => new Set(features).size === features.length, 'Há recursos Python repetidos.')
