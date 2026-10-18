import { z } from 'zod'
import { canonicalJson, sha256Hex } from '../creations'
import { studioProjectContinuityReference } from './project-continuity'
import { StudioProjectIdSchema } from './project-document'
import { StudioSha256Schema } from './project-environment'
import {
  StudioAuthoringRuntimeContextSchema,
  StudioFreeRuntimeContextSchema,
  StudioLiveRuntimeContextSchema,
} from './runtime-authorization'
import { StudioRuntimeSubjectSchema } from './runtime-subject'

/** Analysis shares contextual rights, but has its own request/quota boundary. */
export const STUDIO_PYTHON_ANALYSIS_CONTEXT_MAX_BYTES = 2_000_000
export const StudioPythonAnalysisContextSchema = z.union([
  z.strictObject({
    kind: z.literal('lesson'),
    lessonId: z.uuid(),
    blockId: z.uuid(),
    baselineId: StudioSha256Schema,
  }),
  StudioAuthoringRuntimeContextSchema,
  StudioFreeRuntimeContextSchema,
  StudioLiveRuntimeContextSchema.extend({
    expectedWorkspaceRevision: z.number().int().nonnegative(),
  }),
])
export const StudioPythonAnalysisAuthorizationSchema = z
  .strictObject({
    context: StudioPythonAnalysisContextSchema,
    operation: z.literal('analyze'),
    subject: StudioRuntimeSubjectSchema,
    revision: StudioSha256Schema,
  })
  .superRefine((input, context) => {
    if (input.subject.programmingLanguage !== 'python')
      context.addIssue({
        code: 'custom',
        path: ['subject'],
        message: 'A análise Python exige um projeto Python.',
      })
    if (input.context.kind === 'free' && input.context.projectId !== input.subject.id)
      context.addIssue({
        code: 'custom',
        path: ['context', 'projectId'],
        message: 'O contexto precisa corresponder ao projeto analisado.',
      })
  })
export type StudioPythonAnalysisAuthorization = z.infer<
  typeof StudioPythonAnalysisAuthorizationSchema
>

/** Internal BFF-to-service metadata. A binding is not a bearer credential. */
export const StudioPythonLanguageOpenSchema = z.strictObject({
  projectId: StudioProjectIdSchema,
  binding: StudioSha256Schema,
})
export const StudioPythonLanguageStartSchema = z.strictObject({ binding: StudioSha256Schema })

/** Fresh policy still checks editable fields on every command. They must not
 * restart the language process on ordinary typing, entrypoint changes or saves. */
export async function studioPythonAnalysisBinding(
  owner: string,
  raw: StudioPythonAnalysisAuthorization,
) {
  StudioSha256Schema.parse(owner)
  const input = StudioPythonAnalysisAuthorizationSchema.parse(raw)
  const context = input.context
  const stableContext =
    context.kind === 'authoring'
      ? {
          kind: context.kind,
          lessonId: context.lessonId,
          blockId: context.blockId,
          purpose: context.purpose,
        }
      : context.kind === 'live'
        ? {
            kind: context.kind,
            workspaceId: context.workspaceId,
            sessionId: context.sessionId,
            blockId: context.blockId,
            deviceId: context.deviceId,
            writerEpoch: context.writerEpoch,
          }
        : context
  return sha256Hex(
    canonicalJson([
      'studio-python-analysis-binding-v1',
      owner,
      stableContext,
      input.subject.id,
      studioProjectContinuityReference(input.subject),
    ]),
  )
}
