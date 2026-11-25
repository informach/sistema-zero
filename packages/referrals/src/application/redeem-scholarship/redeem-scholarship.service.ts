import { randomBytes } from 'node:crypto'
import type { Logger } from '@sistemazero/core/logging'
import { serializeError } from '@sistemazero/core/logging'
import {
  type GiftAttribution,
  type GiftAudience,
  type GiftMuralAccess,
  type GiftSource,
  giftDurationLabel,
  publicGiftSourceName,
  type ReferralBonusAmounts,
  type ReferralGiftOfferView,
  sanitizeGiftAttribution,
} from '@sistemazero/core/referrals'
import { giftAcquisition } from '../../domain/acquisition'
import {
  type CampaignRecord,
  CampaignUnavailableError,
  campaignSource,
  campaignState,
  GiftOfferChangedError,
} from '../../domain/campaign'
import { isValidCode, normalizeCode, normalizeEmail } from '../../domain/codes'
import {
  DEFAULT_GIFT_OFFER_SLUGS,
  giftAccessDays,
  giftAdvertisedDays,
  giftGuidanceText,
  giftMuralText,
  giftOfferProblem,
  giftOfferRef,
  giftWelcomeLink,
  isMuralTrialGranted,
  scholarshipExpiresAt,
} from '../../domain/gift-policy'
import { normalizePhone, splitName } from '../../domain/names'
import type { AcquisitionRepository } from '../../domain/ports/acquisition-repository.port'
import type { CampaignRepository } from '../../domain/ports/campaign-repository.port'
import type {
  GatewayResult,
  ReferralsGateway,
  SendEmailInput,
} from '../../domain/ports/gateway.port'
import type { GiftOffer, GiftOfferCatalog } from '../../domain/ports/gift-offer-catalog.port'
import type {
  RedemptionRecord,
  ReferralRepository,
} from '../../domain/ports/referral-repository.port'
import { giftSlotOf, MAIN_GIFT_SLOT } from '../../domain/ports/referral-repository.port'

export interface RedeemInput {
  code: string
  name: string
  email: string
  phone?: string
  attribution?: GiftAttribution | null
  /**
   * O presente que o embaixador escolheu na lista do público (slug ou id, 25/11/2026). Vale só
   * para código de embaixador e só se a oferta está ligada na lista; campanha usa a dela.
   */
  offer?: string | null
}

export type RedeemResult =
  | {
      kind: 'completed'
      expiresAt: string | null
      emailStatus: 'accepted' | 'failed' | 'unknown'
      muralAccess: GiftMuralAccess
    }
  | { kind: 'processing' }
  | { kind: 'code_not_found' }
  | { kind: 'already_redeemed'; expiresAt?: string | null }
  | { kind: 'gift_unavailable' }
  | { kind: 'campaign_unavailable'; state: string }
  | { kind: 'failed'; reason: string }
  | { kind: 'upstream_error' }

/**
 * Chave que nasceu com o acesso infantil por aparelho (10/10/2026) → a que existia antes. Se o
 * Referrals subir antes de o Messaging semear a nova, a família recebe a antiga em vez de ficar sem
 * aviso. Contrato conferido em `tests/unit/message-templates-contract.test.ts` contra o seed.
 */
export const LEGACY_TEMPLATE_KEYS: Readonly<Record<string, string>> = {
  'kids-new-access': 'new-access',
}

export interface RedeemOptions {
  /** Base do app kids p/ o link de senha/área dos pais. */
  kidsCommunityUrl: string
  /**
   * Base do app adulto (env `COMMUNITY_URL`). Ausente = presente adulto INDISPONÍVEL
   * (503 GIFT_UNAVAILABLE, `giftAvailable:false`); o Kids segue funcionando.
   */
  communityUrl?: string | null
  /**
   * Catálogo: a oferta que o presente concede (15/11/2026). Curso, prazo e Mural vêm dela; os
   * códigos sem campanha (e as campanhas antigas sem oferta) usam `DEFAULT_GIFT_OFFER_SLUGS`.
   */
  giftOffers: GiftOfferCatalog
  leaseMs: number
  campaigns?: CampaignRepository
  bonusAmounts?: ReferralBonusAmounts
  /**
   * Aquisições com origem (25/11/2026): o presente concluído vira aquisição `gift` com o acordo
   * do bônus capturado. Best-effort: uma falha aqui não desfaz o presente; o sweep repara.
   */
  acquisitions?: AcquisitionRepository
  /** Valor único legado e prazo do link pessoal (para o acordo capturado). */
  legacyBonusCents?: number
  bonusWindowDays?: number
  /** As listas do Admin: o presente que o embaixador pode escolher (sem ela, só o padrão). */
  ambassadorOffers?: {
    allowed(
      audience: GiftAudience,
      kind: 'gift',
      offerRef: string,
    ): Promise<{ offerId: string } | null>
  }
}

/** O curso principal do presente, como o members o publica. */
export interface GiftCourse {
  slug: string
  title: string | null
  learner: 'child' | 'parents' | null
}

/** O presente resolvido: a oferta e o curso principal (null = a oferta não tem curso). */
export interface GiftPlan {
  offer: GiftOffer
  course: GiftCourse | null
}

type Availability<T> =
  | { kind: 'ok'; value: T }
  | { kind: 'unavailable' }
  | { kind: 'upstream_error' }

/**
 * O que os passos e o e-mail sabem do presente desta execução. `offer` só é a do resgate
 * `offer`; nos resgates antigos fica nula e o curso é o gravado.
 */
interface GiftContext {
  offer: GiftOffer | null
  course: GiftCourse | null
}

/** Curso sem título conhecido (members fora do ar na retomada do e-mail). */
const UNKNOWN_COURSE_TITLE = 'do presente'

