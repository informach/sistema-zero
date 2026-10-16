import {
  compositionInputSchema,
  compositionSourceSchema,
  hashSchema,
  idSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'

export const compositionRenderInputSchema = z
  .object({
    source: compositionSourceSchema,
    input: compositionInputSchema,
    assets: z.record(idSchema, z.string().url()),
  })
  .strict()
export const compositionRenderProofSchema = z
  .object({
    schemaVersion: z.literal(1),
    sourceSha256: hashSchema,
    compiledSha256: hashSchema,
    inputSha256: hashSchema,
    observedFrames: z.number().int().positive(),
    textFrames: z.array(z.number().int().nonnegative()).max(20),
  })
  .strict()
