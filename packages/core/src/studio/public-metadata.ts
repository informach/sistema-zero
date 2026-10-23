import { z } from 'zod'
import { StudioRuntimeSelectionSchema } from './project-environment'

const common = { pro: z.boolean(), extensions: z.array(z.string().min(1).max(128)).max(8) }
/** Cosmetic Mural/remix hints. Execution always resolves the retained source/runtime. */
export const StudioPublicProjectMetadataSchema = z.union([
  z.strictObject({
    ...common,
    programmingLanguage: z.literal('javascript').optional(),
    runtime: StudioRuntimeSelectionSchema.optional(),
  }),
  z.strictObject({
    ...common,
    programmingLanguage: z.literal('python'),
    runtime: StudioRuntimeSelectionSchema,
  }),
])
export type StudioPublicProjectMetadata = z.infer<typeof StudioPublicProjectMetadataSchema>