/** E-mails de boas-vindas do presente adulto (sempre com o Mural adulto por sete dias). */
const ADULT_WELCOME_TEMPLATES = {
  scholarship: {
    created: 'referrals-scholarship-welcome-adult',
    existing: 'referrals-scholarship-existing-adult',
  },
  campaign: {
    created: 'referrals-campaign-welcome-adult',
    existing: 'referrals-campaign-existing-adult',
  },
} as const

/**
 * Resgate do presente — disponibilidade → CONTA → GRANT → E-MAIL:
 * se o e-mail falhar, o acesso já existe; se o grant falhar, nenhum e-mail
 * mentiroso saiu. Retomável por etapas (colunas user_id/granted_at/
 * welcome_sent_at): falha transitória devolve 502, curso indisponível devolve 503,
 * e a PRÓXIMA submissão do
 * mesmo e-mail continua de onde parou. Anti-execução dupla = lease em coluna
 * (`processing_until`) — crash no meio expira sozinho.
 *
 * Desde 15/11/2026 o presente é uma OFERTA do catálogo: o resgate novo grava a oferta
 * (`muralVisitorPolicy: 'offer'`) e o members concede tudo o que ela inclui, com o prazo
 * dela. Resgates antigos em andamento (`trial`/`visitor`/históricos) seguem o caminho antigo
 * (curso + Mural em separado, com o curso gravado no resgate).
 */
export class RedeemScholarshipService {
  constructor(
    private readonly repo: ReferralRepository,
    private readonly gateway: ReferralsGateway,
    private readonly opts: RedeemOptions,
    private readonly logger: Logger,
    private readonly now: () => Date = () => new Date(),
    /** Senha descartável do ensure-buyer (a real vem pelo link de definir senha). */
    private readonly genPassword: () => string = () => randomBytes(32).toString('base64url'),
  ) {}

  /** App do público; null = não configurado (presente daquele público indisponível). */
  private appUrl(audience: GiftAudience): string | null {
    return audience === 'adult' ? (this.opts.communityUrl ?? null) : this.opts.kidsCommunityUrl
  }

  /**
   * O curso está publicado para o público? Também confere o app do público. Sem curso
   * (oferta só com o Mural, por exemplo) basta o app. Traz título e público do curso.
   */
  private async checkCourse(
    audience: GiftAudience,
    courseSlug: string | null,
  ): Promise<Availability<GiftCourse | null>> {
    if (!this.appUrl(audience)) {
      // Fail-closed: sem o app do público não há para onde mandar a pessoa.
      this.logger.warn('referrals.gift_audience_unconfigured', { audience })
      return { kind: 'unavailable' }
    }
    if (!courseSlug) return { kind: 'ok', value: null }
    // Kids sem query: a consulta continua idêntica à de antes do presente adulto.
    const res =
      audience === 'adult'
        ? await this.gateway.getGiftAvailability(courseSlug, 'adult')
        : await this.gateway.getGiftAvailability(courseSlug)
    if (res.status !== 200) {
      this.logger.warn('referrals.gift_availability_failed', { status: res.status })
      return { kind: 'upstream_error' }
    }
    const available = readBoolean(res.body, 'available')
    if (available === null) {
      this.logger.error('referrals.gift_availability_invalid_response', { status: res.status })
      return { kind: 'upstream_error' }
    }
    if (!available) return { kind: 'unavailable' }
    const learner = readString(res.body, 'learner')
    return {
      kind: 'ok',
      value: {
        slug: courseSlug,
        title: readString(res.body, 'title'),
        learner: learner === 'child' || learner === 'parents' ? learner : null,
      },
    }
  }

  /** Compatível com as chamadas antigas: só a disponibilidade do curso no público. */
  async giftAvailability(
    audience: GiftAudience = 'kids',
    courseSlug: string | null = null,
  ): Promise<'available' | 'unavailable' | 'upstream_error'> {
    const result = await this.checkCourse(audience, courseSlug)
    return result.kind === 'ok' ? 'available' : result.kind
  }

  /**
   * Resolve o presente de uma oferta: existe no catálogo, serve como presente (pagamento único,
   * mesmo público) e o curso principal está publicado. Oferta inexistente ou inválida é
   * configuração errada: indisponível (log de erro), nunca um presente pela metade.
   */
  async planGift(audience: GiftAudience, offerRef: string): Promise<Availability<GiftPlan>> {
    if (!this.appUrl(audience)) {
      this.logger.warn('referrals.gift_audience_unconfigured', { audience })
      return { kind: 'unavailable' }
    }
    let offer: GiftOffer | null
    try {
      offer = await this.opts.giftOffers.resolve(offerRef)
    } catch (error) {
      this.logger.warn('referrals.gift_offer_lookup_failed', {
        offerRef,
        error: error instanceof Error ? error.message : String(error),
      })
      return { kind: 'upstream_error' }
    }
    if (!offer) {
      this.logger.error('referrals.gift_offer_not_found', { offerRef, audience })
      return { kind: 'unavailable' }
    }
    const problem = giftOfferProblem(offer, audience)
    if (problem) {
      this.logger.error('referrals.gift_offer_invalid', { offerRef, audience, problem })
      return { kind: 'unavailable' }
    }
    const course = await this.checkCourse(audience, offer.courseSlug)
    if (course.kind !== 'ok') return course
    return { kind: 'ok', value: { offer, course: course.value } }
  }

  /**
   * Leitura pública do presente de um código (`GET internal/codes/:code`): disponibilidade e o
   * que a oferta entrega. `gift` só quando a oferta resolve e o presente está disponível.
   */
  async publicGift(
    campaign: Pick<CampaignRecord, 'giftOfferId' | 'kind'> | null,
    audience: GiftAudience,
    requested?: string | null,
  ): Promise<{
    availability: 'available' | 'unavailable' | 'upstream_error'
    gift?: ReferralGiftOfferView
  }> {
    const ref = await this.giftRefFor(campaign, audience, requested)
    if (!ref) return { availability: 'unavailable' }
    const result = await this.planGift(audience, ref)
    if (result.kind !== 'ok') return { availability: result.kind }
    const { offer, course } = result.value
    return {
      availability: 'available',
      gift: {
        offerId: offer.offerId,
        offerSlug: offer.offerSlug,
        offerTitle: offer.name,
        courseSlug: offer.courseSlug,
        courseTitle: course?.title ?? null,
        learner: course?.learner ?? null,
        accessDays: giftAdvertisedDays(offer),
        includesMural: offer.includesMural,
      },
    }
  }

