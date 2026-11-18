import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { z } from 'zod'
import type { DocumentoDeCenario } from '../v2/documento'
import { IdentificadorDeCenarioSchema } from '../v2/entidades-schema'
import { validarDocumento } from '../v2/validacao'

export const FonteDaCompilacaoSchema = z
  .object({
    cenario: IdentificadorDeCenarioSchema,
    revisao: z.number().int().min(0).max(2147483647),
  })
  .strict()
export type FonteDaCompilacao = z.infer<typeof FonteDaCompilacaoSchema>

/** Documento autoral, antes de resolver conjuntos; estável na ida e volta por JSONB/HTTP. */
export async function digestDoDocumentoDeCenario(entrada: DocumentoDeCenario): Promise<string> {
  return sha256Hex(canonicalJson(validarDocumento(entrada)))
}
