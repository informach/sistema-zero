import { z } from 'zod'
import { mediaInspectionSchema } from './assets'
import { hashSchema, idSchema } from './common'

export const mediaPreparationSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceAssetId: idSchema,
    sourceSha256: hashSchema,
    metadata: mediaInspectionSchema,
    proxyAssetId: idSchema.nullable(),
    thumbnailAssetId: idSchema.nullable(),
    waveformAssetId: idSchema.nullable(),
  })
  .strict()
export type MediaPreparation = z.infer<typeof mediaPreparationSchema>
export function preparedAssetIds(value: MediaPreparation) {
  return [value.proxyAssetId, value.thumbnailAssetId, value.waveformAssetId].filter(
    (id): id is string => Boolean(id),
  )
}
export const waveformSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceAssetId: idSchema,
    sourceSha256: hashSchema,
    durationMs: z.number().positive(),
    sampleRate: z.literal(8000),
    samplesPerBucket: z.number().int().positive(),
    peaks: z.array(z.number().min(0).max(1)).min(1).max(4000),
  })
  .strict()