  /**
   * A oferta que o código dá de presente: a da campanha (campanha de VENDA não dá presente:
   * `null`), a escolhida pelo embaixador quando está ligada na lista do público, ou a padrão.
   * Escolha fora da lista também é `null` (o link não existe).
   */
  async giftRefFor(
    campaign: Pick<CampaignRecord, 'giftOfferId' | 'kind'> | null,
    audience: GiftAudience,
    requested?: string | null,
  ): Promise<string | null> {
    if (campaign) return campaign.kind === 'sale' ? null : giftOfferRef(campaign, audience)
    const wanted = requested?.trim()
    if (wanted && this.opts.ambassadorOffers) {
      const option = await this.opts.ambassadorOffers.allowed(audience, 'gift', wanted)
      return option?.offerId ?? null
    }
    return giftOfferRef(null, audience)
  }

  /** Consulta a mesma vaga da execução, sem claim, concessão ou envio de email. */
  private async findExistingGift(
    email: string,
    audience: GiftAudience,
    userId: string | undefined,
    ownerKind: string,
    campaign: Pick<CampaignRecord, 'giftOfferId' | 'kind'> | null,
    fresh: Availability<GiftPlan>,
  ) {
    const fromEmail = await this.repo.listRedemptionsByEmail(email, audience)
    const fromAccount = userId ? await this.repo.listRedemptionsByAccount(userId, audience) : []
    const sameAudience = [...new Map([...fromEmail, ...fromAccount].map((r) => [r.id, r])).values()]
    const slotOf = (r: { giftSlot?: string }) => r.giftSlot ?? MAIN_GIFT_SLOT
    let giftSlot: string
    let existing: (typeof sameAudience)[number] | null
    if (fresh.kind === 'ok') {
      giftSlot =
        ownerKind !== 'campaign' && fresh.value.course?.learner !== 'parents'
          ? MAIN_GIFT_SLOT
          : giftSlotOf(fresh.value.course, fresh.value.offer.offerId)
      existing = sameAudience.find((r) => slotOf(r) === giftSlot) ?? null
      // Reconhece presentes antigos de outro curso gravados antes das vagas por curso.
      if (!giftSlot.startsWith('parents:'))
        existing ??=
          sameAudience.find(
            (r) =>
              slotOf(r) === MAIN_GIFT_SLOT &&
              (fresh.value.course
                ? r.courseSlug === fresh.value.course.slug
                : r.giftOfferId === fresh.value.offer.offerId),
          ) ?? null
      if (existing) giftSlot = slotOf(existing)
    } else {
      // Oferta fora do ar ou indisponível: a vaga sai do que já foi gravado. O resgate deste
      // mesmo presente (a oferta da campanha) continua reconhecível, como o 409 do concluído;
      // sem oferta própria (código de pessoa ou campanha antiga) o presente é o do público.
      const campaignOfferId = campaign?.giftOfferId ?? null
      existing = campaignOfferId
        ? (sameAudience.find((r) => r.giftOfferId === campaignOfferId) ?? null)
        : (sameAudience.find((r) => slotOf(r) === MAIN_GIFT_SLOT) ?? null)
      giftSlot = existing ? slotOf(existing) : MAIN_GIFT_SLOT
    }
    return { giftSlot, existing }
  }

  async inspectAccountGift(
    campaign: Pick<CampaignRecord, 'giftOfferId' | 'kind'> | null,
    audience: GiftAudience,
    ownerKind: string,
    account: { userId: string; email: string },
    requested?: string | null,
  ) {
    const ref = await this.giftRefFor(campaign, audience, requested)
    if (!ref) return null
    const fresh = await this.planGift(audience, ref)
    const { existing } = await this.findExistingGift(
      normalizeEmail(account.email),
      audience,
      account.userId,
      ownerKind,
      campaign,
      fresh,
    )
    if (!existing || (existing.userId && existing.userId !== account.userId)) return null
    const expiresAt = this.expiresAtOf(existing)
    const context = await this.describeGift(existing)
    return {
      redemption: {
        status: existing.status,
        // A data mostrada é a do prazo divulgado; a retomada segue o prazo real.
        expiresAt: this.shownExpiresAtOf(existing, context.offer)?.toISOString() ?? null,
        canResume: existing.status !== 'completed' && !this.windowElapsed(expiresAt),
      },
      gift: {
        offerId: existing.giftOfferId ?? context.offer?.offerId ?? '',
        offerTitle: context.offer?.name ?? context.course?.title ?? 'Seu presente',
        courseSlug: existing.courseSlug ?? context.course?.slug ?? '',
        courseTitle: context.course?.title ?? null,
        learner: context.course?.learner ?? null,
        accessDays: this.shownDaysOf(existing, context.offer),
        includesMural: context.offer?.includesMural ?? false,
      } satisfies ReferralGiftOfferView,
    }
  }

