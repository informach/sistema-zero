import 'server-only'
import type { FiscalStats, InvoiceDetail, InvoiceList } from '@/lib/types'
import { type GatewayResponse, gatewayFetch, gatewayFetchRaw } from './gateway'

export interface ListInvoicesParams {
  status?: string
  q?: string
  limit?: number
  offset?: number
}

// ── Notas (NFS-e) ──
export function listInvoices(p: ListInvoicesParams): Promise<GatewayResponse<InvoiceList>> {
  return gatewayFetch('/fiscal/admin/invoices', {
    query: { status: p.status, q: p.q, limit: p.limit, offset: p.offset },
  })
}

export function getInvoice(id: string): Promise<GatewayResponse<InvoiceDetail>> {
  return gatewayFetch(`/fiscal/admin/invoices/${encodeURIComponent(id)}`)
}

/**
 * PDF da nota (binário `application/pdf`; 404 se ainda sem PDF). Devolve a
 * `Response` CRUA do gateway p/ o route handler repassar `res.body` em
 * streaming — sem materializar o binário no BFF.
 */
export function getInvoicePdf(id: string): Promise<Response> {
  return gatewayFetchRaw(`/fiscal/admin/invoices/${encodeURIComponent(id)}/pdf`)
}

/** Reprocessa a emissão (só nota FAILED — o fiscal valida o estado). */
export function retryInvoice(id: string): Promise<GatewayResponse<{ ok: boolean }>> {
  return gatewayFetch(`/fiscal/admin/invoices/${encodeURIComponent(id)}/retry`, {
    method: 'POST',
  })
}

/**
 * Antecipa a emissão de nota AGENDADA (só SCHEDULED — o fiscal valida o estado;
 * o worker emite em ≤30s e a re-verificação de estorno na emissão continua valendo).
 */
export function emitInvoiceNow(id: string): Promise<GatewayResponse<{ ok: boolean }>> {
  return gatewayFetch(`/fiscal/admin/invoices/${encodeURIComponent(id)}/emit-now`, {
    method: 'POST',
  })
}

/**
 * Emissão MANUAL por pagamento (backfill/antecipação — emite AGORA, sem esperar
 * a garantia). 201 `{id}`; erros do contrato: 404 PAYMENT_NOT_FOUND, 409
 * PAYMENT_NOT_PAID, 409 INVOICE_ALREADY_EXISTS (mensagem traz o id da nota),
 * 422 INVALID_DOCUMENT, 502 PAYMENTS_UNAVAILABLE.
 */
export function createManualInvoice(paymentId: string): Promise<GatewayResponse<{ id: string }>> {
  return gatewayFetch('/fiscal/admin/invoices', { method: 'POST', body: { paymentId } })
}

/** Cancela a nota emitida (motivo obrigatório, 3..500 chars). */
export function cancelInvoice(id: string, reason: string): Promise<GatewayResponse<unknown>> {
  return gatewayFetch(`/fiscal/admin/invoices/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { reason },
  })
}

export interface SubstituteInvoiceBody {
  customerName?: string
  customerDocument?: string
  serviceDescription?: string
}

/** Emite a nota SUBSTITUTA (≥1 campo corrigido; a original é cancelada por substituição). */
export function substituteInvoice(
  id: string,
  body: SubstituteInvoiceBody,
): Promise<GatewayResponse<{ id: string }>> {
  return gatewayFetch(`/fiscal/admin/invoices/${encodeURIComponent(id)}/substitute`, {
    method: 'POST',
    body,
  })
}

// ── Stats ──
export function getFiscalStats(): Promise<GatewayResponse<FiscalStats>> {
  return gatewayFetch('/fiscal/admin/stats')
}
