import { z } from 'zod'
import { hashSchema, idSchema } from './common'
export const assetManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    projectId: idSchema,
    name: z.string().min(1).max(500),
    sha256: hashSchema,
    size: z.number().int().positive().max(2000000000),
    mime: z.enum([
      'image/png',
      'image/jpeg',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/webm',
      'audio/wav',
      'audio/mpeg',
      'audio/mp4',
      'text/plain',
      'text/markdown',
      'text/html',
      'application/json',
      'font/woff2',
      'font/ttf',
      'font/otf',
      'application/pdf',
      'application/zip',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]),
    role: z.enum([
      'original',
      'proxy',
      'final',
      'thumbnail',
      'font',
      'reference',
      'transcript',
      'waveform',
    ]),
    sourceAssetId: idSchema.nullable(),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    durationMs: z.number().nonnegative().nullable(),
    codec: z.string().max(100).nullable(),
    rotation: z.number().nullable(),
    hasAudio: z.boolean().optional(),
    colorSpace: z.string().max(100).nullable().optional(),
    colorTransfer: z.string().max(100).nullable().optional(),
    frameRate: z
      .object({
        numerator: z.number().int().positive().max(1000000000),
        denominator: z.number().int().positive().max(1000000000),
      })
      .strict()
      .nullable()
      .optional(),
  })
  .strict()
export type AssetManifest = z.infer<typeof assetManifestSchema>
export const assetDownloadSchema = z
  .object({ manifest: assetManifestSchema, url: z.string().url() })
  .strict()
export const assetExportRequestSchema = z
  .object({ projectId: idSchema, assetId: idSchema, expectedHash: hashSchema })
  .strict()
export type AssetExportRequest = z.infer<typeof assetExportRequestSchema>
export function assetFilename(name: string) {
  const filename = [...(name.split(/[\\/]/).at(-1) ?? '')]
    .map((character) =>
      character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? '_' : character,
    )
    .join('')
    .replace(/[<>:"|?*]/g, '_')
    .slice(0, 180)
    .replace(/[ .]+$/, '')
  return filename && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(filename)
    ? filename
    : `arquivo-${filename || 'original'}`
}
export const mediaInspectionSchema = assetManifestSchema.pick({
  width: true,
  height: true,
  durationMs: true,
  codec: true,
  rotation: true,
  hasAudio: true,
  frameRate: true,
  colorSpace: true,
  colorTransfer: true,
})
export const UPLOAD_PART_BYTES = 8 * 1024 * 1024
export const uploadStartSchema = z
  .object({ operationId: idSchema, manifest: assetManifestSchema })
  .strict()
export const uploadPartSchema = z
  .object({
    number: z.number().int().min(1).max(239),
    md5: z.string().regex(/^[A-Za-z0-9+/]{22}==$/),
  })
  .strict()
export const uploadedPartSchema = z
  .object({
    number: z.number().int().positive(),
    size: z.number().int().positive(),
    etag: z.string().min(1).max(200),
  })
  .strict()
export const uploadViewSchema = z
  .object({
    manifest: assetManifestSchema,
    state: z.enum(['preparing', 'uploading', 'verifying', 'confirmed', 'failed']),
    partBytes: z.literal(UPLOAD_PART_BYTES),
    bytesReceived: z.boolean(),
    parts: z.array(uploadedPartSchema).max(239),
    error: z.string().nullable(),
  })
  .strict()
export type UploadView = z.infer<typeof uploadViewSchema>
export type UploadedPart = z.infer<typeof uploadedPartSchema>
export type UploadStart = z.infer<typeof uploadStartSchema>
export type UploadPart = z.infer<typeof uploadPartSchema>
export const assetLibraryEntrySchema = z
  .object({
    manifest: assetManifestSchema,
    state: uploadViewSchema.shape.state,
    error: z.string().nullable(),
  })
  .strict()
export const assetLibraryQuerySchema = z.object({ after: idSchema.optional() }).strict()
export const assetLibraryPageSchema = z
  .object({
    items: z.array(assetLibraryEntrySchema).max(50),
    nextCursor: idSchema.nullable(),
  })
  .strict()
export type AssetLibraryPage = z.infer<typeof assetLibraryPageSchema>
export const assetConfirmationRequestSchema = z
  .object({
    ids: z
      .array(idSchema)
      .min(1)
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
  })
  .strict()
/** Missing or unfinished files are absent; this never authorizes deleting them. */
export const assetConfirmationSchema = z
  .object({ projectId: idSchema, manifests: z.array(assetManifestSchema).max(100) })
  .strict()
export type AssetConfirmation = z.infer<typeof assetConfirmationSchema>
/** Status lookup is independent of library pagination and never returns storage keys. */
export const assetStatusSchema = z
  .object({ projectId: idSchema, items: z.array(assetLibraryEntrySchema).max(100) })
  .strict()
export type AssetStatus = z.infer<typeof assetStatusSchema>
export const approvalSchema = z
  .object({
    schemaVersion: z.literal(1),
    operationId: idSchema,
    id: idSchema,
    projectId: idSchema,
    representationId: idSchema,
    revisionIds: z.array(idSchema).min(1).max(200),
    assets: z.array(z.object({ id: idSchema, sha256: hashSchema }).strict()).max(100),
    caption: z.string().max(10000),
    alt: z.string().max(4000),
    checks: z.array(z.string().min(1).max(200)).min(1).max(100),
  })
  .strict()
export type ApprovalRequest = z.infer<typeof approvalSchema>
