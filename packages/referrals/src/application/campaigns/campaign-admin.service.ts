import {
  type AmbassadorCampaignPage,
  CAMPAIGN_KINDS,
  CAMPAIGN_LINK_TARGETS,
  type CampaignCouponPolicy,
  type CampaignCouponView,
  type CampaignDetailView,
  type CampaignInput,
  type CampaignKind,
  type CampaignLinkTarget,
  type CampaignUpdateInput,
  type CampaignView,
  campaignScheduleWindows,
  type GiftAudience,
  isCampaignRedirectPath,
  isGiftAudience,
  type OriginResults,
} from '@sistemazero/core/referrals'
import {
  CampaignAudienceLockedError,
  CampaignGiftOfferLockedError,
  CampaignKindLockedError,
  type CampaignRecord,
  CampaignValidationError,
  campaignState,
  GiftCatalogUnavailableError,
} from '../../domain/campaign'
import { requiresActiveCampaignAmbassador } from '../../domain/campaign-referral'
import { isValidCode } from '../../domain/codes'
import { giftOfferProblem, scholarshipExpiresAt } from '../../domain/gift-policy'
import { referralLinkUrl } from '../../domain/links'
import type { CampaignCouponCatalog } from '../../domain/ports/campaign-coupon-catalog.port'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type { GiftOfferCatalog } from '../../domain/ports/gift-offer-catalog.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'
import type { AcquisitionReportsService } from '../acquisitions/acquisition-reports.service'

/** Entrada validada: o público sempre resolvido (ausente = `kids`). */
export type ValidatedCampaignInput = CampaignInput & {
  audience: GiftAudience
  giftOfferId: string | null
  kind: CampaignKind
  saleOfferId: string | null
  linkTarget: CampaignLinkTarget
  redirectPath: string | null
  redirectUntil: string | null
}

