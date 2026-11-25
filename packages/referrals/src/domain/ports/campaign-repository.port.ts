import type {
  CampaignAuditView,
  CampaignInput,
  CampaignView,
  GiftAudience,
} from '@sistemazero/core/referrals'
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
  /** A campanha que reivindica este endereço antigo (o prazo é conferido por quem chama). */
  findByRedirectPath(path: string): Promise<CampaignRecord | null>
  list(opts: {
    q?: string
    audience?: GiftAudience
    ambassadorId?: string
    publishedOnly?: boolean
    limit: number
    offset: number
  }): Promise<{ items: CampaignRecord[]; total: number }>
  stats(id: string): Promise<CampaignView['stats']>
  /** Alguém já comprou ou resgatou pela campanha (trava tipo e oferta à venda). */
  hasAcquisitions(id: string): Promise<boolean>
  history(id: string): Promise<CampaignAuditView[]>
}
