import { z } from 'zod'
import { DocumentoDeCenarioSchema } from '../v2/documento'
import { IdentificadorDeCenarioSchema } from '../v2/entidades-schema'
import { validarDocumento } from '../v2/validacao'
import { digestDoDocumentoDeCenario, FonteDaCompilacaoSchema } from './fonte'
import { ContextoDeLicencasSchema } from './licencas'

/** Resposta autorizada do host; o pedido contém somente id/revisão, nunca este contexto. */
export const PreparoDeExportacaoSchema = z
  .object({
    espacoId: IdentificadorDeCenarioSchema,
    fonte: FonteDaCompilacaoSchema,
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    documento: DocumentoDeCenarioSchema,
    contexto: ContextoDeLicencasSchema,
  })
  .strict()
export type PreparoDeExportacao = z.infer<typeof PreparoDeExportacaoSchema>

export async function conferirPreparoDeExportacao(
  entrada: unknown,
  cenario: string,
  revisao: number,
): Promise<PreparoDeExportacao> {
  const dados = PreparoDeExportacaoSchema.parse(entrada)
  if (
    dados.fonte.cenario !== cenario ||
    dados.documento.id !== cenario ||
    dados.fonte.revisao !== revisao
  )
    throw Error('O preparo da exportação não corresponde ao cenário e à revisão solicitados.')
  dados.documento = validarDocumento(dados.documento)
  if ((await digestDoDocumentoDeCenario(dados.documento)) !== dados.digest)
    throw Error('O documento da exportação não corresponde à revisão conferida pelo servidor.')
  return dados
}
