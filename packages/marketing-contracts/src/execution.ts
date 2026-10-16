import { z } from 'zod'
import { artProposalSchema, imageRegionSchema } from './art'
import { artRecipeIdSchema } from './art-recipes'
import { assetManifestSchema, mediaInspectionSchema } from './assets'
import { captureObservationSchema, capturePlanSchema } from './capture'
import { hashSchema, idSchema, timestampSchema } from './common'
import { editorialApplicationSchema, editorialProposalSchema } from './copy-proposal'
import { revisionSchema } from './editorial'
import { mediaPreparationSchema } from './media-preparation'
import { renderReceiptSchema } from './render'
import { researchEvidenceSchema } from './research'
import { videoProposalSchema } from './video-proposal'
export const capabilitySchema = z.enum([
  'copy',
  'research',
  'image',
  'image-edit',
  'layout',
  'video-edit',
  'composition',
  'render',
  'transcribe',
  'prepare-media',
  'video-adapt',
  'capture',
])
export const executionLimitsSchema = z
  .object({
    timeoutMs: z.number().int().min(1000).max(1800000).default(360000),
    maxCalls: z.number().int().min(1).max(4).default(1),
    maxVariants: z.number().int().min(1).max(4).default(1),
    maxRepairs: z.number().int().min(0).max(2).default(1),
  })
  .strict()
export const runCreateSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    id: idSchema,
    projectId: idSchema,
    entityId: idSchema,
    revisionId: idSchema,
    intent: z.enum(['adjust', 'alternatives', 'adapt']),
    capability: capabilitySchema,
    provider: z.enum(['codex', 'claude']),
    assignedTo: idSchema.optional(),
    visualLayerId: idSchema.optional(),
    artRecipeId: artRecipeIdSchema.optional(),
    imageFormat: z.enum(['png', 'jpeg']).optional(),
    reviseCaptions: z.boolean().optional(),
    videoTarget: z
      .object({ clipId: idSchema, part: z.enum(['scene', 'text', 'effect']) })
      .strict()
      .optional(),
    sourceAssetId: idSchema.optional(),
    captionSourceAssetId: idSchema.optional(),
    imageRegion: imageRegionSchema.optional(),
    instruction: z.string().trim().min(1).max(12000),
    selection: z.array(idSchema).max(100),
    protectedIds: z.array(idSchema).max(100),
    contextHash: hashSchema,
    limits: executionLimitsSchema,
  })
  .strict()
export const runStateSchema = z.enum([
  'queued',
  'running',
  'waiting',
  'succeeded',
  'failed',
  'canceled',
])
export const attemptSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    runId: idSchema,
    deviceId: idSchema,
    epoch: z.number().int().positive(),
    leaseExpiresAt: timestampSchema,
    state: runStateSchema,
    checkpoint: z
      .object({
        phase: z.enum(['working', 'transferring', 'finalizing']).default('working'),
        stage: z.string().max(200),
        artifactIds: z.array(idSchema).max(100),
        progress: z.number().min(0).max(1).nullable(),
        inputTokens: z.number().int().nonnegative().nullable(),
        outputTokens: z.number().int().nonnegative().nullable(),
      })
      .strict(),
  })
  .strict()
export type ExecutionRequest = z.infer<typeof runCreateSchema>
export const contextRequestSchema = runCreateSchema.omit({
  id: true,
  operationId: true,
  contextHash: true,
})
export type ContextRequest = z.infer<typeof contextRequestSchema>
export const executionContextSchema = z
  .object({
    schemaVersion: z.literal(1),
    source: revisionSchema,
    ancestors: z.array(revisionSchema).max(2).default([]),
    selected: z.array(revisionSchema).max(100),
    directions: z.array(revisionSchema).max(5),
    evidence: z.array(revisionSchema).max(30),
    memory: z.array(revisionSchema).max(5).default([]),
    basis: z.array(revisionSchema).max(200).optional(),
    assets: z.array(assetManifestSchema).max(100).optional(),
    protectedIds: z.array(idSchema).max(100),
  })
  .strict()
export type ExecutionContext = z.infer<typeof executionContextSchema>
export const claimRunSchema = z
  .object({
    operationId: idSchema,
    expectedEpoch: z.number().int().nonnegative(),
    retry: z.boolean().default(false),
  })
  .strict()
