import { z } from 'zod'
import { hashSchema, idSchema } from './common'
import { importDestinationSchema } from './import-inventory'

export const importOfficeApplySchema = z
  .object({
    operationId: idSchema,
    base64: z
      .string()
      .max(262144)
      .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  })
  .strict()
export type ImportOfficeApply = z.infer<typeof importOfficeApplySchema>
export const importOfficeViewSchema = z
  .object({
    sourceVersionId: idSchema,
    sourcePath: z.string().max(1500),
    sourceHash: hashSchema,
    assetId: idSchema,
    size: z.number().int().positive(),
    parserVersion: z.literal('office-text-v1'),
    destinations: z.array(importDestinationSchema).max(10),
    notes: z.array(z.string().max(1000)).max(10),
  })
  .strict()
export type ImportOfficeView = z.infer<typeof importOfficeViewSchema>
