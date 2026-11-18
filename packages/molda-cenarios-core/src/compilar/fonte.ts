import { z } from 'zod'
import { IdentificadorDeCenarioSchema } from '../v2/entidades-schema'

export const FonteDaCompilacaoSchema = z
  .object({
    cenario: IdentificadorDeCenarioSchema,
    revisao: z.number().int().min(0).max(2147483647),
  })
  .strict()
export type FonteDaCompilacao = z.infer<typeof FonteDaCompilacaoSchema>
