import { z } from 'zod'
import { IdentificadorDeCenarioSchema } from '../v2/entidades-schema'

export const LicencaDaBibliotecaSchema = z
  .object({
    id: IdentificadorDeCenarioSchema,
    nome: z.string().min(1).max(120),
    licenca: z.enum(['propria', 'livre', 'restrita']),
  })
  .strict()
export type LicencaDaBiblioteca = z.infer<typeof LicencaDaBibliotecaSchema>
export const ContextoDeLicencasSchema = z
  .object({
    equipe: z.boolean(),
    bibliotecas: z.array(LicencaDaBibliotecaSchema).max(8192),
  })
  .strict()
export interface ContextoDeLicencas {
  equipe: boolean
  bibliotecas: readonly LicencaDaBiblioteca[]
}

/** Regra compartilhável. O servidor constrói o contexto a partir do ator e da revisão reais. */
export function conferirLicencasDaCompilacao(
  usadas: readonly string[],
  contexto: ContextoDeLicencas,
): LicencaDaBiblioteca[] {
  const dados = ContextoDeLicencasSchema.parse(contexto),
    ids = z.array(IdentificadorDeCenarioSchema).max(8192).parse(usadas),
    porId = new Map(dados.bibliotecas.map((b) => [b.id, b]))
  if (porId.size !== dados.bibliotecas.length)
    throw Error('Há uma biblioteca repetida na conferência de licenças.')
  return [...new Set(ids)].sort().map((id) => {
    const biblioteca = porId.get(id)
    if (!biblioteca)
      throw Error(`A biblioteca “${id}” não foi informada na conferência de licenças.`)
    if (biblioteca.licenca === 'restrita' && !dados.equipe)
      throw Error(
        `A biblioteca “${biblioteca.nome}” tem licença restrita. Somente a equipe pode exportar esses recursos.`,
      )
    return biblioteca
  })
}
