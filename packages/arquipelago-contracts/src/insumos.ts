import { z } from 'zod'
import { REVISAO_MAXIMA, SalvamentoGuardadoSchema } from './api'
import { SALVAMENTO_MAX_BYTES, type Salvamento } from './salvamento'

/** Itens já usados pela horta, pelas receitas e pela pesca. Fonte gratuita continua disponível. */
export const INSUMOS = {
  'semente-alface': { preco: 2, fonte: 'horta' },
  'semente-tomate': { preco: 2, fonte: 'horta' },
  'semente-milho': { preco: 2, fonte: 'horta' },
  fuba: { preco: 2, fonte: 'moradores' },
  leite: { preco: 2, fonte: 'moradores' },
  ovo: { preco: 2, fonte: 'moradores' },
  polvilho: { preco: 3, fonte: 'moradores' },
  queijo: { preco: 3, fonte: 'moradores' },
  cacau: { preco: 3, fonte: 'moradores' },
  'leite-de-coco': { preco: 3, fonte: 'moradores' },
  'polpa-de-acai': { preco: 3, fonte: 'moradores' },
  // O peixe com coco da Maré (§6.28, A6): a cesta dela dá de graça; a feira também vende.
  peixe: { preco: 3, fonte: 'moradores' },
  coco: { preco: 3, fonte: 'moradores' },
  limao: { preco: 2, fonte: 'moradores' },
  // As iscas da pesca (30/10/2026): a de graça aparece na horta e no píer quando a mochila não tem.
  'isca-minhoca': { preco: 2, fonte: 'praia' },
  'isca-pena': { preco: 2, fonte: 'praia' },
} as const
export type Insumo = keyof typeof INSUMOS
export const VERSAO_DOS_INSUMOS = 1 as const
export const InsumoSchema = z.enum(Object.keys(INSUMOS) as [Insumo, ...Insumo[]])

/** A revisão é a que foi confirmada pela fila, nunca um snapshot arbitrário do navegador. */
export const CompraDeInsumosSchema = z.strictObject({
  versao: z.literal(VERSAO_DOS_INSUMOS),
  chave: z.uuid(),
  revisaoBase: z
    .number()
    .int()
    .min(1)
    .max(REVISAO_MAXIMA - 1),
  item: InsumoSchema,
  quantidade: z.number().int().min(1).max(10),
})
export type CompraDeInsumos = z.infer<typeof CompraDeInsumosSchema>

export const ResultadoDaCompraDeInsumosSchema = z
  .strictObject({
    versao: z.literal(VERSAO_DOS_INSUMOS),
    pedido: CompraDeInsumosSchema,
    situacao: z.enum(['pendente', 'entregue', 'saldo-insuficiente', 'recusada']),
    moedas: z.number().int().min(1).max(30),
    saldo: z.number().int().min(0).nullable(),
    guardado: SalvamentoGuardadoSchema,
  })
  .refine((r) => (r.situacao === 'entregue') === (r.saldo !== null))
  .refine((r) => r.moedas === precoDosInsumos(r.pedido))
  .refine(
    (r) =>
      r.guardado.salvamento !== null &&
      r.guardado.revisao >= r.pedido.revisaoBase + (r.situacao === 'entregue' ? 1 : 0),
  )
export type ResultadoDaCompraDeInsumos = z.infer<typeof ResultadoDaCompraDeInsumosSchema>

export const CompraDeInsumosPendenteSchema = z.strictObject({
  versao: z.literal(VERSAO_DOS_INSUMOS),
  pedido: CompraDeInsumosSchema.nullable(),
})

export function precoDosInsumos(pedido: Pick<CompraDeInsumos, 'item' | 'quantidade'>): number {
  return INSUMOS[pedido.item].preco * pedido.quantidade
}

/** Não cobra: prepara a entrega que o servidor aplica só depois do débito confirmado. */
export function prepararEntregaDeInsumos(s: Salvamento, bruto: CompraDeInsumos) {
  const pedido = CompraDeInsumosSchema.parse(bruto)
  const total = (s.inventario[pedido.item] ?? 0) + pedido.quantidade
  if (total > 999) return { ok: false as const, motivo: 'mochila-cheia' as const }
  const salvamento = {
    ...s,
    inventario: { ...s.inventario, [pedido.item]: total },
  }
  if (new TextEncoder().encode(JSON.stringify(salvamento)).byteLength > SALVAMENTO_MAX_BYTES)
    return { ok: false as const, motivo: 'salvamento-cheio' as const }
  return { ok: true as const, salvamento, moedas: precoDosInsumos(pedido) }
}