  async execute(
    input: RedeemInput,
    account?: { userId: string; audience: GiftAudience },
  ): Promise<RedeemResult> {
    const code = normalizeCode(input.code)
    if (!isValidCode(code)) return { kind: 'code_not_found' }
    const codeRecord = await this.repo.findCodeByCode(code)
    // 404 uniforme (inexistente OU desativado) — não vazar qual dos dois.
    if (codeRecord?.status !== 'active') return { kind: 'code_not_found' }

    const email = normalizeEmail(input.email)
    const name = input.name.trim().slice(0, 120)
    const phone = normalizePhone(input.phone)

    // O público vem do código: campanha → público da campanha; embaixador → o do código.
    const campaign =
      codeRecord.ownerKind === 'campaign' && codeRecord.campaignId
        ? ((await this.opts.campaigns?.findById(codeRecord.campaignId)) ?? null)
        : null
    const audience = campaign?.audience ?? codeRecord.audience
    if (account && account.audience !== audience) return { kind: 'code_not_found' }

    // Resgate novo só começa quando a oferta resolve e o curso está publicado. O 409 de um
    // resgate concluído continua reconhecível mesmo se o curso sair do catálogo depois.
    // "Já resgatado" é por público: o mesmo e-mail pode ter um presente Kids e um adulto.
    // E por VAGA (18/11/2026): curso para pais não ocupa a vaga do presente do público, então a
    // oferta deste código é resolvida primeiro para saber em que vaga procurar o resgate.
    if (codeRecord.ownerKind === 'campaign' && !campaign) return { kind: 'code_not_found' }
    const ref = await this.giftRefFor(campaign, audience, input.offer)
    // Campanha de venda, ou escolha fora da lista do público: o link de presente não existe.
    if (!ref) return { kind: 'code_not_found' }
    const fresh = await this.planGift(audience, ref)
    const { giftSlot, existing } = await this.findExistingGift(
      email,
      audience,
      account?.userId,
      codeRecord.ownerKind,
      campaign,
      fresh,
    )
    let source: GiftSource = { kind: codeRecord.ownerKind, name: codeRecord.displayName }
    if (!existing && codeRecord.ownerKind === 'campaign') {
      if (!campaign) return { kind: 'code_not_found' }
      const state = campaignState(campaign, this.now())
      if (state === 'draft') return { kind: 'code_not_found' }
      if (state !== 'active') return { kind: 'campaign_unavailable', state }
      source = campaignSource(campaign)
    }
    let context: GiftContext = { offer: null, course: null }
    let plan: GiftPlan | null = null
    if (existing?.status !== 'completed') {
      if (!existing || existing.giftOfferId) {
        // Resgate novo (oferta da campanha ou a padrão do público) ou retomada de um resgate
        // por oferta (a oferta GRAVADA nele, mesmo que a campanha mude depois).
        // Resgate novo: o plano resolvido acima. Retomada: a oferta gravada no resgate.
        const result = existing?.giftOfferId
          ? await this.planGift(audience, existing.giftOfferId)
          : fresh
        if (result.kind === 'unavailable') return { kind: 'gift_unavailable' }
        if (result.kind === 'upstream_error') return { kind: 'upstream_error' }
        plan = result.value
        context = { offer: plan.offer, course: plan.course }
      } else {
        // Retomada de resgate antigo: o curso gravado nele (ou o da oferta padrão, para as
        // linhas anteriores à coluna do curso).
        const courseSlug = existing.courseSlug ?? (await this.defaultCourseSlug(audience))
        if (!courseSlug) return { kind: 'upstream_error' }
        const result = await this.checkCourse(audience, courseSlug)
        if (result.kind === 'unavailable') return { kind: 'gift_unavailable' }
        if (result.kind === 'upstream_error') return { kind: 'upstream_error' }
        context = {
          offer: null,
          course: result.value ?? { slug: courseSlug, title: null, learner: null },
        }
      }
    }

    // Claim da bolsa: 1 por e-mail e público. Conflito devolve a linha existente —
    // completed = 409; pending/failed = RETOMADA (o 1º claim vence o code_id).
    let claim: Awaited<ReturnType<ReferralRepository['insertRedemption']>>
    try {
      claim = await this.repo.insertRedemption({
        codeId: codeRecord.id,
        email: existing?.email ?? email,
        audience,
        name,
        phone,
        sourceSnapshot: source,
        bonusAmounts: codeRecord.ownerKind === 'campaign' ? undefined : this.opts.bonusAmounts,
        // Curso principal da oferta, para leitura e e-mail (quem concede é a oferta).
        courseSlug: plan?.offer.courseSlug ?? undefined,
        attribution: sanitizeGiftAttribution(input.attribution),
        giftSlot,
        ...(plan
          ? {
              gift: {
                offerId: plan.offer.offerId,
                accessDurationDays: giftAccessDays(plan.offer),
              },
            }
          : {}),
      })
    } catch (error) {
      if (error instanceof CampaignUnavailableError)
        return error.state === 'draft'
          ? { kind: 'code_not_found' }
          : { kind: 'campaign_unavailable', state: error.state }
      if (error instanceof GiftOfferChangedError) {
        this.logger.warn('referrals.gift_offer_changed', { codeId: codeRecord.id })
        return { kind: 'upstream_error' }
      }
      throw error
    }
    const { created, redemption } = claim
    if (account && redemption.userId && redemption.userId !== account.userId)
      return { kind: 'failed', reason: 'account_mismatch' }
    // A retomada usa a origem original, inclusive nos resgates históricos.
    const originalCode = redemption.sourceSnapshot
      ? null
      : await this.repo.findCodeById(redemption.codeId)
    const originalSource =
      redemption.sourceSnapshot ??
      (originalCode ? { kind: originalCode.ownerKind, name: originalCode.displayName } : source)
    if (!created && redemption.status === 'completed') {
      // Grant já concluiu mas o welcome pode ter ficado pelo caminho (crash entre o
      // completed e o e-mail): retoma SÓ o e-mail. O claim atômico do welcome já é o mutex
      // desta etapa — dispensa o lease (que exclui completed).
      if (!redemption.welcomeSentAt) {
        await this.sendWelcome(
          redemption,
          redemption.buyerCreated === true,
          originalSource,
          await this.describeGift(redemption),
        )
      }
      return {
        kind: 'already_redeemed',
        expiresAt:
          this.shownExpiresAtOf(
            redemption,
            (await this.describeGift(redemption)).offer,
          )?.toISOString() ?? null,
      }
    }

    const leaseUntil = new Date(this.now().getTime() + this.opts.leaseMs)
    const leased = await this.repo.acquireRedemptionLease(redemption.id, leaseUntil, this.now())
    if (!leased) return { kind: 'processing' }

    try {
      return await this.runSteps(leased, originalSource, context, account)
    } catch (error) {
      this.logger.error('referrals.redeem_failed', {
        redemptionId: redemption.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return { kind: 'upstream_error' }
    } finally {
      await this.repo.releaseRedemptionLease(redemption.id).catch(() => {})
    }
  }

  /** Curso principal da oferta padrão do público (retomada de linha antiga sem curso gravado). */
  private async defaultCourseSlug(audience: GiftAudience): Promise<string | null> {
    try {
      return (
        (await this.opts.giftOffers.resolve(DEFAULT_GIFT_OFFER_SLUGS[audience]))?.courseSlug ?? null
      )
    } catch {
      return null
    }
  }

  /** Contexto de melhor esforço para retomar só o e-mail de um resgate concluído. */
  private async describeGift(redemption: RedemptionRecord): Promise<GiftContext> {
    let offer: GiftOffer | null = null
    if (redemption.giftOfferId) {
      offer = await this.opts.giftOffers.resolve(redemption.giftOfferId).catch(() => null)
    }
    const slug = redemption.courseSlug ?? offer?.courseSlug ?? null
    const course = slug ? await this.checkCourse(redemption.audience, slug) : null
    return {
      offer,
      course:
        course?.kind === 'ok' && course.value
          ? course.value
          : slug
            ? { slug, title: null, learner: null }
            : null,
    }
  }

  /** A oferta do contexto, se for a gravada no resgate `offer`. */
  private offerOf(redemption: RedemptionRecord, context: GiftContext): GiftOffer | null {
    return redemption.muralVisitorPolicy === 'offer' &&
      context.offer &&
      context.offer.offerId === redemption.giftOfferId
      ? context.offer
      : null
  }

  /**
   * Fim do presente: os dias gravados no resgate contados do cadastro (o prazo da oferta é
   * sempre em dias); sem prazo, null.
   */
  private expiresAtOf(redemption: RedemptionRecord): Date | null {
    return scholarshipExpiresAt(redemption.createdAt, redemption.accessDurationDays)
  }

  /**
   * Os dias que as pessoas VEEM (25/11/2026): o prazo divulgado da oferta, quando há um e é menor
   * que os dias gravados no resgate; senão, os gravados. O acesso e a retomada seguem os gravados.
   */
  private shownDaysOf(redemption: RedemptionRecord, offer: GiftOffer | null): number | null {
    const real = redemption.accessDurationDays
    const advertised = offer?.advertisedAccessDays ?? null
    return real !== null && advertised !== null && advertised < real ? advertised : real
  }

  /** A data de fim que as pessoas VEEM (a do prazo divulgado). */
  private shownExpiresAtOf(redemption: RedemptionRecord, offer: GiftOffer | null): Date | null {
    return scholarshipExpiresAt(redemption.createdAt, this.shownDaysOf(redemption, offer))
  }

  private windowElapsed(expiresAt: Date | null): boolean {
    return expiresAt !== null && this.now().getTime() >= expiresAt.getTime()
  }

  /** Curso do caminho antigo: o gravado no resgate (retomada conserva o curso). */
  private courseOf(redemption: RedemptionRecord, context: GiftContext): string {
    const slug = redemption.courseSlug ?? context.course?.slug
    if (!slug) throw new Error('resgate antigo sem curso gravado')
    return slug
  }

  /** O presente concluído vira aquisição `gift` (idempotente por resgate; falha não derruba). */
  private async recordGiftAcquisition(redemption: RedemptionRecord): Promise<void> {
    if (!this.opts.acquisitions) return
    try {
      const code = await this.repo.findCodeById(redemption.codeId)
      if (!code) return
      await this.opts.acquisitions.insert(
        giftAcquisition(redemption, code, this.now(), {
          amounts: this.opts.bonusAmounts ?? null,
          legacyCents: this.opts.legacyBonusCents ?? 3000,
          windowDays: this.opts.bonusWindowDays ?? 45,
        }),
      )
    } catch (error) {
      this.logger.warn('referrals.gift_acquisition_failed', {
        redemptionId: redemption.id,
        error: serializeError(error),
      })
    }
  }

  private async runSteps(
    redemption: RedemptionRecord,
    source: GiftSource,
    context: GiftContext,
    account?: { userId: string; audience: GiftAudience },
  ): Promise<RedeemResult> {
    let userId = redemption.userId
    let buyerCreated = redemption.buyerCreated

    // 1) Conta (idempotente por e-mail no auth; pulado na retomada).
    if (account) {
      if (userId && userId !== account.userId) return { kind: 'failed', reason: 'account_mismatch' }
      if (!userId) {
        userId = account.userId
        buyerCreated = false
        await this.repo.setRedemptionBuyer(redemption.id, userId, false)
      }
    }
    if (!userId) {
      const { firstName, lastName } = splitName(redemption.name)
      const res = await this.gateway.ensureBuyer({
        email: redemption.email,
        password: this.genPassword(),
        firstName,
        lastName,
        ...(redemption.phone ? { phone: redemption.phone } : {}),
        source: 'scholarship',
      })
      const resolvedUserId = readString(res.body, 'userId')
      if ((res.status !== 200 && res.status !== 201) || !resolvedUserId) {
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('ensure-buyer', res))
          .catch(() => {})
        this.logger.warn('referrals.redeem_ensure_buyer_failed', {
          redemptionId: redemption.id,
          status: res.status,
        })
        return { kind: 'upstream_error' }
      }
      userId = resolvedUserId
      buyerCreated = res.status === 201 || readBool(res.body, 'created')
      await this.repo.setRedemptionBuyer(redemption.id, userId, buyerCreated)
    }

    const offerPolicy = redemption.muralVisitorPolicy === 'offer'
    const expiresAt = this.expiresAtOf(redemption)

    // 2) Grant (dedupe do members por x-delivery-id ESTÁVEL + idempotência
    //    manual:userId:productId — replay é seguro).
    if (!redemption.grantedAt) {
      if (this.windowElapsed(expiresAt)) {
        await this.repo.markRedemptionFailed(redemption.id, 'gift_window_elapsed', null)
        return { kind: 'failed', reason: 'gift_window_elapsed' }
      }
      const offerRef = redemption.giftOfferId
      if (offerPolicy && !offerRef) throw new Error('resgate por oferta sem oferta gravada')
      const res =
        offerPolicy && offerRef
          ? // Presente por oferta: o members concede tudo o que a oferta inclui (curso, Mural
            // e a visita depois do prazo), com o prazo da oferta contado do resgate.
            await this.gateway.grantManualOffer({
              userId,
              offerRef,
              sourceId: `scholarship:${redemption.id}`,
              anchorAt: redemption.createdAt.toISOString(),
              audience: redemption.audience,
              deliveryId: `scholarship:offer:${offerRef}:${redemption.id}`,
            })
          : await this.gateway.grantManualCourse({
              userId,
              courseRef: this.courseOf(redemption, context),
              sourceId: `scholarship:${redemption.id}`,
              expiresAt: expiresAt?.toISOString() ?? null,
              // A versão do presente integra a chave: uma entrega antiga da OFERTA
              // não pode deduplicar o novo grant do CURSO no members.
              deliveryId: `scholarship:course:${this.courseOf(redemption, context)}:${redemption.id}`,
              // Só o adulto leva o campo: o corpo Kids continua byte a byte o de antes.
              ...(redemption.audience === 'adult' ? { audience: 'adult' as const } : {}),
            })
      if (res.status === 409) {
        // Terminal: matrícula manual revogada/expirada do mesmo produto exige
        // decisão humana (aflora no detalhe do embaixador no admin).
        await this.repo.markRedemptionFailed(redemption.id, 'grant_conflict', null)
        this.logger.warn('referrals.redeem_grant_conflict', { redemptionId: redemption.id })
        return { kind: 'failed', reason: 'grant_conflict' }
      }
      if (res.status === 503 && readErrorCode(res.body) === 'COURSE_UNAVAILABLE') {
        // Publicação mudou entre o preflight e o grant. A linha fica pendente
        // para retomar quando o curso voltar; jamais enviamos boas-vindas falsas.
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('grant', res))
          .catch(() => {})
        return { kind: 'gift_unavailable' }
      }
      if (res.status < 200 || res.status >= 300) {
        // O pending fica retryável, mas o motivo aflora no admin (lastError) —
        // sem isso um contrato, slug ou oferta errada seria invisível até ler os logs
        // (ex.: `grant:502:OFFER_UNRESOLVED`).
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('grant', res))
          .catch(() => {})
        this.logger.warn('referrals.redeem_grant_failed', {
          redemptionId: redemption.id,
          status: res.status,
          errorCode: readErrorCode(res.body),
        })
        return { kind: 'upstream_error' }
      }
      if (this.windowElapsed(expiresAt)) {
        await this.repo.markRedemptionFailed(redemption.id, 'gift_window_elapsed', null)
        return { kind: 'failed', reason: 'gift_window_elapsed' }
      }
      await this.repo.markCourseGranted(redemption.id, this.now())
    }

