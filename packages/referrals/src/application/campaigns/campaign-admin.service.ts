import {
  type CampaignDetailView,
  type CampaignInput,
  type CampaignUpdateInput,
  type CampaignView,
  type GiftAudience,
  isGiftAudience,
} from '@sistemazero/core/referrals'
import {
  CampaignAudienceLockedError,
  type CampaignRecord,
  CampaignValidationError,
  campaignState,
} from '../../domain/campaign'
import { requiresActiveCampaignAmbassador } from '../../domain/campaign-referral'
import { isValidCode } from '../../domain/codes'
import { scholarshipExpiresAt } from '../../domain/gift-policy'
import { scholarshipShareUrl } from '../../domain/links'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'

/** Entrada validada: o público sempre resolvido (ausente = `kids`). */
export type ValidatedCampaignInput = CampaignInput & { audience: GiftAudience }

export function validateCampaignInput(input: CampaignInput): ValidatedCampaignInput {
  if (input.audience !== undefined && !isGiftAudience(input.audience))
    throw new CampaignValidationError('Escolha o público do presente: Kids ou adulto.')
  const result: ValidatedCampaignInput = {
    name: input.name.trim(),
    publicTitle: input.publicTitle.trim(),
    description: input.description.trim(),
    code: input.code.trim().toLowerCase(),
    channel: input.channel.trim(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: input.status,
    context: input.context,
    audience: input.audience ?? 'kids',
    ambassadorId: input.ambassadorId ?? null,
    commissionEnabled: input.commissionEnabled ?? false,
    commissionAmountCents: input.commissionEnabled ? (input.commissionAmountCents ?? null) : null,
    commissionWindowDays: input.commissionEnabled ? (input.commissionWindowDays ?? null) : null,
  }
  if (
    result.ambassadorId !== null &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.ambassadorId!)
  )
    throw new CampaignValidationError('Escolha um embaixador válido.')
  if (
    result.commissionEnabled &&
    (!result.ambassadorId ||
      !Number.isSafeInteger(result.commissionAmountCents) ||
      (result.commissionAmountCents ?? 0) < 1 ||
      (result.commissionAmountCents ?? 0) > 100_000_000 ||
      !Number.isSafeInteger(result.commissionWindowDays) ||
      (result.commissionWindowDays ?? 0) < 1 ||
      (result.commissionWindowDays ?? 0) > 3650)
  )
    throw new CampaignValidationError(
      'Para habilitar comissão, escolha o embaixador, o valor fixo em centavos e o prazo de 1 a 3650 dias após o cadastro.',
    )
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
    const ambassador = campaign.ambassadorId
      ? await this.referrals.findAmbassadorById(campaign.ambassadorId)
      : null
    return {
      ...campaign,
      ambassadorName: ambassador?.name ?? null,
      state: campaignState(campaign, this.now()),
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      shareUrl: scholarshipShareUrl(this.funnelUrl, campaign.code),
      stats: await this.repo.stats(campaign.id),
    }
  }

  async list(opts: { q?: string; audience?: GiftAudience; limit: number; offset: number }) {
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
    let validated = validateCampaignInput(input)
    await this.validateAmbassador(validated)
    if (duplicatedFrom) {
      const previous = await this.repo.findById(duplicatedFrom)
      if (!previous) throw new CampaignValidationError('A campanha original não foi encontrada.')
      if (previous.code === validated.code)
        throw new CampaignValidationError('Uma nova edição precisa de outro código.')
      // A duplicata herda o público da original quando o corpo não escolhe outro.
      if (input.audience === undefined) validated = { ...validated, audience: previous.audience }
    }
    const created = await this.repo.create(validated, actor, duplicatedFrom)
    return created ? this.view(created) : null
  }

  async update(
    id: string,
    input: CampaignUpdateInput,
    actor: string,
  ): Promise<CampaignView | null> {
    const previous = await this.repo.findById(id)
    if (!previous) return null
    const sameBeneficiary =
      input.ambassadorId === undefined || input.ambassadorId === previous.ambassadorId
    // Cliente que não manda o público (anterior a 20/10/2026) mantém o que está gravado.
    const validated = validateCampaignInput({
      ...input,
      audience: input.audience ?? previous.audience,
      ambassadorId: input.ambassadorId === undefined ? previous.ambassadorId : input.ambassadorId,
      commissionEnabled:
        input.commissionEnabled ?? (sameBeneficiary ? previous.commissionEnabled : false),
      commissionAmountCents:
        input.commissionAmountCents === undefined
          ? sameBeneficiary
            ? previous.commissionAmountCents
            : null
          : input.commissionAmountCents,
      commissionWindowDays:
        input.commissionWindowDays === undefined
          ? sameBeneficiary
            ? previous.commissionWindowDays
            : null
          : input.commissionWindowDays,
    })
    if (previous.code !== validated.code)
      throw new CampaignValidationError(
        'O código de uma campanha existente não muda. Duplique para criar outra edição.',
      )
    if (requiresActiveCampaignAmbassador(validated, previous))
      await this.validateAmbassador(validated)
    if (validated.audience !== previous.audience) {
      if (previous.status !== 'draft') throw new CampaignAudienceLockedError()
      // Rascunho que já foi publicado pode ter resgates (o repo confere de novo sob o lock).
      const stats = await this.repo.stats(id)
      if (stats.redemptions + stats.pending + stats.failed > 0)
        throw new CampaignAudienceLockedError()
    }
    const updated = await this.repo.update(id, validated, actor, input.expectedUpdatedAt)
    return updated ? this.view(updated) : null
  }

  async detail(id: string, audience?: GiftAudience): Promise<CampaignDetailView | null> {
    const campaign = await this.repo.findById(id)
    if (!campaign || (audience && campaign.audience !== audience)) return null
    const code = await this.referrals.findCodeByCode(campaign.code)
    const [view, history, redemptions] = await Promise.all([
      this.view(campaign),
      this.repo.history(id),
      code ? this.referrals.listRedemptionsByCode(code.id, 200) : Promise.resolve([]),
    ])
    const conversions = await this.referrals.listConversionsByRedemptions(
      redemptions.map((r) => r.id),
    )
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
        ambassadorName: r.campaignReferral?.ambassadorName ?? null,
        conversion: (() => {
          const rows = conversions.filter(
            (c) => c.redemptionId === r.id && c.status !== 'superseded',
          )
          const conversion = rows.find((c) => c.status !== 'canceled') ?? rows[0]
          return conversion
            ? {
                paidAt: conversion.paidAt.toISOString(),
                status: conversion.status,
                bonusCents: conversion.bonusCents,
                amountCents: conversion.amountCents.toString(),
              }
            : null
        })(),
      })),
    }
  }

  private async validateAmbassador(input: CampaignInput) {
    if (!input.ambassadorId) return
    const ambassador = await this.referrals.findAmbassadorById(input.ambassadorId)
    if (ambassador?.status !== 'active')
      throw new CampaignValidationError('Escolha um embaixador ativo para a campanha.')
  }
}
