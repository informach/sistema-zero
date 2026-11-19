import type { CheckoutDeps } from './checkout'

/** O webhook é o backstop durável; polling e recibos síncronos também podem concluir o grant. */
export async function runPostPayment(leadId: string, deps: CheckoutDeps): Promise<void> {
  if (!deps.fulfill && !deps.grantMembers && !deps.sendWelcome) return
  try {
    let lead = await deps.repo.getLead(leadId)
    if (!lead?.paidAt) return
    if (deps.fulfill && !lead.buyerRegisteredAt) {
      await deps.fulfill(lead)
      lead = (await deps.repo.getLead(leadId)) ?? lead
    }
    if (lead.buyerUserId) {
      if (deps.grantMembers) await deps.grantMembers(lead)
      if (deps.sendWelcome) await deps.sendWelcome(lead)
    }
  } catch (error) {
    deps.log?.('checkout.post_payment_retry_needed', {
      leadId,
      error: error instanceof Error ? error.name : 'unknown',
    })
  }
}