    if (
      !offerPolicy &&
      (redemption.muralVisitorPolicy === 'visitor' || redemption.muralVisitorPolicy === 'trial') &&
      !redemption.muralVisitorGrantedAt
    ) {
      if (
        redemption.muralVisitorPolicy === 'trial' &&
        (!expiresAt || this.windowElapsed(expiresAt))
      ) {
        await this.repo.markRedemptionFailed(redemption.id, 'gift_window_elapsed', null)
        return { kind: 'failed', reason: 'gift_window_elapsed' }
      }
      const res =
        redemption.muralVisitorPolicy === 'trial' && expiresAt
          ? await this.gateway.grantMuralTrial({
              userId,
              sourceId: `scholarship:${redemption.id}`,
              courseRef: this.courseOf(redemption, context),
              expiresAt: expiresAt.toISOString(),
              deliveryId: `scholarship:mural-trial:${redemption.id}`,
              // Adulto: o Mural adulto pelo mesmo prazo do curso.
              ...(redemption.audience === 'adult' ? { audience: 'adult' as const } : {}),
            })
          : await this.gateway.grantMuralVisitor({
              userId,
              sourceId: `scholarship:${redemption.id}`,
              deliveryId: `scholarship:mural-visitor:${redemption.id}`,
            })
      if (res.status === 409) {
        await this.repo.markRedemptionFailed(redemption.id, 'mural_grant_conflict', null)
        this.logger.warn('referrals.redeem_mural_grant_conflict', { redemptionId: redemption.id })
        return { kind: 'failed', reason: 'mural_grant_conflict' }
      }
      if (
        res.status < 200 ||
        res.status >= 300 ||
        (redemption.muralVisitorPolicy === 'trial' && !isMuralTrialGranted(res))
      ) {
        await this.repo
          .recordRedemptionError(redemption.id, upstreamErrorSummary('mural-grant', res))
          .catch(() => {})
        this.logger.warn('referrals.redeem_mural_grant_failed', {
          redemptionId: redemption.id,
          status: res.status,
          errorCode: readErrorCode(res.body),
        })
        return { kind: 'upstream_error' }
      }
      await this.repo.markMuralVisitorGranted(redemption.id, this.now())
    }

