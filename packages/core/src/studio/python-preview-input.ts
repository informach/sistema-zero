import { z } from 'zod'
import { StudioSha256Schema } from './project-environment'
import { StudioProjectIdSchema } from './project-identity'

export const STUDIO_PYTHON_PREVIEW_LIFETIME_MS = 24 * 60 * 60_000

export function isStudioPythonWebOrigin(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.origin === value &&
      (url.protocol === 'https:' ||
        (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))
    )
  } catch {
    return false
  }
}
export const StudioPythonWebOriginSchema = z.string().max(2048).refine(isStudioPythonWebOrigin)
export const StudioPythonPreviewRequestSchema = z.strictObject({
  parentOrigin: StudioPythonWebOriginSchema,
})

/** Private coordinator query. A completion marker is never an execution grant. */
export const StudioPythonPreviewAvailabilitySchema = z.strictObject({
  jobId: StudioSha256Schema,
  projectId: StudioProjectIdSchema,
  revision: StudioSha256Schema,
  parentOrigin: StudioPythonWebOriginSchema,
  expiresAt: z.number().int().nonnegative(),
})
