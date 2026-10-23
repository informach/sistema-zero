import type { InvoiceView } from '@/lib/types'

/** A nota da venda aberta no detalhe: procurada pelo código da venda na lista de notas. */
export type InvoiceLookup =
  | { state: 'loading' }
  | { state: 'none' }
  | { state: 'error' }
  | { state: 'found'; invoice: InvoiceView }

/** O resultado da busca guarda a venda a que se refere, para nunca valer para outra venda. */
export type InvoiceLookupEntry = { paymentId: string | null; lookup: InvoiceLookup }

export const INVOICE_LOOKUP_LOADING: InvoiceLookup = { state: 'loading' }

/** Notas que não contam como "a nota desta venda" (canceladas ou trocadas por outra). */
const INACTIVE_INVOICE = new Set(['CANCELLED', 'SUBSTITUTED'])

/** A nota desta venda entre as notas achadas pela busca livre (a ativa vence a cancelada). */
export function invoiceLookupFrom(items: InvoiceView[], paymentId: string): InvoiceLookup {
  const mine = items.filter((inv) => inv.paymentId === paymentId)
  const active = mine.find((inv) => !INACTIVE_INVOICE.has(inv.status)) ?? mine[0]
  return active ? { state: 'found', invoice: active } : { state: 'none' }
}

/**
 * A busca que vale para a venda aberta agora. Se a venda mudou e a busca nova ainda não voltou,
 * é "procurando", nunca o selo ou o link da venda anterior.
 */
export function invoiceLookupFor(
  entry: InvoiceLookupEntry,
  selectedId: string | null,
): InvoiceLookup {
  if (selectedId === null || entry.paymentId !== selectedId) return INVOICE_LOOKUP_LOADING
  return entry.lookup
}

/**
 * O que o rodapé da venda paga mostra sobre a nota: o botão de emitir só quando a busca confirmou
 * que não há nota (nunca enquanto procura nem depois de um erro); depois de um erro, o aviso.
 */
export function invoiceFooterAction(lookup: InvoiceLookup): 'emit' | 'error' | null {
  if (lookup.state === 'none') return 'emit'
  if (lookup.state === 'error') return 'error'
  return null
}