    if (this.windowElapsed(expiresAt)) {
      await this.repo.markRedemptionFailed(redemption.id, 'gift_window_elapsed', null)
      return { kind: 'failed', reason: 'gift_window_elapsed' }
    }

    await this.repo.markRedemptionGranted(redemption.id, this.now())
    await this.recordGiftAcquisition({ ...redemption, userId })

    // 3) E-mail (best-effort — o ACESSO é o produto; fallback = "esqueci minha
    //    senha"). Claim atômico: só uma execução emite token/envia.
    const emailStatus = await this.sendWelcome(redemption, buyerCreated === true, source, context)

    const muralAccess: GiftMuralAccess = offerPolicy
      ? this.offerOf(redemption, context)?.includesMural
        ? 'trial'
        : 'none'
      : redemption.muralVisitorPolicy === 'trial' || redemption.muralVisitorPolicy === 'visitor'
        ? redemption.muralVisitorPolicy
        : 'none'
    return {
      kind: 'completed',
      expiresAt:
        this.shownExpiresAtOf(redemption, this.offerOf(redemption, context))?.toISOString() ?? null,
      emailStatus,
      muralAccess,
    }
  }

  private async sendWelcome(
    redemption: RedemptionRecord,
    buyerCreated: boolean,
    source: GiftSource,
    context: GiftContext,
  ): Promise<'accepted' | 'failed' | 'unknown'> {
    try {
      const offerPolicy = redemption.muralVisitorPolicy === 'offer'
      const offer = this.offerOf(redemption, context)
      if (offerPolicy && !offer) {
        // Sem a oferta não há como dizer prazo e Mural sem errar: nada é reivindicado, a
        // próxima submissão do mesmo e-mail retoma o envio.
        this.logger.warn('referrals.redeem_welcome_offer_unresolved', {
          redemptionId: redemption.id,
        })
        return 'unknown'
      }
      const expiresAt = this.expiresAtOf(redemption)
      if (this.windowElapsed(expiresAt)) {
        this.logger.warn('referrals.redeem_welcome_expired', { redemptionId: redemption.id })
        return 'unknown'
      }
      const appUrl = this.appUrl(redemption.audience)
      if (!appUrl) {
        // App do público sem configuração: nada é reivindicado, a próxima submissão retoma.
        this.logger.warn('referrals.redeem_welcome_unconfigured', {
          redemptionId: redemption.id,
          audience: redemption.audience,
        })
        return 'failed'
      }
      if (!(await this.repo.claimRedemptionWelcome(redemption.id, this.now())))
        return redemption.welcomeAcceptedAt ? 'accepted' : 'unknown'
      const { firstName } = splitName(redemption.name)
      const idempotencyKey = `scholarship-welcome:${redemption.id}`
      const adult = redemption.audience === 'adult'
      const campaign = source.kind === 'campaign'
      const adultTemplates = ADULT_WELCOME_TEMPLATES[campaign ? 'campaign' : 'scholarship']
      // Presente por oferta e o `trial` antigo usam os mesmos e-mails (curso, prazo e Mural
      // chegam prontos nas variáveis).
      const giftTemplates = offerPolicy || redemption.muralVisitorPolicy === 'trial'
      // O e-mail mostra o prazo DIVULGADO (os dias a mais chegam de surpresa, pelo members).
      const shownDays = this.shownDaysOf(redemption, offer)
      const shownExpiresAt = this.shownExpiresAtOf(redemption, offer)
      const validade = shownExpiresAt ? formatValidade(shownExpiresAt) : ''
      // O Messaging não tem condicional: curso, prazo e a frase do Mural vão prontos.
      const giftVariables = {
        curso: context.course?.title ?? UNKNOWN_COURSE_TITLE,
        prazo:
          shownExpiresAt && shownDays !== null
            ? `por ${giftDurationLabel(shownDays)}, até ${validade} (horário de Brasília)`
            : 'sem prazo para terminar',
        mural: giftMuralText({
          audience: redemption.audience,
          participation: offerPolicy
            ? Boolean(offer?.includesMural)
            : redemption.muralVisitorPolicy === 'trial',
          visitorOnly: redemption.muralVisitorPolicy === 'visitor',
          hasDeadline: expiresAt !== null,
        }),
        validade,
        // O próximo passo (e-mails Kids do presente): perfil e aparelho da criança, ou o curso
        // para pais na área dos pais.
        orientacao: giftGuidanceText({
          parentsCourse: context.course?.learner === 'parents',
          existingAccount: !buyerCreated,
        }),
      }
      const parentsCourseSlug = context.course?.learner === 'parents' ? context.course.slug : null

      let send: GatewayResult
      if (buyerCreated) {
        const tokenRes = await this.gateway.createPasswordToken(redemption.email)
        const token = readString(tokenRes.body, 'token')
        if (tokenRes.status !== 201 || !token) {
          // NADA foi emitido → libera o claim p/ uma retomada futura tentar.
          await this.repo.releaseRedemptionWelcome(redemption.id)
          this.logger.warn('referrals.redeem_token_failed', {
            redemptionId: redemption.id,
            status: tokenRes.status,
          })
          return 'failed'
        }
        // Token EMITIDO: só liberar o claim se o Messaging RECUSAR (4xx, nada saiu);
        // reemitir depois de um envio aceito mataria o link entregue (o auth consome
        // tokens pendentes ao emitir um novo).
        send = await this.sendWithFallback(
          redemption.id,
          {
            templateKey: adult
              ? adultTemplates.created
              : giftTemplates
                ? campaign
                  ? 'referrals-campaign-welcome-mural-trial'
                  : 'referrals-scholarship-welcome-mural-trial'
                : campaign
                  ? 'referrals-campaign-welcome'
                  : redemption.muralVisitorPolicy === 'visitor'
                    ? 'referrals-scholarship-welcome-7d-mural'
                    : expiresAt
                      ? 'referrals-scholarship-welcome-7d'
                      : 'referrals-scholarship-welcome',
            recipient: { name: firstName, email: redemption.email },
            variables: {
              nome: firstName,
              ...(campaign
                ? { campanha: source.name }
                : { indicador: publicGiftSourceName(source) }),
              ...giftVariables,
              // Conta nova: primeiro acesso de sempre (definir a senha), até no curso para pais.
              link: giftWelcomeLink(redemption.audience, appUrl, token),
            },
          },
          idempotencyKey,
        )
      } else {
        // Conta pré-existente: NÃO emite token (invalidaria um token vivo de
        // compra/convite recente). A política do resgate escolhe o aviso correto.
        send = await this.sendWithFallback(
          redemption.id,
          {
            templateKey: adult
              ? adultTemplates.existing
              : giftTemplates
                ? campaign
                  ? 'referrals-campaign-existing-mural-trial'
                  : 'referrals-scholarship-existing-mural-trial'
                : campaign
                  ? 'referrals-campaign-existing'
                  : redemption.muralVisitorPolicy === 'visitor'
                    ? 'referrals-scholarship-existing-7d-mural'
                    : expiresAt
                      ? 'referrals-scholarship-existing-7d'
                      : 'kids-new-access',
            recipient: { name: firstName, email: redemption.email },
            variables: {
              nome: firstName,
              // Como na conta nova: todo e-mail de código de pessoa nomeia quem deu o presente
              // (os templates do presente exigem `indicador`; o Messaging aceita a variável extra
              // no `kids-new-access` histórico).
              ...(campaign
                ? { campanha: source.name }
                : { indicador: publicGiftSourceName(source) }),
              ...giftVariables,
              // Curso para pais: direto na página do curso na área dos pais.
              link: giftWelcomeLink(redemption.audience, appUrl, null, parentsCourseSlug),
            },
          },
          idempotencyKey,
        )
      }
      if (send.status !== 202 && send.status !== 200) {
        // 4xx = o Messaging (ou o gateway) RECUSOU antes de enfileirar: nada saiu, nem o
        // link de senha. Libera o claim para a próxima submissão do mesmo e-mail retomar
        // o envio (numa conta nova, com token novo: o anterior nunca foi entregue).
        // 5xx/timeout é ambíguo (pode ter enfileirado com o token atual): o claim fica.
        const refused = send.status >= 400 && send.status < 500
        if (refused) await this.repo.releaseRedemptionWelcome(redemption.id)
        this.logger.warn('referrals.redeem_welcome_send_failed', {
          redemptionId: redemption.id,
          status: send.status,
          errorCode: readErrorCode(send.body),
          released: refused,
        })
        return 'failed'
      }
      // A aceitação já ocorreu. Falhar ao gravar o recibo não desfaz o envio.
      await this.repo.markWelcomeAccepted(redemption.id, this.now()).catch((error: unknown) => {
        this.logger.warn('referrals.redeem_welcome_receipt_failed', {
          redemptionId: redemption.id,
          error: error instanceof Error ? error.message : String(error),
        })
      })
      return 'accepted'
    } catch (error) {
      this.logger.warn('referrals.redeem_welcome_error', {
        redemptionId: redemption.id,
        error: error instanceof Error ? error.message : String(error),
      })
      return 'failed'
    }
  }

  /**
   * Envia o welcome; se a chave nova ainda não existir no Messaging (404 `TEMPLATE_NOT_FOUND`),
   * tenta a chave antiga com as MESMAS variáveis e a MESMA Idempotency-Key — o Messaging recusa a
   * chave ausente antes de gravar a mensagem, então nada ficou registrado com ela.
   */
  private async sendWithFallback(
    redemptionId: string,
    input: SendEmailInput,
    idempotencyKey: string,
  ): Promise<GatewayResult> {
    const res = await this.gateway.sendEmail(input, idempotencyKey)
    const legacy = LEGACY_TEMPLATE_KEYS[input.templateKey]
    if (!legacy || res.status !== 404 || readErrorCode(res.body) !== 'TEMPLATE_NOT_FOUND')
      return res
    this.logger.warn('referrals.redeem_welcome_template_fallback', {
      redemptionId,
      from: input.templateKey,
      to: legacy,
    })
    return this.gateway.sendEmail({ ...input, templateKey: legacy }, idempotencyKey)
  }
}

