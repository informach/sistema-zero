import { z } from 'zod'
import { QUADROS_POR_ILHA } from './desafios'
import { ILHA_IDS } from './ilhas'

/** Leitura das posições concluídas, independente do catálogo ainda publicado. */
export const CoresConquistadasSchema = z.strictObject({
  versao: z.literal(1),
  ilhas: z
    .array(
      z.strictObject({
        id: z.enum(ILHA_IDS),
        quadros: z
          .array(z.number().int().min(1).max(QUADROS_POR_ILHA))
          .max(QUADROS_POR_ILHA)
          .refine((valores) => new Set(valores).size === valores.length),
      }),
    )
    .max(ILHA_IDS.length)
    .refine((ilhas) => new Set(ilhas.map((i) => i.id)).size === ilhas.length),
})

export type CoresConquistadas = z.infer<typeof CoresConquistadasSchema>
