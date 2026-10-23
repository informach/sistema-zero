import type { InvoiceView } from '@/lib/types'

/** A nota da venda aberta no detalhe: procurada pelo código da venda na lista de notas. */
export type InvoiceLookup =
  | { state: 'loading' }
  /** Nenhuma nota valendo. `previous`: a mais recente das que não valem (falhou, cancelada…). */
  | { state: 'none'; previous?: InvoiceView }
  | { state: 'error' }
  | { state: 'found'; invoice: InvoiceView }

/** O resultado da busca guarda a venda a que se refere, para nunca valer para outra venda. */
export type InvoiceLookupEntry = { paymentId: string | null; lookup: InvoiceLookup }

export const INVOICE_LOOKUP_LOADING: InvoiceLookup = { state: 'loading' }

/**
 * As notas que contam como "a nota desta venda": as mesmas do fiscal
 * (`ACTIVE_STATUSES` em packages/fiscal/.../invoice.repository.ts). Falhou, pulada, cancelada
 * ou trocada por outra não vale: a venda pode ganhar uma nota nova.
 */
const ACTIVE_INVOICE = new Set(['SCHEDULED', 'EMITTED', 'CANCEL_PENDING', 'CANCEL_FAILED'])

/**
 * A nota desta venda entre as notas achadas pela busca livre. Sem nenhuma valendo, a mais
 * recente das outras vai como `previous`, para a tela oferecer abrir a nota anterior.
 */
export function invoiceLookupFrom(items: InvoiceView[], paymentId: string): InvoiceLookup {
  const mine = items
    .filter((inv) => inv.paymentId === paymentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const active = mine.find((inv) => ACTIVE_INVOICE.has(inv.status))
  if (active) return { state: 'found', invoice: active }
  const previous = mine[0]
  return previous ? { state: 'none', previous } : { state: 'none' }
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
 * que não há nota valendo (nunca enquanto procura nem depois de um erro); depois de um erro, o
 * aviso.
 */
export function invoiceFooterAction(lookup: InvoiceLookup): 'emit' | 'error' | null {
  if (lookup.state === 'none') return 'emit'
  if (lookup.state === 'error') return 'error'
  return null
}
