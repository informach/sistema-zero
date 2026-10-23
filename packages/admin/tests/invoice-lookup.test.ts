import { describe, expect, test } from 'bun:test'
import {
  INVOICE_LOOKUP_LOADING,
  invoiceFooterAction,
  invoiceLookupFor,
  invoiceLookupFrom,
} from '../src/app/admin/pagamentos/transacoes/invoice-lookup'
import type { InvoiceView } from '../src/lib/types'

const invoice = (
  id: string,
  paymentId: string,
  status: string,
  createdAt = '2026-10-20T12:00:00.000Z',
) => ({ id, paymentId, status, createdAt }) as unknown as InvoiceView

describe('nota da venda no detalhe de Vendas', () => {
  test('"Emitir nota desta venda" só quando a busca confirmou que não há nota', () => {
    expect(invoiceFooterAction({ state: 'none' })).toBe('emit')
    expect(invoiceFooterAction(INVOICE_LOOKUP_LOADING)).toBe(null)
    expect(invoiceFooterAction({ state: 'error' })).toBe('error')
    expect(invoiceFooterAction({ state: 'found', invoice: invoice('n1', 'p1', 'EMITTED') })).toBe(
      null,
    )
  })

  test('trocar de venda volta a "procurando", sem herdar a nota da venda anterior', () => {
    const entry = {
      paymentId: 'p1',
      lookup: { state: 'found', invoice: invoice('n1', 'p1', 'EMITTED') } as const,
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
        invoice('outra', 'p9', 'EMITTED'),
        invoice('cancelada', 'p1', 'CANCELLED'),
        invoice('ativa', 'p1', 'EMITTED'),
      ],
      'p1',
    )
    expect(found.state === 'found' && found.invoice.id).toBe('ativa')
    expect(invoiceLookupFrom([invoice('outra', 'p9', 'EMITTED')], 'p1')).toEqual({ state: 'none' })
  })

  test('as notas que valem são as mesmas do fiscal: agendada, emitida e cancelamento em curso', () => {
    for (const status of ['SCHEDULED', 'EMITTED', 'CANCEL_PENDING', 'CANCEL_FAILED']) {
      const found = invoiceLookupFrom([invoice('n1', 'p1', status)], 'p1')
      expect(found.state).toBe('found')
      expect(invoiceFooterAction(found)).toBe(null)
    }
  })

  test('só notas que não valem: emitir de novo e abrir a mais recente como anterior', () => {
    for (const status of ['FAILED', 'SKIPPED', 'CANCELLED', 'SUBSTITUTED']) {
      const lookup = invoiceLookupFrom([invoice('n1', 'p1', status)], 'p1')
      expect(lookup.state).toBe('none')
      expect(invoiceFooterAction(lookup)).toBe('emit')
    }
    const lookup = invoiceLookupFrom(
      [
        invoice('velha', 'p1', 'CANCELLED', '2026-10-01T12:00:00.000Z'),
        invoice('recente', 'p1', 'FAILED', '2026-10-15T12:00:00.000Z'),
        invoice('outra', 'p9', 'FAILED', '2026-10-20T12:00:00.000Z'),
      ],
      'p1',
    )
    expect(lookup.state === 'none' && lookup.previous?.id).toBe('recente')
    expect(invoiceLookupFrom([], 'p1')).toEqual({ state: 'none' })
  })
})
