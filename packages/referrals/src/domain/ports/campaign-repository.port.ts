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
  /**
   * `giftOfferSameCourse`: o serviço conferiu no catálogo que a oferta nova do presente é do MESMO
   * curso que a gravada (27/11/2026). Aí a troca vale fora do rascunho e com resgates: cada
   * resgate guarda a própria oferta e a vaga sai do curso, que não muda.
   */
  update(
    id: string,
    input: CampaignInput,
    actor: string,
    expectedUpdatedAt: string,
    options?: { giftOfferSameCourse?: boolean },
  ): Promise<CampaignRecord | null>
  findById(id: string): Promise<CampaignRecord | null>
  /** A campanha que reivindica este endereço antigo (o prazo é conferido por quem chama). */
  findByRedirectPath(path: string): Promise<CampaignRecord | null>
  /** Campanhas com endereço antigo ainda no prazo (o funil guarda a lista e confere localmente). */
  listActiveRedirects(now: Date): Promise<CampaignRecord[]>
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
