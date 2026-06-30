import type { FunnelRepo, Lead, LeadUpdate } from '../db/repo'

/**
 * Aplica ao lead o contexto congelado da cobrança que confirmou. Isso impede que
 * uma edição posterior do lead (ou uma cobrança mais nova) mude comprador/oferta
 * da cobrança antiga que acabou de pagar. Linhas legadas sem snapshot continuam
 * usando os dados atuais do lead.
 */
export async function applyPaymentContextToLead(
  repo: Pick<FunnelRepo, 'paymentContext' | 'updateLead'>,
  lead: Lead,
  paymentId: string,
): Promise<Lead> {
  const ctx = await repo.paymentContext(paymentId)
  if (!ctx) return lead

  const set: LeadUpdate = {}
  if (ctx.offerRef) set.offerRef = ctx.offerRef
  // `customer_email` é o marcador de snapshot novo; legado fica tudo null.
  if (ctx.email) {
    set.nome = ctx.nome
    set.email = ctx.email
    set.telefone = ctx.telefone
    set.document = ctx.document
  }
  if (Object.keys(set).length === 0) return lead

  await repo.updateLead(lead.id, set)
  return { ...lead, ...set }
}
