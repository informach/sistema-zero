import type { CampaignAuditView, CampaignInput, CampaignView } from '@sistemazero/core/referrals'
import type { CampaignRecord } from '../campaign'

export interface CampaignRepository {
  create(
    input: CampaignInput,
    actor: string,
    duplicatedFrom?: string,
  ): Promise<CampaignRecord | null>
  update(
    id: string,
    input: CampaignInput,
    actor: string,
    expectedUpdatedAt: string,
  ): Promise<CampaignRecord | null>
  findById(id: string): Promise<CampaignRecord | null>
  list(opts: {
    q?: string
    limit: number
    offset: number
  }): Promise<{ items: CampaignRecord[]; total: number }>
  stats(id: string): Promise<CampaignView['stats']>
  history(id: string): Promise<CampaignAuditView[]>
}
