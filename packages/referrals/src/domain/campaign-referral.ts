import type { CampaignInput } from '@sistemazero/core/referrals'

/** Snapshot privado: nunca compõe GiftSource nem a resposta pública do presente. */
export interface CampaignReferralSnapshot {
  ambassadorId: string
  ambassadorName: string
  ambassadorEmail: string
  commissionEnabled: boolean
  commissionAmountCents: number | null
  commissionAnnualAmountCents?: number | null
  commissionWindowDays: number | null
}

/** Desativar a pessoa não pode impedir pausar a campanha ou desligar sua comissão. */
export function requiresActiveCampaignAmbassador(
  input: CampaignInput,
  previous?: Pick<
    CampaignInput,
    | 'ambassadorId'
    | 'commissionEnabled'
    | 'commissionAmountCents'
    | 'commissionAnnualAmountCents'
    | 'commissionWindowDays'
  > & { status: string },
) {
  return (
    !!input.ambassadorId &&
    (!previous ||
      input.ambassadorId !== previous.ambassadorId ||
      (input.status === 'active' && previous.status !== 'active') ||
      (input.commissionEnabled &&
        (!previous.commissionEnabled ||
          input.commissionAmountCents !== previous.commissionAmountCents ||
          input.commissionAnnualAmountCents !== previous.commissionAnnualAmountCents ||
          input.commissionWindowDays !== previous.commissionWindowDays)))
  )
}
