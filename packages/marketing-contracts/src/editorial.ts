import { z } from 'zod'
import { artSchema } from './art'
import { httpUrlSchema, idSchema, permissionSchema, sourceSchema, timestampSchema } from './common'
import { conversationPlanSchema } from './engagement'
import { mediaPreparationSchema } from './media-preparation'
import { videoSchema } from './video'
export const editorialFormatSchema = z.enum([
  'feed',
  'carousel',
  'story',
  'reel',
  'long-video',
  'campaign',
])
export const mediumSchema = z.enum(['text', 'image', 'video', 'mixed'])
const title = z.string().trim().min(1).max(300)
const body = z.string().max(100000)
const base = { schemaVersion: z.literal(1), title }
export const documentSchema = z
  .discriminatedUnion('kind', [
    z
      .object({
        ...base,
        kind: z.literal('watchlist'),
        body,
        subjectType: z.enum(['profile', 'topic']),
        url: httpUrlSchema.nullable(),
        source: sourceSchema,
        objective: z.string().max(2000),
        enabled: z.boolean(),
        evidenceIds: z.array(idSchema).max(100),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('direction'),
        body,
        objective: z.string().max(2000),
        audience: z.string().max(2000),
        voice: z.string().max(4000),
        protectedTerms: z.array(z.string().max(300)).max(100),
        referenceIds: z.array(idSchema).max(100),
        status: z.enum(['current', 'draft', 'historical']).optional(),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('evidence'),
        assetIds: z.array(idSchema).max(100).optional(),
        body,
        classification: z.enum(['fact', 'interpretation', 'hypothesis', 'reference']),
        source: sourceSchema,
        product: z.string().max(200),
        validity: z.enum(['current', 'historical', 'unverified']),
        tags: z.array(z.string().max(100)).max(30),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('piece'),
        conversation: conversationPlanSchema.optional(),
        brief: body,
        objective: z.string().max(2000),
        cta: z.string().max(2000),
        week: z.number().int().min(1).max(104).nullable(),
        position: z.number().int().min(0).max(1000),
        editorialDate: z.string().date().nullable(),
        representationIds: z.array(idSchema).max(100),
        evidenceIds: z.array(idSchema).max(100),
        sourceKey: z.string().max(1000).nullable(),
        state: z.enum(['draft', 'incomplete', 'historical', 'ready']),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('representation'),
        pieceId: idSchema,
        format: editorialFormatSchema,
        medium: mediumSchema,
        componentIds: z.array(idSchema).max(100),
        sourceRevisionId: idSchema.nullable(),
        caption: body,
        alt: z.string().max(4000),
        cta: z.string().max(2000),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('component'),
        referenceAssetIds: z.array(idSchema).max(100).optional(),
        representationId: idSchema,
        componentType: z.enum(['copy', 'slide', 'scene', 'art', 'caption', 'cover']),
        composition: artSchema.optional(),
        alt: z.string().max(4000).optional(),
        body,
        assetIds: z.array(idSchema).max(100),
        protectedText: z.array(z.string().max(2000)).max(100),
        sourceRevisionId: idSchema.nullable(),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('video'),
        representationId: idSchema,
        timeline: videoSchema,
        preparations: z.array(mediaPreparationSchema).max(100).optional(),
        sourceRevisionId: idSchema.optional(),
        assetIds: z.array(idSchema).max(100).optional(),
        referenceAssetIds: z.array(idSchema).max(100).optional(),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('comment'),
        revisionId: idSchema,
        body: z.string().min(1).max(10000),
      })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('analysis'),
        body,
        objective: z.string().max(2000),
        evidenceIds: z.array(idSchema).max(100),
        hypothesis: z.string().max(6000),
        proposedPieceId: idSchema.nullable(),
        analysisType: z.enum(['research', 'summary', 'decision']).optional(),
        basis: z
          .array(z.object({ entityId: idSchema, revisionId: idSchema }).strict())
          .max(200)
          .optional(),
      })
      .strict(),
  ])
  .superRefine((document, ctx) => {
    if (
      document.kind === 'analysis' &&
      document.analysisType === 'summary' &&
      !document.basis?.length
    )
      ctx.addIssue({
        code: 'custom',
        path: ['basis'],
        message: 'Um resumo precisa das revisões de origem',
      })
  })
export type EditorialDocument = z.infer<typeof documentSchema>
export type DocumentKind = EditorialDocument['kind']
export const operationSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    projectId: idSchema,
    entityId: idSchema,
    baseRevisionId: idSchema.nullable(),
    action: z.enum(['save', 'archive']),
    document: documentSchema.optional(),
  })
  .strict()
  .superRefine((op, ctx) => {
    if (op.action === 'save' && !op.document)
      ctx.addIssue({ code: 'custom', message: 'Documento obrigatório' })
    if (op.action === 'archive' && (!op.baseRevisionId || op.document))
      ctx.addIssue({ code: 'custom', message: 'Exclusão exige revisão e não recebe documento' })
  })
