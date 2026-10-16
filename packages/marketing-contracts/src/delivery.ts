import { z } from 'zod'
import { httpUrlSchema, idSchema, timestampSchema } from './common'

export const deliveryFormatSchema = z.enum([
  'ig_feed',
  'ig_carousel',
  'ig_reels',
  'ig_story',
  'fb_post',
  'fb_reels',
  'yt_video',
  'yt_short',
  'tt_video',
])
export function deliveryFormatsFor(format: string): Array<z.infer<typeof deliveryFormatSchema>> {
  switch (format) {
    case 'feed':
      return ['ig_feed', 'fb_post']
    case 'carousel':
      return ['ig_carousel']
    case 'story':
      return ['ig_story']
    case 'reel':
      return ['ig_reels', 'fb_reels', 'yt_short', 'tt_video']
    case 'long-video':
      return ['yt_video']
    default:
      return []
  }
}
export const createDeliverySchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    editionId: idSchema,
    expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
    format: deliveryFormatSchema,
    sourcePublicationId: idSchema.nullable(),
  })
  .strict()
export type CreateDelivery = z.infer<typeof createDeliverySchema>
export const deliverySchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    projectId: idSchema,
    editionId: idSchema,
    editionHash: z.string().regex(/^[a-f0-9]{64}$/),
    representationId: idSchema,
    sourcePublicationId: idSchema.nullable(),
    version: z.number().int().nonnegative(),
    format: deliveryFormatSchema,
    caption: z.string(),
    title: z.string().nullable(),
    status: z.enum([
      'draft',
      'ready',
      'scheduled',
      'publishing',
      'awaiting_manual',
      'published',
      'failed',
      'canceled',
    ]),
    publishMode: z.enum(['auto', 'manual']),
    socialAccountId: idSchema.nullable(),
    scheduledAt: timestampSchema.nullable(),
    publishedAt: timestampSchema.nullable(),
    externalUrl: httpUrlSchema.nullable(),
    externalPostId: z.string().nullable(),
    lastError: z.string().nullable(),
    started: z.boolean(),
    createdAt: timestampSchema,
  })
  .strict()
export type Delivery = z.infer<typeof deliverySchema>
const actionBase = {
  schemaVersion: z.literal(1),
  operationId: idSchema,
  version: z.number().int().nonnegative(),
  expectedHash: z.string().regex(/^[a-f0-9]{64}$/),
}
export const deliveryActionSchema = z.discriminatedUnion('action', [
  z
    .object({
      ...actionBase,
      action: z.literal('schedule'),
      scheduledAt: timestampSchema,
      publishMode: z.enum(['manual', 'auto']),
      socialAccountId: idSchema.nullable(),
    })
    .strict(),
  z.object({ ...actionBase, action: z.literal('cancel') }).strict(),
  z
    .object({
      ...actionBase,
      action: z.literal('mark-published'),
      externalUrl: httpUrlSchema,
      externalPostId: z.null(),
      confirmedEdition: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...actionBase,
      action: z.literal('link-external'),
      externalUrl: httpUrlSchema,
      socialAccountId: idSchema,
      confirmedEdition: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...actionBase,
      action: z.literal('reconcile-published'),
      externalUrl: httpUrlSchema,
      socialAccountId: idSchema,
      confirmedEdition: z.literal(true),
    })
    .strict(),
  z
    .object({
      ...actionBase,
      action: z.literal('cancel-local'),
      acknowledgeExternalUnchanged: z.literal(true),
    })
    .strict(),
])
export type DeliveryAction = z.infer<typeof deliveryActionSchema>
export const deliveryPageSchema = z
  .object({ items: z.array(deliverySchema).max(25), nextCursor: idSchema.nullable() })
  .strict()
export const deliveryOptionsSchema = z
  .object({
    automaticFormats: z.array(deliveryFormatSchema),
    verifiableNetworks: z.array(z.enum(['instagram', 'facebook', 'youtube', 'tiktok'])),
    accounts: z.array(
      z
        .object({
          id: idSchema,
          network: z.enum(['instagram', 'facebook', 'youtube', 'tiktok']),
          displayName: z.string(),
        })
        .strict(),
    ),
  })
  .strict()
