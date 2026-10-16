import { z } from 'zod'
import { idSchema, timestampSchema } from './common'
import { importOriginSchema, importProductSchema } from './import-inventory'

export const importProductBindingSchema = z
  .object({
    projectId: idSchema,
    origin: importOriginSchema,
    product: importProductSchema,
    includeShared: z.boolean(),
    revisionId: idSchema,
    updatedBy: idSchema,
    updatedAt: timestampSchema,
  })
  .strict()
export type ImportProductBinding = z.infer<typeof importProductBindingSchema>
export const importProductBindSchema = z
  .object({
    operationId: idSchema,
    origin: importOriginSchema,
    product: importProductSchema,
    includeShared: z.boolean(),
    expectedRevisionId: idSchema.nullable(),
  })
  .strict()
  .refine((value) => value.product !== 'shared' || !value.includeShared, {
    message: 'Uma biblioteca compartilhada já contém as referências comuns',
  })
export type ImportProductBind = z.infer<typeof importProductBindSchema>
export function importProductAllowed(
  binding: Pick<ImportProductBinding, 'product' | 'includeShared'>,
  product: string,
) {
  return product === binding.product || (product === 'shared' && binding.includeShared)
}
