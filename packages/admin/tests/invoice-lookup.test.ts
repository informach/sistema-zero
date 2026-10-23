import { describe, expect, test } from 'bun:test'
import {
  INVOICE_LOOKUP_LOADING,
  invoiceFooterAction,
  invoiceLookupFor,
  invoiceLookupFrom,
} from '../src/app/admin/pagamentos/transacoes/invoice-lookup'
import type { InvoiceView } from '../src/lib/types'

const invoice = (id: string, paymentId: string, status: string) =>
  ({ id, paymentId, status }) as unknown as InvoiceView

describe('nota da venda no detalhe de Vendas', () => {
  test('"Emitir nota desta venda" só quando a busca confirmou que não há nota', () => {
    expect(invoiceFooterAction({ state: 'none' })).toBe('emit')
    expect(invoiceFooterAction(INVOICE_LOOKUP_LOADING)).toBe(null)
    expect(invoiceFooterAction({ state: 'error' })).toBe('error')
    expect(invoiceFooterAction({ state: 'found', invoice: invoice('n1', 'p1', 'ISSUED') })).toBe(
      null,
    )
  })

  test('trocar de venda volta a "procurando", sem herdar a nota da venda anterior', () => {
    const entry = {
      paymentId: 'p1',
      lookup: { state: 'found', invoice: invoice('n1', 'p1', 'ISSUED') } as const,
    }
    expect(invoiceLookupFor(entry, 'p1').state).toBe('found')
    expect(invoiceLookupFor(entry, 'p2')).toEqual(INVOICE_LOOKUP_LOADING)
    expect(invoiceLookupFor(entry, null)).toEqual(INVOICE_LOOKUP_LOADING)
    const semNota = { paymentId: 'p1', lookup: { state: 'none' } as const }
    expect(invoiceFooterAction(invoiceLookupFor(semNota, 'p2'))).toBe(null)
  })

  test('a nota ativa vence a cancelada, e notas de outras vendas não contam', () => {
    const found = invoiceLookupFrom(
      [
        invoice('outra', 'p9', 'ISSUED'),
        invoice('cancelada', 'p1', 'CANCELLED'),
        invoice('ativa', 'p1', 'ISSUED'),
      ],
      'p1',
    )
    expect(found.state === 'found' && found.invoice.id).toBe('ativa')
    expect(invoiceLookupFrom([invoice('outra', 'p9', 'ISSUED')], 'p1')).toEqual({ state: 'none' })
  })
})
