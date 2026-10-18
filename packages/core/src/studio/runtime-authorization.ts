import { z } from 'zod'
import { StudioProjectCurationSchema } from './project-capabilities'
import { StudioProjectIdSchema } from './project-document'
import { StudioRuntimeSelectionSchema, StudioSha256Schema } from './project-environment'
import {
  StudioProjectCapabilitySchema,
  StudioRuntimeProfileSchema,
  StudioRuntimeReleaseSchema,
  StudioRuntimeReleaseStatusSchema,
} from './runtime-catalog'
import { StudioRuntimeSubjectSchema } from './runtime-subject'

/** Remote operations implemented in this release. This is not the list of editor buttons. */
export const StudioRuntimeOperationSchema = z.enum(['execute', 'analyze', 'python-repl'])
export type StudioRuntimeOperation = z.infer<typeof StudioRuntimeOperationSchema>

export const StudioLessonRuntimeRequestSchema = z.strictObject({
  baselineId: StudioSha256Schema,
  operation: StudioRuntimeOperationSchema,
  subject: StudioRuntimeSubjectSchema,
  // Claimed revision bound to this permission decision, NOT a server evaluation of source.
  // The executor must hash the actual immutable snapshot and compare before dispatching it.
  revision: StudioSha256Schema,
})
export type StudioLessonRuntimeRequest = z.infer<typeof StudioLessonRuntimeRequestSchema>

/** A short-lived UI decision, NOT a bearer credential. Servers must authorize every operation. */
export const StudioLessonRuntimeDecisionSchema = z.strictObject({
  version: z.literal(1),
  actor: z.strictObject({ userId: z.uuid(), accountId: z.uuid() }),
  context: z.strictObject({
    kind: z.literal('lesson'),
    lessonId: z.uuid(),
    blockId: z.uuid(),
    baselineId: StudioSha256Schema,
  }),
  projectId: StudioProjectIdSchema,
  revision: StudioSha256Schema,
  subjectSha256: StudioSha256Schema,
  runtime: StudioRuntimeSelectionSchema,
  releaseStatus: StudioRuntimeReleaseStatusSchema,
  operation: StudioRuntimeOperationSchema,
  capabilities: z.array(StudioProjectCapabilitySchema).max(9),
  grantedExtensionIds: z.array(z.string().min(1).max(128)).max(256),
  catalog: z.strictObject({
    profiles: z.array(StudioRuntimeProfileSchema).length(1),
    releases: z.array(StudioRuntimeReleaseSchema).length(1),
  }),
  blockIds: z.array(z.string().min(1).max(128)).max(10000),
  curation: StudioProjectCurationSchema,
  frame: z.strictObject({ url: z.url(), allowedOrigins: z.array(z.url()).min(1).max(8) }),
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().nonnegative(),
})
export type StudioLessonRuntimeDecision = z.infer<typeof StudioLessonRuntimeDecisionSchema>

export const StudioAuthoringRuntimeContextSchema = z
  .strictObject({
    kind: z.literal('authoring'),
    lessonId: z.uuid(),
    draftRevision: z.uuid(),
    /** New unsaved blocks have no durable ID yet; rehearsal always requires one. */
    blockId: z.uuid().nullable(),
    purpose: z.enum(['authoring', 'rehearsal']),
  })
  .refine((context) => context.purpose !== 'rehearsal' || context.blockId !== null, {
    message: 'O ensaio precisa identificar o bloco do rascunho.',
  })
export type StudioAuthoringRuntimeContext = z.infer<typeof StudioAuthoringRuntimeContextSchema>

export const StudioAuthoringRuntimeRequestSchema = StudioLessonRuntimeRequestSchema.omit({
  baselineId: true,
}).extend({
  context: StudioAuthoringRuntimeContextSchema,
})
export type StudioAuthoringRuntimeRequest = z.infer<typeof StudioAuthoringRuntimeRequestSchema>
export const StudioAuthoringRuntimeDecisionSchema = StudioLessonRuntimeDecisionSchema.extend({
  context: StudioAuthoringRuntimeContextSchema,
})
export type StudioAuthoringRuntimeDecision = z.infer<typeof StudioAuthoringRuntimeDecisionSchema>

/** A room context identifies a concrete admitted block; library continuation has neither. */
export const StudioLiveRuntimeContextSchema = z
  .strictObject({
    kind: z.literal('live'),
    workspaceId: z.uuid(),
    sessionId: z.uuid().nullable(),
    blockId: z.uuid().nullable(),
    deviceId: z.uuid(),
    writerEpoch: z.number().int().nonnegative(),
  })
  .refine((context) => (context.sessionId === null) === (context.blockId === null), {
    message: 'Informe o encontro e o bloco juntos, ou abra o projeto pela biblioteca.',
  })
