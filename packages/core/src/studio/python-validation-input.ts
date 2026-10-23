import { z } from 'zod'
import { StudioProjectIdSchema } from './project-document'
import { StudioSha256Schema } from './project-environment'
import { StudioPythonExecutionMetadataSchema } from './python-execution-content'
import { StudioPythonPlaytestRecipeSchema } from './python-playtest'
import { StudioPythonPreviewRequestSchema } from './python-preview-input'
import { STUDIO_EXECUTION_ID_PATTERN } from './runtime-identity'

/** Binary bytes are streamed separately; metadata is never a base64 project envelope. */
export const STUDIO_PYTHON_INPUT_LIMITS = Object.freeze({
  metadataBytes: 2_000_000,
  lifetimeMs: 15 * 60_000,
  uploadDeadlineMs: 90_000,
  cleanupBatch: 100,
})
export const StudioPythonInputIdSchema = z.string().regex(/^[a-f0-9]{32}$/)
export const StudioPythonInputOpenSchema = z.strictObject({
  version: z.literal(1),
  /** Opaque account/profile ownership derived by the authenticated BFF. */
  owner: StudioSha256Schema,
  requestId: z.uuid(),
  executionId: z.string().regex(STUDIO_EXECUTION_ID_PATTERN),
  snapshot: StudioPythonExecutionMetadataSchema,
})
export const StudioPythonInputReferenceSchema = z.strictObject({
  version: z.literal(1),
  inputId: StudioPythonInputIdSchema,
  requestId: z.uuid(),
  /** Server-generated immutable storage generation; a recovered nonce never reuses old byte keys. */
  generation: z.uuid(),
  projectId: StudioProjectIdSchema,
  owner: StudioSha256Schema,
  executionId: z.string().regex(STUDIO_EXECUTION_ID_PATTERN),
  revision: StudioSha256Schema,
  expiresAt: z.number().int().nonnegative(),
})
/** Captured with the immutable input job, never changed between compilation and execution. */
export const StudioPythonValidationOperationSchema = z.strictObject({
  mode: z.literal('validate'),
  recipe: StudioPythonPlaytestRecipeSchema,
  preview: StudioPythonPreviewRequestSchema.optional(),
})
export const StudioPythonValidationRequestSchema = z.strictObject({
  version: z.literal(1),
  input: StudioPythonInputReferenceSchema,
  structure: z.boolean(),
  recipe: StudioPythonPlaytestRecipeSchema,
  preview: StudioPythonPreviewRequestSchema.optional(),
})

/** Compilation and structural inspection share one explicit current request envelope. */
export const StudioPythonInspectionRequestSchema = z.strictObject({
  version: z.literal(1),
  input: StudioPythonInputReferenceSchema,
  structure: z.boolean(),
})
export const StudioPythonInputStateSchema = StudioPythonInputOpenSchema.extend({
  inputId: StudioPythonInputIdSchema,
  generation: z.uuid(),
  createdAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
}).superRefine((state, context) => {
  if (state.expiresAt !== state.createdAt + STUDIO_PYTHON_INPUT_LIMITS.lifetimeMs)
    context.addIssue({ code: 'custom', message: 'Prazo do input Python inválido.' })
})
export type StudioPythonInputReference = z.infer<typeof StudioPythonInputReferenceSchema>
export type StudioPythonInputState = z.infer<typeof StudioPythonInputStateSchema>
