import { z } from 'zod'
import { StudioProjectCurationSchema } from './project-capabilities'
import { StudioRuntimeSelectionSchema } from './project-environment'
import { isStudioDocumentTemplateId } from './project-format'
import {
  StudioRuntimeProfileSchema,
  StudioRuntimeReleaseSchema,
  StudioRuntimeReleaseStatusSchema,
} from './runtime-catalog'

const ids = (limit: number) => z.array(z.string().min(1).max(128)).max(limit)

/** Host-qualified authoring metadata. No URL, credential or contextual execution grant. */
export const StudioAuthoringCatalogSchema = z.strictObject({
  version: z.literal(1),
  catalog: z.strictObject({
    profiles: z.array(StudioRuntimeProfileSchema).max(64),
    releases: z.array(StudioRuntimeReleaseSchema).max(1024),
  }),
  releases: z
    .array(
      z.strictObject({
        runtime: StudioRuntimeSelectionSchema,
        status: StudioRuntimeReleaseStatusSchema,
        proTemplateIds: z.array(z.string().refine(isStudioDocumentTemplateId)).max(128),
        blockIds: ids(10000),
        categoryIds: ids(256),
      }),
    )
    .max(1024),
})
export type StudioAuthoringCatalog = z.infer<typeof StudioAuthoringCatalogSchema>

/** null catalog means existing JS authoring only; never a fabricated Python release. */
export const StudioAuthoringOptionsSchema = z.strictObject({
  legacyJavaScript: z.literal(true),
  catalog: StudioAuthoringCatalogSchema.nullable(),
})
export type StudioAuthoringOptions = z.infer<typeof StudioAuthoringOptionsSchema>

/** Free creation rights are checked independently from lesson/live/admin context. */
export const StudioFreeOptionsSchema = StudioAuthoringOptionsSchema.extend({
  canCreatePro: z.boolean(),
  /** Course eligibility, independent of support for the existing JavaScript writer. */
  canCreateJavaScript: z.boolean(),
  canCreatePython: z.boolean(),
  pythonCuration: StudioProjectCurationSchema,
  /** Server-resolved course grants, independent of extension installation. */
  pythonGrantedExtensionIds: ids(256),
})
export type StudioFreeOptions = z.infer<typeof StudioFreeOptionsSchema>