export type StudioLiveRuntimeContext = z.infer<typeof StudioLiveRuntimeContextSchema>
export const StudioLiveRuntimeRequestSchema = StudioLessonRuntimeRequestSchema.omit({
  baselineId: true,
}).extend({
  context: StudioLiveRuntimeContextSchema,
  // Autosave advances this value without replacing the interpreter's authority lifetime.
  expectedWorkspaceRevision: z.number().int().nonnegative(),
})
export type StudioLiveRuntimeRequest = z.infer<typeof StudioLiveRuntimeRequestSchema>
export const StudioLiveRuntimeDecisionSchema = StudioLessonRuntimeDecisionSchema.extend({
  context: StudioLiveRuntimeContextSchema,
  workspaceRevision: z.number().int().nonnegative(),
  baselineId: StudioSha256Schema.nullable(),
})
export type StudioLiveRuntimeDecision = z.infer<typeof StudioLiveRuntimeDecisionSchema>

export const StudioFreeRuntimeContextSchema = z.strictObject({
  kind: z.literal('free'),
  audience: z.enum(['kids', 'adult']),
  projectId: StudioProjectIdSchema,
})
export type StudioFreeRuntimeContext = z.infer<typeof StudioFreeRuntimeContextSchema>
export const StudioFreeRuntimeRequestSchema = StudioLessonRuntimeRequestSchema.omit({
  baselineId: true,
}).extend({
  context: StudioFreeRuntimeContextSchema,
})
export type StudioFreeRuntimeRequest = z.infer<typeof StudioFreeRuntimeRequestSchema>
export const StudioFreeRuntimeDecisionSchema = StudioLessonRuntimeDecisionSchema.extend({
  context: StudioFreeRuntimeContextSchema,
})
export type StudioFreeRuntimeDecision = z.infer<typeof StudioFreeRuntimeDecisionSchema>

/** Internal BFF attestation after Hub visibility and immutable revision resolution.
 * Browser callers never supply this subject or snapshot digest to Members directly.
 */
export const StudioPublicRuntimeContextSchema = z.strictObject({
  kind: z.literal('public'),
  playId: z.uuid(),
  publicationRevision: StudioSha256Schema,
})
export const StudioPublicRuntimeRequestSchema = StudioLessonRuntimeRequestSchema.omit({
  baselineId: true,
}).extend({
  operation: z.literal('execute'),
  context: StudioPublicRuntimeContextSchema,
})
export type StudioPublicRuntimeRequest = z.infer<typeof StudioPublicRuntimeRequestSchema>
export const StudioPublicRuntimeDecisionSchema = StudioLessonRuntimeDecisionSchema.extend({
  actor: z.null(),
  context: StudioPublicRuntimeContextSchema,
  operation: z.literal('execute'),
  capabilities: z.array(z.enum(['execute', 'pause'])).max(2),
  blockIds: z.array(z.never()).length(0),
})
export type StudioPublicRuntimeDecision = z.infer<typeof StudioPublicRuntimeDecisionSchema>

/** A saved owner revision may be published after the room closes; this is not
 * an editor writer lease and never grants free Pro or REPL capabilities.
 */
export const StudioLivePublicationRuntimeContextSchema = z.strictObject({
  kind: z.literal('live-publication'),
  workspaceId: z.uuid(),
  workspaceRevision: z.number().int().positive(),
})
export const StudioLivePublicationRuntimeRequestSchema = StudioLessonRuntimeRequestSchema.omit({
  baselineId: true,
}).extend({
  operation: z.literal('execute'),
  context: StudioLivePublicationRuntimeContextSchema,
})
export type StudioLivePublicationRuntimeRequest = z.infer<
  typeof StudioLivePublicationRuntimeRequestSchema
>
export const StudioLivePublicationRuntimeDecisionSchema = StudioLessonRuntimeDecisionSchema.extend({
  context: StudioLivePublicationRuntimeContextSchema,
  operation: z.literal('execute'),
  capabilities: z.array(z.enum(['execute', 'pause'])).max(2),
  blockIds: z.array(z.never()).length(0),
})
export type StudioLivePublicationRuntimeDecision = z.infer<
  typeof StudioLivePublicationRuntimeDecisionSchema
>

export const StudioContextualRuntimeDecisionSchema = z.union([
  StudioLessonRuntimeDecisionSchema,
  StudioAuthoringRuntimeDecisionSchema,
  StudioLiveRuntimeDecisionSchema,
  StudioFreeRuntimeDecisionSchema,
])
export type StudioContextualRuntimeDecision = z.infer<typeof StudioContextualRuntimeDecisionSchema>
export type StudioPublicationRuntimeDecision =
  | StudioContextualRuntimeDecision
  | StudioLivePublicationRuntimeDecision
export const StudioRuntimeDecisionSchema = z.union([
  StudioContextualRuntimeDecisionSchema,
  StudioPublicRuntimeDecisionSchema,
])
export type StudioRuntimeDecision = z.infer<typeof StudioRuntimeDecisionSchema>
export type StudioRuntimeCandidate = Omit<StudioLessonRuntimeRequest, 'baselineId'>
