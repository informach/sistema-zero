import { z } from 'zod'
import { idSchema } from './common'
import { batchResultSchema, editorialFormatSchema, mediumSchema } from './editorial'

const textChangeSchema = z
  .object({
    entityId: idSchema,
    field: z.enum([
      'body',
      'caption',
      'cta',
      'alt',
      'title',
      'conversationOpening',
      'conversationOffer',
      'hypothesis',
      'evaluationCriterion',
    ]),
    value: z.string().max(100000),
  })
  .strict()
const copyVariantSchema = z
  .object({
    label: z.string().min(1).max(200),
    changes: z.array(textChangeSchema).min(1).max(100),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      new Set(value.changes.map((change) => `${change.entityId}:${change.field}`)).size !==
      value.changes.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Um campo não pode aparecer duas vezes na alternativa',
      })
  })
export const copyProposalSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('copy'),
    summary: z.string().min(1).max(4000),
    variants: z.array(copyVariantSchema).min(1).max(4),
  })
  .strict()
export const adaptationProposalSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal('adapt'),
    summary: z.string().min(1).max(4000),
    variants: z
      .array(
        z
          .object({
            label: z.string().min(1).max(200),
            title: z.string().min(1).max(300),
            format: editorialFormatSchema,
            medium: mediumSchema,
            caption: z.string().max(100000),
            cta: z.string().max(2000),
            alt: z.string().max(4000),
            components: z
              .array(
                z
                  .object({
                    title: z.string().min(1).max(300),
                    componentType: z.enum(['copy', 'slide', 'scene', 'art', 'caption', 'cover']),
                    body: z.string().max(100000),
                    sourceComponentId: idSchema.nullable(),
                  })
                  .strict(),
              )
              .min(1)
              .max(50),
          })
          .strict(),
      )
      .min(1)
      .max(4),
  })
  .strict()
export const editorialProposalSchema = z.discriminatedUnion('kind', [
  copyProposalSchema,
  adaptationProposalSchema,
])
export type EditorialProposal = z.infer<typeof editorialProposalSchema>
export const editorialApplicationSchema = z
  .object({
    variantIndex: z.number().int().min(0).max(3),
    result: batchResultSchema.nullable(),
    undo: batchResultSchema.nullable(),
    error: z.object({ code: z.string(), message: z.string() }).strict().nullable().default(null),
  })
  .strict()
export type EditorialApplication = z.infer<typeof editorialApplicationSchema>
