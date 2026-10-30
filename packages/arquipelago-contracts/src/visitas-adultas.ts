import { z } from 'zod'
import { CasaDoIrmaoSchema } from './familia'
import { ItemDoQuartoSchema, QuartoSchema } from './plataforma'

/** 192 bits aleatórios. Nunca usar o código como parâmetro de URL ou identidade. */
export const CodigoDaVisitaAdultaSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/)
export const PedidoDeVisitaAdultaSchema = z.strictObject({ codigo: CodigoDaVisitaAdultaSchema })
export const GerarConviteAdultoSchema = z.strictObject({})
export const EstadoDoConviteAdultoSchema = z.strictObject({
  versao: z.literal(1),
  ativo: z.boolean(),
})
export const ConviteAdultoCriadoSchema = z.strictObject({
  versao: z.literal(1),
  codigo: CodigoDaVisitaAdultaSchema,
})
/** A mesma projeção visual da casa, sem identidade de perfil ou dados de progresso. */
export const QuartoDaVisitaAdultaSchema = z.object({
  ...QuartoSchema.shape,
  placedItems: z.array(z.object(ItemDoQuartoSchema.shape)).max(200),
})
export const CasaDaVisitaAdultaSchema = CasaDoIrmaoSchema.omit({ perfilId: true }).extend({
  quarto: QuartoDaVisitaAdultaSchema.nullable(),
})
export type CasaDaVisitaAdulta = z.infer<typeof CasaDaVisitaAdultaSchema>
export const ConfirmacaoDaVisitaAdultaSchema = z.strictObject({
  versao: z.literal(1),
  disponivel: z.literal(true),
})