export type ClaimRun = z.infer<typeof claimRunSchema>
export const heartbeatSchema = z
  .object({
    operationId: idSchema,
    attemptId: idSchema,
    epoch: z.number().int().positive(),
    checkpoint: attemptSchema.shape.checkpoint,
  })
  .strict()
export type Heartbeat = z.infer<typeof heartbeatSchema>
export const recordingAnalysisSchema = z
  .object({
    version: z.literal('ffmpeg-remotion-4.0.535-v1'),
    metadata: mediaInspectionSchema,
    scope: z.enum(['metadata', 'audio', 'audio-and-frames']).optional(),
    assetId: idSchema,
    sha256: hashSchema,
    silence: z
      .array(z.object({ startMs: z.number().nonnegative(), endMs: z.number().positive() }).strict())
      .max(10000),
    samples: z
      .array(z.object({ assetId: idSchema, atMs: z.number().nonnegative() }).strict())
      .max(6),
  })
  .strict()
export const outcomeSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('succeeded'),
      text: z
        .string()
        .max(200000)
        .refine(
          (value) => new TextEncoder().encode(value).byteLength <= 200000,
          'O resultado textual excede 200 KB; divida a peça em componentes',
        ),
      assetIds: z.array(idSchema).max(100),
      mode: z.string().min(1).max(100),
      durationMs: z.number().int().nonnegative(),
      inputTokens: z.number().int().nonnegative().nullable(),
      outputTokens: z.number().int().nonnegative().nullable(),
      research: researchEvidenceSchema.optional(),
      editorial: editorialProposalSchema.optional(),
      art: artProposalSchema.optional(),
      video: videoProposalSchema.optional(),
      render: renderReceiptSchema.optional(),
      mediaPreparation: mediaPreparationSchema.optional(),
      recordingAnalysis: z.array(recordingAnalysisSchema).max(100).optional(),
      capture: z
        .object({
          sourceAssetId: idSchema,
          sourceSha256: hashSchema,
          assetId: idSchema,
          engineVersion: z.string().min(1).max(100),
          plan: capturePlanSchema,
          observation: captureObservationSchema.optional(),
        })
        .strict()
        .optional(),
    })
    .strict(),
  z
    .object({
      status: z.enum(['failed', 'waiting']),
      code: z.enum([
        'QUOTA',
        'TIMEOUT',
        'PROVIDER_FAILED',
        'INVALID_RESULT',
        'LOCAL_FILE_MISSING',
        'NETWORK',
        'CANCELED',
      ]),
      message: z.string().min(1).max(1000),
    })
    .strict(),
])
export type ExecutionOutcome = z.infer<typeof outcomeSchema>
export const finishRunSchema = heartbeatSchema
  .omit({ checkpoint: true })
  .extend({ outcome: outcomeSchema })
  .strict()
export type FinishRun = z.infer<typeof finishRunSchema>
export const runViewSchema = z
  .object({
    request: runCreateSchema,
    context: executionContextSchema,
    state: runStateSchema,
    epoch: z.number().int().nonnegative(),
    createdBy: idSchema,
    createdAt: timestampSchema,
    attempt: attemptSchema.nullable(),
    outcome: outcomeSchema.nullable(),
    leaseExpired: z.boolean(),
    application: editorialApplicationSchema.nullable().default(null),
  })
  .strict()
export type ExecutionRun = z.infer<typeof runViewSchema>
export const runListQuerySchema = z
  .object({ entityId: idSchema.optional(), before: idSchema.optional() })
  .strict()
export type RunListQuery = z.infer<typeof runListQuerySchema>
export const runPageSchema = z
  .object({ items: z.array(runViewSchema).max(20), nextCursor: idSchema.nullable() })
  .strict()
export type RunPage = z.infer<typeof runPageSchema>
export const actionAvailabilitySchema = z
  .object({
    capability: capabilitySchema,
    location: z.enum(['server', 'desktop']),
    available: z.boolean(),
    reason: z.enum([
      'ready',
      'desktop-required',
      'offline',
      'not-connected',
      'not-permitted',
      'quota',
      'incompatible',
    ]),
  })
  .strict()
