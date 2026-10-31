import { z } from 'zod'
import { REVISAO_MAXIMA, SalvamentoGuardadoSchema } from './api'
import { RECEITAS } from './receitas-moradores'
import { SALVAMENTO_MAX_BYTES, type Salvamento } from './salvamento'

/**
 * A banca da feira da Vila Doce (§6.28, A22): a criança vende os pratos que cozinhou. A proposta
 * põe a feira entre as fontes de moeda "baixas", com o teto semanal do jogo: uma venda por dia,
 * até cinco pratos, uma moeda cada; o pão de queijo "vende bem na feira" e vale duas. O consumo dos
 * pratos e o crédito passam pelo serviço, como a entrega de pedidos (chave, pagamento e teto).
 */
export const VERSAO_DAS_VENDAS = 1 as const
export const PRATOS_POR_DIA_NA_FEIRA = 5
export const PRECO_NA_FEIRA = 1
export const PRECOS_ESPECIAIS_NA_FEIRA: Readonly<Record<string, number>> = { 'pao-de-queijo': 2 }
/** O que a banca compra: os pratos que saem das receitas (nunca ingredientes ou colheita crua). */
export const PRATOS_DA_FEIRA: readonly string[] = [...new Set(RECEITAS.map((r) => r.faz.id))]
export const MOEDAS_MAXIMAS_DA_VENDA = PRATOS_POR_DIA_NA_FEIRA * 2

export function precoNaFeira(item: string): number | null {
  if (!PRATOS_DA_FEIRA.includes(item)) return null
  return PRECOS_ESPECIAIS_NA_FEIRA[item] ?? PRECO_NA_FEIRA
}

export const ItensDaVendaSchema = z
  .record(z.string().min(1).max(40), z.number().int().min(1).max(PRATOS_POR_DIA_NA_FEIRA))
  .refine((itens) => {
    const total = Object.values(itens).reduce((s, n) => s + n, 0)
    return total >= 1 && total <= PRATOS_POR_DIA_NA_FEIRA
  }, 'A banca vende de um a cinco pratos por dia')
  .refine(
    (itens) => Object.keys(itens).every((id) => precoNaFeira(id) !== null),
    'Prato desconhecido',
  )
export type ItensDaVenda = z.infer<typeof ItensDaVendaSchema>

export const VenderNaFeiraSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VENDAS),
  chave: z.uuid(),
  revisaoBase: z
    .number()
    .int()
    .min(1)
    .max(REVISAO_MAXIMA - 1),
  dia: z.iso.date(),
  itens: ItensDaVendaSchema,
})
export type VenderNaFeira = z.infer<typeof VenderNaFeiraSchema>

export const PagamentoDaVendaSchema = z.enum(['pendente', 'creditado', 'teto', 'recusado'])
export type PagamentoDaVenda = z.infer<typeof PagamentoDaVendaSchema>

export const ResultadoDaVendaSchema = z
  .strictObject({
    versao: z.literal(VERSAO_DAS_VENDAS),
    venda: VenderNaFeiraSchema,
    pagamento: PagamentoDaVendaSchema,
    moedas: z.number().int().min(1).max(MOEDAS_MAXIMAS_DA_VENDA),
    guardado: SalvamentoGuardadoSchema,
  })
  .refine((r) => r.guardado.salvamento !== null && r.guardado.revisao > r.venda.revisaoBase)
export type ResultadoDaVenda = z.infer<typeof ResultadoDaVendaSchema>

/** No máximo um crédito por retomada, como nos pedidos. */
export const VendasPendentesSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VENDAS),
  vendas: z.array(VenderNaFeiraSchema).max(1),
})

export type VendaNaFeira =
  | { ok: false; motivo: 'prato-invalido' | 'faltam-pratos' | 'demais' | 'salvamento-cheio' }
  | { ok: true; salvamento: Salvamento; moedas: number }

/** A mesma transição serve à prévia local e à confirmação do serviço. Não toca na carteira. */
export function prepararVendaNaFeira(
  s: Salvamento,
  itens: Readonly<Record<string, number>>,
): VendaNaFeira {
  const total = Object.values(itens).reduce((soma, n) => soma + n, 0)
  if (total < 1 || total > PRATOS_POR_DIA_NA_FEIRA) return { ok: false, motivo: 'demais' }
  const inventario = { ...s.inventario }
  let moedas = 0
  for (const [id, qtd] of Object.entries(itens)) {
    const preco = precoNaFeira(id)
    if (preco === null || !Number.isInteger(qtd) || qtd < 1)
      return { ok: false, motivo: 'prato-invalido' }
    if ((inventario[id] ?? 0) < qtd) return { ok: false, motivo: 'faltam-pratos' }
    const restante = (inventario[id] ?? 0) - qtd
    if (restante) inventario[id] = restante
    else delete inventario[id]
    moedas += preco * qtd
  }
  const salvamento: Salvamento = { ...s, inventario }
  if (new TextEncoder().encode(JSON.stringify(salvamento)).byteLength > SALVAMENTO_MAX_BYTES)
    return { ok: false, motivo: 'salvamento-cheio' }
  return { ok: true, salvamento, moedas }
}