function readString(body: unknown, key: string): string | null {
  if (body && typeof body === 'object' && key in body) {
    const v = (body as Record<string, unknown>)[key]
    if (typeof v === 'string' && v.length > 0) return v
  }
  return null
}

function readBool(body: unknown, key: string): boolean {
  return Boolean(
    body && typeof body === 'object' && (body as Record<string, unknown>)[key] === true,
  )
}

function readBoolean(body: unknown, key: string): boolean | null {
  if (!body || typeof body !== 'object' || !(key in body)) return null
  const value = (body as Record<string, unknown>)[key]
  return typeof value === 'boolean' ? value : null
}

/** Código de erro do envelope `{error: {code}}` (gateway/serviços) ou `{error: '<code>'}` (members). */
function readErrorCode(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null
  const err = (body as { error?: unknown }).error
  if (typeof err === 'string' && err.length > 0) return err
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string' && code.length > 0) return code
  }
  return null
}

/** Resumo compacto `etapa:status[:código]` gravado em `last_error` (diagnóstico do admin). */
function upstreamErrorSummary(step: string, res: GatewayResult): string {
  const code = readErrorCode(res.body)
  return (code ? `${step}:${res.status}:${code}` : `${step}:${res.status}`).slice(0, 300)
}

/** "9 de outubro de 2026 às 14:30": o e-mail completa com "(horário de Brasília)". */
function formatValidade(date: Date): string {
  return date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'long',
    timeStyle: 'short',
  })
}