/** Endereço antigo redireciona por no máximo um ano (evita endereço preso para sempre). */
const MAX_REDIRECT_DAYS = 366

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function validateCampaignInput(input: CampaignInput): ValidatedCampaignInput {
  let windows: ReturnType<typeof campaignScheduleWindows> | null = null
  if (input.schedule) {
    try {
      windows = campaignScheduleWindows(input.schedule)
    } catch (error) {
      throw new CampaignValidationError(
        error instanceof Error ? error.message : 'Calendário inválido.',
      )
    }
  }
  if (input.audience !== undefined && !isGiftAudience(input.audience))
    throw new CampaignValidationError('Escolha o público do presente: Kids ou adulto.')
  const kind = input.kind ?? 'gift'
  if (!CAMPAIGN_KINDS.includes(kind))
    throw new CampaignValidationError('Escolha o tipo da campanha: presente ou venda.')
  const linkTarget = kind === 'sale' ? (input.linkTarget ?? 'page') : 'page'
  if (!CAMPAIGN_LINK_TARGETS.includes(linkTarget))
    throw new CampaignValidationError(
      'Escolha para onde o link leva: a página da oferta ou o pagamento.',
    )
  const redirectPath = input.redirectPath?.trim() ? input.redirectPath.trim() : null
  const redirectUntil = redirectPath ? (input.redirectUntil ?? null) : null
  const result: ValidatedCampaignInput = {
    kind,
    saleOfferId: kind === 'sale' ? (input.saleOfferId ?? null) : null,
    linkTarget,
    redirectPath,
    redirectUntil,
    name: input.name.trim(),
    publicTitle: input.publicTitle.trim(),
    description: input.description.trim(),
    code: input.code.trim().toLowerCase(),
    channel: input.channel.trim(),
    schedule: input.schedule ?? null,
    coupon: input.coupon ?? null,
    startsAt: windows?.startsAt ?? input.startsAt,
    endsAt: windows?.giftEndsAt ?? input.endsAt,
    status: input.status,
    context: input.context,
    audience: input.audience ?? 'kids',
    // Campanha de venda não dá presente (CHECK `campaigns_kind_offer_check`).
    giftOfferId: kind === 'sale' ? null : (input.giftOfferId ?? null),
    ambassadorId: input.ambassadorId ?? null,
    commissionEnabled: input.commissionEnabled ?? false,
    commissionAmountCents: input.commissionEnabled ? (input.commissionAmountCents ?? null) : null,
    commissionAnnualAmountCents: input.commissionEnabled
      ? (input.commissionAnnualAmountCents ?? null)
      : null,
    commissionWindowDays: input.commissionEnabled ? (input.commissionWindowDays ?? null) : null,
  }
  if (
    result.coupon &&
    (!result.schedule || !UUID.test(result.coupon.couponId) || !UUID.test(result.coupon.offerId))
  )
    throw new CampaignValidationError('Cupom vinculado exige calendário e oferta válidos.')
  if (result.ambassadorId !== null && !UUID.test(result.ambassadorId!))
    throw new CampaignValidationError('Escolha um embaixador válido.')
  if (result.giftOfferId !== null && !UUID.test(result.giftOfferId))
    throw new CampaignValidationError('Escolha uma oferta válida para o presente.')
  if (kind === 'sale' && (!result.saleOfferId || !UUID.test(result.saleOfferId)))
    throw new CampaignValidationError('Escolha a oferta que a campanha vende.')
  if (redirectPath !== null) {
    const until = redirectUntil ? new Date(redirectUntil) : null
    if (
      !isCampaignRedirectPath(redirectPath) ||
      !until ||
      !Number.isFinite(until.getTime()) ||
      !/(Z|[+-]\d\d:\d\d)$/.test(redirectUntil ?? '')
    )
      throw new CampaignValidationError(
        'Informe o endereço antigo (ex.: /kids/vilao-em-aliado) e até quando ele redireciona.',
      )
    result.redirectUntil = until.toISOString()
  }
  if (
    result.commissionEnabled &&
    (!result.ambassadorId ||
      !Number.isSafeInteger(result.commissionAmountCents) ||
      (result.commissionAmountCents ?? 0) < 1 ||
      (result.commissionAmountCents ?? 0) > 100_000_000 ||
      (result.commissionAnnualAmountCents != null &&
        (!Number.isSafeInteger(result.commissionAnnualAmountCents) ||
          result.commissionAnnualAmountCents < 1 ||
          result.commissionAnnualAmountCents > 100_000_000)) ||
      !Number.isSafeInteger(result.commissionWindowDays) ||
      (result.commissionWindowDays ?? 0) < 1 ||
      (result.commissionWindowDays ?? 0) > 3650)
  )
    throw new CampaignValidationError(
      'Para habilitar comissão, escolha o embaixador, o valor fixo em centavos e o prazo de 1 a 3650 dias após o cadastro.',
    )
  const start = new Date(result.startsAt)
  const end = new Date(result.endsAt)
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
    !/(Z|[+-]\d\d:\d\d)$/.test(result.startsAt) ||
    !/(Z|[+-]\d\d:\d\d)$/.test(result.endsAt)
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
    private readonly couponCatalog?: CampaignCouponCatalog,
    /** Confere a oferta do presente (resolve, pagamento único e mesmo público). */
    private readonly giftOffers?: GiftOfferCatalog,
    /** Resultados por origem (cadastros, compras, assinaturas e faturamento). */
    private readonly reports?: AcquisitionReportsService,
  ) {}

  async view(campaign: CampaignRecord, results?: OriginResults): Promise<CampaignView> {
    const ambassador = campaign.ambassadorId
      ? await this.referrals.findAmbassadorById(campaign.ambassadorId)
      : null
    return {
      ...campaign,
      couponView: await this.couponView(campaign),
      ambassadorName: ambassador?.name ?? null,
      state: campaignState(campaign, this.now()),
      startsAt: campaign.startsAt.toISOString(),
      endsAt: campaign.endsAt.toISOString(),
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      shareUrl: this.campaignLink(campaign),
      stats: await this.repo.stats(campaign.id),
      ...(results ? { results } : await this.resultsOf(campaign.id)),
    }
  }

  private async resultsOf(id: string): Promise<{ results?: OriginResults }> {
    if (!this.reports) return {}
    const results = (await this.reports.campaignResults([id])).get(id)
    return results ? { results } : {}
  }

  /** O link público da campanha (`/i/<code>`, ou `/i/<code>/pagamento` na venda direta). */
  campaignLink(campaign: Pick<CampaignRecord, 'code' | 'kind' | 'linkTarget'>): string {
    return referralLinkUrl(this.funnelUrl, campaign.code, {
      checkout: campaign.kind === 'sale' && campaign.linkTarget === 'checkout',
    })
  }

  async list(opts: { q?: string; audience?: GiftAudience; limit: number; offset: number }) {
    const result = await this.repo.list(opts)
    const results = this.reports
      ? await this.reports.campaignResults(
          result.items.map((c) => c.id),
          opts.audience,
        )
      : new Map<string, OriginResults>()
    return {
      items: await Promise.all(
        result.items.map((campaign) => this.view(campaign, results.get(campaign.id))),
      ),
      total: result.total,
    }
  }

  async forAmbassador(ambassadorId: string, offset = 0): Promise<AmbassadorCampaignPage> {
    const limit = 20
    const result = await this.repo.list({ ambassadorId, publishedOnly: true, limit, offset })
    return {
      total: result.total,
      limit,
      offset,
      items: (
        await Promise.all(
          result.items.map(async (campaign) => {
            const state = campaignState(campaign, this.now())
            if (state === 'draft' || campaign.ambassadorId !== ambassadorId) return []
            return [
              {
                id: campaign.id,
                couponView: await this.couponView(campaign),
                publicTitle: campaign.publicTitle,
                audience: campaign.audience,
                state,
                startsAt: campaign.startsAt.toISOString(),
                endsAt: campaign.endsAt.toISOString(),
                shareUrl: this.campaignLink(campaign),
                commissionEnabled: campaign.commissionEnabled ?? false,
                commissionAmountCents: campaign.commissionEnabled
                  ? (campaign.commissionAmountCents ?? null)
                  : null,
                commissionAnnualAmountCents: campaign.commissionEnabled
                  ? (campaign.commissionAnnualAmountCents ?? null)
                  : null,
                commissionWindowDays: campaign.commissionEnabled
                  ? (campaign.commissionWindowDays ?? null)
                  : null,
              },
            ]
          }),
        )
      ).flat(),
    }
  }

  async create(
    input: CampaignInput,
    actor: string,
    duplicatedFrom?: string,
  ): Promise<CampaignView | null> {
    let validated = validateCampaignInput(input)
    if (validated.coupon)
      throw new CampaignValidationError('Salve a campanha antes de vincular seu cupom.')
    await this.validateAmbassador(validated)
    if (duplicatedFrom) {
      const previous = await this.repo.findById(duplicatedFrom)
      if (!previous) throw new CampaignValidationError('A campanha original não foi encontrada.')
      if (previous.code === validated.code)
        throw new CampaignValidationError('Uma nova edição precisa de outro código.')
      // A duplicata herda o público, o tipo e a oferta da original quando o corpo não escolhe
      // outros. O endereço antigo NÃO é herdado (ele é de uma campanha só).
      if (input.audience === undefined) validated = { ...validated, audience: previous.audience }
      if (input.kind === undefined)
        validated = {
          ...validated,
          kind: previous.kind,
          linkTarget: input.linkTarget ?? previous.linkTarget,
          saleOfferId:
            previous.kind === 'sale' ? (input.saleOfferId ?? previous.saleOfferId) : null,
        }
      if (input.giftOfferId === undefined && validated.kind === 'gift')
        validated = { ...validated, giftOfferId: previous.giftOfferId ?? null }
    }
    this.validateRedirectWindow(validated)
    if (validated.kind === 'sale') {
      if (!validated.saleOfferId)
        throw new CampaignValidationError('Escolha a oferta que a campanha vende.')
      await this.validateSaleOffer(validated.saleOfferId, validated.audience)
    } else {
      // Campanha de presente nova sempre escolhe a oferta (as antigas sem oferta só são lidas).
      if (!validated.giftOfferId)
        throw new CampaignValidationError(
          'Escolha a oferta do catálogo que a campanha dá de presente.',
        )
      await this.validateGiftOffer(validated.giftOfferId, validated.audience)
    }
    const created = await this.repo.create(validated, actor, duplicatedFrom)
    return created ? this.view(created) : null
  }

  /** O endereço antigo redireciona até uma data futura, por no máximo um ano. */
  private validateRedirectWindow(input: ValidatedCampaignInput, previous?: CampaignRecord) {
    if (!input.redirectPath || !input.redirectUntil) return
    const until = new Date(input.redirectUntil).getTime()
    const unchanged =
      previous?.redirectPath === input.redirectPath &&
      previous.redirectUntil?.toISOString() === input.redirectUntil
    const now = this.now().getTime()
    if (!unchanged && until <= now)
      throw new CampaignValidationError('A data do redirecionamento precisa estar no futuro.')
    if (until > now + MAX_REDIRECT_DAYS * 86_400_000)
      throw new CampaignValidationError('O endereço antigo redireciona por no máximo um ano.')
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
      schedule: input.schedule === undefined ? previous.schedule : input.schedule,
      coupon: input.coupon === undefined ? previous.coupon : input.coupon,
      audience: input.audience ?? previous.audience,
      // Omitidos conservam o gravado (clientes anteriores a 25/11/2026 não mandam estes campos).
      kind: input.kind ?? previous.kind,
      saleOfferId: input.saleOfferId === undefined ? previous.saleOfferId : input.saleOfferId,
      linkTarget: input.linkTarget ?? previous.linkTarget,
      redirectPath: input.redirectPath === undefined ? previous.redirectPath : input.redirectPath,
      redirectUntil:
        input.redirectUntil === undefined
          ? (previous.redirectUntil?.toISOString() ?? null)
          : input.redirectUntil,
      // Omitida conserva a oferta gravada.
      giftOfferId: input.giftOfferId === undefined ? previous.giftOfferId : input.giftOfferId,
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
      commissionAnnualAmountCents:
        input.commissionAnnualAmountCents === undefined
          ? sameBeneficiary
            ? previous.commissionAnnualAmountCents
            : null
          : input.commissionAnnualAmountCents,
    })
    if (
      validated.coupon &&
      (validated.coupon.couponId !== previous.coupon?.couponId ||
        validated.coupon.offerId !== previous.coupon?.offerId ||
        validated.audience !== previous.audience)
    ) {
      const coupon = await this.couponCatalog?.get(validated.coupon, id, validated.audience)
      if (!coupon)
        throw new CampaignValidationError(
          'Cupom e oferta precisam pertencer à campanha e ao mesmo público.',
        )
    }
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
    this.validateRedirectWindow(validated, previous)
    if (validated.kind !== previous.kind) {
      // Mesma régua do público: só em rascunho sem cadastros (o repo confere sob o lock).
      if (previous.status !== 'draft') throw new CampaignKindLockedError()
      const stats = await this.repo.stats(id)
      if (
        stats.redemptions + stats.pending + stats.failed > 0 ||
        (await this.repo.hasAcquisitions(id))
      )
        throw new CampaignKindLockedError()
    }
    if (validated.kind === 'sale') {
      if (!validated.saleOfferId)
        throw new CampaignValidationError('Escolha a oferta que a campanha vende.')
      if (validated.saleOfferId !== previous.saleOfferId) {
        if (previous.saleOfferId && previous.status !== 'draft')
          throw new CampaignGiftOfferLockedError()
        if (previous.saleOfferId && (await this.repo.hasAcquisitions(id)))
          throw new CampaignGiftOfferLockedError()
      }
      if (
        validated.saleOfferId !== previous.saleOfferId ||
        validated.audience !== previous.audience
      )
        await this.validateSaleOffer(validated.saleOfferId, validated.audience)
      const updated = await this.repo.update(id, validated, actor, input.expectedUpdatedAt)
      return updated ? this.view(updated) : null
    }
    const previousOffer = previous.kind === 'gift' ? (previous.giftOfferId ?? null) : null
    if ((previousOffer || previous.kind === 'sale') && !validated.giftOfferId)
      throw new CampaignValidationError(
        'Escolha a oferta do catálogo que a campanha dá de presente.',
      )
    if (previousOffer && validated.giftOfferId !== previousOffer) {
      // Mesma régua do público: só em rascunho sem cadastros (o repo confere sob o lock).
      if (previous.status !== 'draft') throw new CampaignGiftOfferLockedError()
      const stats = await this.repo.stats(id)
      if (stats.redemptions + stats.pending + stats.failed > 0)
        throw new CampaignGiftOfferLockedError()
    }
    if (
      validated.giftOfferId &&
      (validated.giftOfferId !== previousOffer || validated.audience !== previous.audience)
    )
      await this.validateGiftOffer(validated.giftOfferId, validated.audience)
    const updated = await this.repo.update(id, validated, actor, input.expectedUpdatedAt)
    return updated ? this.view(updated) : null
  }

  async couponPolicy(id: string): Promise<CampaignCouponPolicy | null> {
    const campaign = await this.repo.findById(id)
    if (!campaign?.coupon || !campaign.schedule) return null
    const windows = campaignScheduleWindows(campaign.schedule)
    return {
      ...campaign.coupon,
      audience: campaign.audience,
      status: campaign.status,
      startsAt: windows.startsAt,
      endsAt: windows.couponEndsAt,
    }
  }

  private async couponView(campaign: CampaignRecord): Promise<CampaignCouponView | null> {
    if (!campaign.coupon || !campaign.schedule || !this.couponCatalog) return null
    // Uma indisponibilidade do Catálogo não deve esconder o presente nem inventar termos.
    const details = await this.couponCatalog
      .get(campaign.coupon, campaign.id, campaign.audience)
      .catch(() => null)
    if (!details) return null
    const windows = campaignScheduleWindows(campaign.schedule)
    const state = campaignState(
      {
        status: campaign.status,
        startsAt: new Date(windows.startsAt),
        endsAt: new Date(windows.couponEndsAt),
      },
      this.now(),
    )
    const url = new URL(`/cupom/${encodeURIComponent(details.code)}`, this.funnelUrl)
    url.searchParams.set('oferta', details.offerSlug)
    url.searchParams.set('publico', campaign.audience)
    url.searchParams.set('event_code', campaign.code)
    return {
      ...details,
      state: !details.available || state === 'draft' ? 'unavailable' : state,
      startsAt: windows.startsAt,
      endsAt: windows.couponEndsAt,
      shareUrl: url.toString(),
    }
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

  /**
   * A oferta do presente precisa existir no catálogo e servir de presente (`giftOfferProblem`:
   * pagamento único, sem prazo ou com prazo em dias, não arquivada, do público da campanha).
   */
  private async validateGiftOffer(offerId: string, audience: GiftAudience) {
    if (!this.giftOffers) throw new GiftCatalogUnavailableError()
    let offer: Awaited<ReturnType<GiftOfferCatalog['resolve']>>
    try {
      offer = await this.giftOffers.resolve(offerId)
    } catch {
      throw new GiftCatalogUnavailableError()
    }
    if (!offer)
      throw new CampaignValidationError('A oferta do presente não foi encontrada no Catálogo.')
    const problem = giftOfferProblem(offer, audience)
    if (problem) throw new CampaignValidationError(problem)
  }

  /**
   * A oferta à venda precisa existir, não estar arquivada e ser do público da campanha. Ter
   * página de venda é conferido no Admin (o funil sabe a página; o referrals não).
   */
  private async validateSaleOffer(offerId: string, audience: GiftAudience) {
    if (!this.giftOffers) throw new GiftCatalogUnavailableError()
    let offer: Awaited<ReturnType<GiftOfferCatalog['resolve']>>
    try {
      offer = await this.giftOffers.resolve(offerId)
    } catch {
      throw new GiftCatalogUnavailableError()
    }
    if (!offer)
      throw new CampaignValidationError('A oferta à venda não foi encontrada no Catálogo.')
    if (offer.status === 'archived')
      throw new CampaignValidationError('A oferta à venda está arquivada no Catálogo.')
    if (offer.audience !== audience)
      throw new CampaignValidationError(
        audience === 'adult'
          ? 'Escolha uma oferta do público adulto, o mesmo da campanha.'
          : 'Escolha uma oferta do público Kids, o mesmo da campanha.',
      )
    // A página de venda só abre a principal do produto ou oferta marcada para a página: a de
    // presente nunca é vendida, e o link da campanha cairia numa página que não vende a oferta.
    if (offer.pageSellable) return
    if (!this.giftOffers.primaryOfferSlugOf || !offer.productSku) return
    let primary: string | null
    try {
      primary = await this.giftOffers.primaryOfferSlugOf(offer.productSku)
    } catch {
      throw new GiftCatalogUnavailableError()
    }
    if (primary !== offer.offerSlug)
      throw new CampaignValidationError(
        'A oferta à venda precisa ser a principal do produto ou estar marcada, no Catálogo, como "Pode ser vendida na página do produto".',
      )
  }

  private async validateAmbassador(input: CampaignInput) {
    if (!input.ambassadorId) return
    const ambassador = await this.referrals.findAmbassadorById(input.ambassadorId)
    if (ambassador?.status !== 'active')
      throw new CampaignValidationError('Escolha um embaixador ativo para a campanha.')
  }
}
