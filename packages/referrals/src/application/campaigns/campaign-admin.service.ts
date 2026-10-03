import type {
  CampaignDetailView,
  CampaignInput,
  CampaignUpdateInput,
  CampaignView,
} from '@sistemazero/core/referrals'
import { type CampaignRecord, CampaignValidationError, campaignState } from '../../domain/campaign'
import { isValidCode } from '../../domain/codes'
import { scholarshipExpiresAt } from '../../domain/gift-policy'
import { scholarshipShareUrl } from '../../domain/links'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'

export function validateCampaignInput(input: CampaignInput): CampaignInput {
  const result: CampaignInput = {
    name: input.name.trim(),
    publicTitle: input.publicTitle.trim(),
    description: input.description.trim(),
    code: input.code.trim().toLowerCase(),
    channel: input.channel.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: input.status,
    context: input.context,
  }
  const start = new Date(input.startsAt)
  const end = new Date(input.endsAt)
  if (
    result.name.length < 2 ||
    result.name.length > 120 ||
    result.publicTitle.length < 2 ||
    result.publicTitle.length > 160 ||
    result.description.length > 600 ||
    result.channel.length > 100 ||
    !isValidCode(result.code) ||
    result.code === 'previa'
  )
    throw new CampaignValidationError('Confira o nome, o título e o código da campanha.')
  if (
    !['draft', 'active', 'paused', 'ended'].includes(result.status) ||
    !['ad', 'event', 'other'].includes(result.context)
  )
    throw new CampaignValidationError('Tipo ou estado de campanha inválido.')
  if (
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end <= start ||
    !/(Z|[+-]\d\d:\d\d)$/.test(input.startsAt) ||
    !/(Z|[+-]\d\d:\d\d)$/.test(input.endsAt)
  )
    throw new CampaignValidationError(
      'Informe início e encerramento com fuso. O encerramento deve ser posterior ao início.',
    )
  return { ...result, startsAt: start.toISOString(), endsAt: end.toISOString() }
}

export class CampaignAdminService {
  constructor(
    readonly repo: CampaignRepository,
    private readonly referrals: ReferralRepository,
    private readonly funnelUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async view(campaign: CampaignRecord): Promise<CampaignView> {
    return {
      ...campaign,
      state: campaignState(campaign, this.now()),
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      shareUrl: scholarshipShareUrl(this.funnelUrl, campaign.code),
      stats: await this.repo.stats(campaign.id),
    }
  }

  async list(opts: { q?: string; limit: number; offset: number }) {
    const result = await this.repo.list(opts)
    return {
      items: await Promise.all(result.items.map((campaign) => this.view(campaign))),
      total: result.total,
    }
  }

  async create(
    input: CampaignInput,
    actor: string,
    duplicatedFrom?: string,
  ): Promise<CampaignView | null> {
    const validated = validateCampaignInput(input)
    if (duplicatedFrom) {
      const previous = await this.repo.findById(duplicatedFrom)
      if (!previous) throw new CampaignValidationError('A campanha original não foi encontrada.')
      if (previous.code === validated.code)
        throw new CampaignValidationError('Uma nova edição precisa de outro código.')
    }
    const created = await this.repo.create(validated, actor, duplicatedFrom)
    return created ? this.view(created) : null
  }

  async update(
    id: string,
    input: CampaignUpdateInput,
    actor: string,
  ): Promise<CampaignView | null> {
    const validated = validateCampaignInput(input)
    const previous = await this.repo.findById(id)
    if (!previous) return null
    if (previous.code !== validated.code)
      throw new CampaignValidationError(
        'O código de uma campanha existente não muda. Duplique para criar outra edição.',
      )
    const updated = await this.repo.update(id, validated, actor, input.expectedUpdatedAt)
    return updated ? this.view(updated) : null
  }

  async detail(id: string): Promise<CampaignDetailView | null> {
    const campaign = await this.repo.findById(id)
    if (!campaign) return null
    const code = await this.referrals.findCodeByCode(campaign.code)
    const [view, history, redemptions] = await Promise.all([
      this.view(campaign),
      this.repo.history(id),
      code ? this.referrals.listRedemptionsByCode(code.id, 200) : Promise.resolve([]),
    ])
    return {
      campaign: view,
      history,
      redemptions: redemptions.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        email: r.email,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        expiresAt: scholarshipExpiresAt(r.createdAt, r.accessDurationDays)?.toISOString() ?? null,
        lastError: r.lastError ?? r.failedReason,
        attribution: r.attribution ?? null,
      })),
    }
  }
}
