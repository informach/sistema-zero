import type { CampaignInput, CampaignState, GiftSource } from '@sistemazero/core/referrals'

export interface CampaignRecord extends Omit<CampaignInput, 'startsAt' | 'endsAt'> {
  id: string
  startsAt: Date
  endsAt: Date
  createdAt: Date
  updatedAt: Date
}

export function campaignState(
  campaign: Pick<CampaignRecord, 'status' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): CampaignState {
  if (campaign.status === 'draft') return 'draft'
  if (campaign.status === 'ended' || now >= campaign.endsAt) return 'ended'
  if (campaign.status === 'paused') return 'paused'
  if (now < campaign.startsAt) return 'scheduled'
  return 'active'
}

export function campaignSource(campaign: CampaignRecord): GiftSource {
  return {
    kind: 'campaign',
    name: campaign.publicTitle,
    campaignId: campaign.id,
    context: campaign.context,
    description: campaign.description,
  }
}

export class CampaignUnavailableError extends Error {
  constructor(readonly state: CampaignState) {
    super('Esta campanha não aceita novos cadastros agora.')
  }
}

export class CampaignValidationError extends Error {}

export class CampaignConflictError extends Error {
  constructor() {
    super(
      'Esta campanha foi alterada em outra aba ou por outra pessoa. Feche o formulário, atualize a lista e confira os dados antes de editar novamente.',
    )
  }
}
