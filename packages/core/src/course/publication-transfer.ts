import { z } from 'zod'

const digest = z.string().regex(/^[a-f0-9]{64}$/)
const key = z
  .string()
  .min(1)
  .max(1024)
  .refine((value) => !/[\r\n\0]/.test(value))
const sources = z.array(z.string().min(1).max(4096)).max(5000)
export const CourseTransferContextSchema = z.strictObject({
  version: z.literal(1),
  profileHash: digest,
  origin: z.strictObject({ publicBaseUrl: z.url(), publicBucket: key, privateBucket: key }),
  salesPageUrl: z.url().optional(),
})
export type CourseTransferContext = z.infer<typeof CourseTransferContextSchema>
export const CourseTransferTaskSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('r2-copy'),
    visibility: z.enum(['public', 'private']),
    key,
    destinationKind: z.enum(['file', 'module-animation', 'animation-poster']),
    sha256: digest.optional(),
    sources,
  }),
  z.strictObject({
    kind: z.literal('vimeo-copy'),
    videoId: z.string().regex(/^\d+$/).max(32),
    sources,
  }),
])
export type CourseTransferTask = z.infer<typeof CourseTransferTaskSchema>
export const CourseTransferResultSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('r2-copy'),
    visibility: z.enum(['public', 'private']),
    sourceKey: key,
    sourceEtag: z.string().min(1).max(256),
    bytes: z.number().int().nonnegative().max(200_000_000),
    destinationKey: key,
    destinationEtag: z.string().min(1).max(256),
    url: z.string().min(1).max(4096),
  }),
  z.strictObject({
    kind: z.literal('vimeo-copy'),
    sourceVideoId: z.string().regex(/^\d+$/).max(32),
    sourceVersion: digest,
    videoId: z.string().regex(/^\d+$/).max(32),
    destinationVersion: digest,
    embedUrl: z.url(),
  }),
])
export type CourseTransferResult = z.infer<typeof CourseTransferResultSchema>

/** A persisted provider operation is waiting, not failed and not safe to repeat blindly. */
export class CourseTransferPendingError extends Error {}
