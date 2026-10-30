import { z } from 'zod'
import { REVISAO_MAXIMA, SalvamentoGuardadoSchema } from './api'
import { MoradorDoPedidoSchema } from './pedidos-entrega'

export const EntregarPedidoSchema = z.strictObject({
  versao: z.literal(1),
  chave: z.uuid(),
  revisaoBase: z
    .number()
    .int()
    .min(1)
    .max(REVISAO_MAXIMA - 1),
  morador: MoradorDoPedidoSchema,
  dia: z.iso.date(),
  pedido: z.string().min(1).max(40),
})
export type EntregarPedido = z.infer<typeof EntregarPedidoSchema>
export const PagamentoDoPedidoSchema = z.enum(['pendente', 'creditado', 'teto', 'recusado'])
export type PagamentoDoPedido = z.infer<typeof PagamentoDoPedidoSchema>
export const ResultadoDoPedidoSchema = z
  .strictObject({
    versao: z.literal(1),
    pedido: EntregarPedidoSchema,
    pagamento: PagamentoDoPedidoSchema,
    moedas: z.union([z.literal(3), z.literal(4)]),
    guardado: SalvamentoGuardadoSchema,
  })
  .refine((r) => r.guardado.salvamento !== null && r.guardado.revisao > r.pedido.revisaoBase)
export type ResultadoDoPedido = z.infer<typeof ResultadoDoPedidoSchema>
/** No máximo um crédito por retomada: indisponibilidade não abre uma fila de esperas longas. */
export const PedidosPendentesSchema = z.strictObject({
  versao: z.literal(1),
  pedidos: z.array(EntregarPedidoSchema).max(1),
})