export type EditorialOperation = z.infer<typeof operationSchema>
export const batchOperationSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    projectId: idSchema,
    changes: z
      .array(
        z
          .object(operationSchema.shape)
          .omit({ schemaVersion: true, projectId: true, operationId: true }),
      )
      .min(1)
      .max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.changes.map((change) => change.entityId)).size !== value.changes.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Uma peça só pode aparecer uma vez na mesma alteração',
      })
    for (const change of value.changes) {
      if (change.action === 'save' && !change.document)
        ctx.addIssue({ code: 'custom', message: 'Documento obrigatório' })
      if (change.action === 'archive' && (!change.baseRevisionId || change.document))
        ctx.addIssue({
          code: 'custom',
          message: 'Arquivamento exige revisão e não recebe documento',
        })
    }
  })
export type EditorialBatch = z.infer<typeof batchOperationSchema>
export const projectCreateSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    id: idSchema,
    name: title,
    product: z.string().trim().min(1).max(300),
  })
  .strict()
export const projectMemberSchema = z
  .object({
    operationId: idSchema,
    userId: idSchema,
    permissions: z.array(z.enum(['read', 'edit', 'execute', 'approve', 'publish', 'admin'])).max(6),
  })
  .strict()
export const revisionSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    entityId: idSchema,
    parentRevisionId: idSchema.nullable(),
    document: documentSchema,
    createdBy: idSchema,
    createdAt: timestampSchema,
  })
  .strict()
export type Revision = z.infer<typeof revisionSchema>
export const itemSchema = z
  .object({
    id: idSchema,
    projectId: idSchema,
    kind: z.enum([
      'direction',
      'evidence',
      'piece',
      'representation',
      'component',
      'video',
      'comment',
      'analysis',
      'watchlist',
    ]),
    revisionId: idSchema,
    document: documentSchema,
    archived: z.boolean(),
    updatedAt: timestampSchema,
    authorId: idSchema.optional(),
  })
  .strict()
  .refine((v) => v.kind === v.document.kind, 'Tipo de documento inconsistente')
export type EditorialItem = z.infer<typeof itemSchema>
export const projectSchema = z
  .object({
    id: idSchema,
    name: title,
    product: z.string(),
    createdBy: idSchema,
    createdAt: timestampSchema,
    sequence: z.number().int().nonnegative(),
    permissions: z.array(permissionSchema),
  })
  .strict()
export type Project = z.infer<typeof projectSchema>
export const operationResultSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('applied'),
      operationId: idSchema,
      revisionId: idSchema,
      sequence: z.number().int().positive(),
      entityId: idSchema,
      item: itemSchema,
    })
    .strict(),
  z
    .object({
      status: z.literal('conflict'),
      code: z.literal('REVISION_CONFLICT'),
      operationId: idSchema,
      entityId: idSchema,
      baseRevisionId: idSchema.nullable(),
      currentRevisionId: idSchema.nullable(),
    })
    .strict(),
])
export type OperationResult = z.infer<typeof operationResultSchema>
export const batchResultSchema = z.discriminatedUnion('status', [
  z
    .object({
      status: z.literal('applied'),
      operationId: idSchema,
      items: z.array(itemSchema).max(100),
      cursor: z.number().int().positive(),
    })
    .strict(),
  z
    .object({
      status: z.literal('conflict'),
      operationId: idSchema,
      conflicts: z
        .array(
          z
            .object({
              entityId: idSchema,
              baseRevisionId: idSchema.nullable(),
              currentRevisionId: idSchema.nullable(),
            })
            .strict(),
        )
        .min(1)
        .max(200),
    })
    .strict(),
])
export type BatchResult = z.infer<typeof batchResultSchema>
export const snapshotSchema = z
  .object({
    items: z.array(itemSchema),
    cursor: z.number().int().nonnegative(),
    permissions: z.array(permissionSchema),
  })
  .strict()
export const handoffSchema = z
  .object({
    schemaVersion: z.literal(1),
    projectId: idSchema,
    entityId: idSchema,
    revisionId: idSchema,
    selection: z.array(idSchema).max(100),
    intent: z.enum(['adjust', 'alternatives', 'adapt']),
    expiresAt: timestampSchema,
    runId: idSchema.optional(),
  })
  .strict()
export const handoffCreateSchema = handoffSchema.omit({ expiresAt: true })
export type Handoff = z.infer<typeof handoffSchema>
