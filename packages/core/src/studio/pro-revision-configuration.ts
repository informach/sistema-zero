import { z } from 'zod'
import {
  StudioCatalogIdSchema,
  StudioExactVersionSchema,
  StudioPythonProjectConfigSchema,
  StudioRuntimeSelectionSchema,
} from './project-environment'

const common = {
  runtime: StudioRuntimeSelectionSchema,
  extensions: z
    .array(z.strictObject({ id: StudioCatalogIdSchema, version: StudioExactVersionSchema }))
    .max(100),
}

/** Execution configuration travels in the same CAS/inverse as source changes. */
export const StudioProRevisionConfigurationSchema = z
  .discriminatedUnion('programmingLanguage', [
    z.strictObject({
      ...common,
      programmingLanguage: z.literal('javascript'),
      devScript: z.string().regex(/^[A-Za-z0-9:_-]{1,80}$/),
    }),
    z.strictObject({
      ...common,
      programmingLanguage: z.literal('python'),
      python: StudioPythonProjectConfigSchema,
    }),
  ])
  .superRefine((value, context) => {
    if (new Set(value.extensions.map((item) => item.id)).size !== value.extensions.length)
      context.addIssue({ code: 'custom', message: 'Há extensões repetidas na configuração.' })
    if (
      value.programmingLanguage === 'python' &&
      value.python.dependencyLock.runtimeManifestSha256 !== value.runtime.manifestSha256
    )
      context.addIssue({
        code: 'custom',
        message: 'O lock não corresponde ao ambiente da revisão.',
      })
  })

export type StudioProRevisionConfiguration = z.infer<typeof StudioProRevisionConfigurationSchema>

/** Detached value. Preserve extension order: it is already part of the execution v1 digest.
 * Approval of runtime/packages is still the host catalog's job. */
export function parseStudioProRevisionConfiguration(raw: unknown): StudioProRevisionConfiguration {
  return StudioProRevisionConfigurationSchema.parse(raw)
}
