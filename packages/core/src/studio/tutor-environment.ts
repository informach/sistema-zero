import { z } from 'zod'
import {
  StudioCatalogIdSchema,
  StudioExactVersionSchema,
  StudioPythonEntrypointSchema,
  StudioRuntimeSelectionSchema,
} from './project-environment'

const extensions = z
  .array(z.strictObject({ id: StudioCatalogIdSchema, version: StudioExactVersionSchema }))
  .max(100)
const pythonModule = z.enum(['turtle', 'math', 'random', 'sz_audio'])

/** Source context for assistance, never a runtime approval or package-install capability. */
export const StudioTutorEnvironmentSchema = z
  .discriminatedUnion('programmingLanguage', [
    z.strictObject({
      version: z.literal(1),
      programmingLanguage: z.literal('javascript'),
      // Historical JavaScript documents have no runtime identity yet.
      runtime: StudioRuntimeSelectionSchema.optional(),
      // Legacy JS assistance never treated these strings as installation authority.
      extensions: z
        .array(z.strictObject({ id: z.string().min(1).max(128), version: z.string().max(128) }))
        .max(100),
    }),
    z.strictObject({
      version: z.literal(1),
      programmingLanguage: z.literal('python'),
      runtime: StudioRuntimeSelectionSchema,
      pythonVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
      entrypoint: StudioPythonEntrypointSchema,
      extensions,
      /** Local overrides narrow advice for stdlib/extensions/provided modules; never grant access. */
      shadowedModules: z.array(pythonModule).max(4),
    }),
  ])
  .superRefine((value, context) => {
    if (new Set(value.extensions.map((extension) => extension.id)).size !== value.extensions.length)
      context.addIssue({ code: 'custom', message: 'Há extensões repetidas no contexto do tutor.' })
    if (
      value.programmingLanguage === 'python' &&
      new Set(value.shadowedModules).size !== value.shadowedModules.length
    )
      context.addIssue({
        code: 'custom',
        message: 'Há módulos locais repetidos no contexto do tutor.',
      })
  })

export type StudioTutorEnvironment = z.infer<typeof StudioTutorEnvironmentSchema>
