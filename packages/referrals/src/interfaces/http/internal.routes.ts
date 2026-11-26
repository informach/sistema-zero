import { envelope } from '@sistemazero/core/http'
import {
  type GiftSource,
  publicGiftSourceName,
  sanitizeGiftAttribution,
} from '@sistemazero/core/referrals'
import { Elysia, t } from 'elysia'
import type { AcquisitionReportsService } from '../../application/acquisitions/acquisition-reports.service'
import type { AmbassadorOffersService } from '../../application/ambassador-offers/ambassador-offers.service'
import type { AmbassadorAdminService } from '../../application/ambassadors/ambassador-admin.service'
import type { CampaignAdminService } from '../../application/campaigns/campaign-admin.service'
import type { CreateInviteService } from '../../application/invites/create-invite.service'
import type { ReferralLinkService } from '../../application/links/referral-link.service'
import type { RedeemScholarshipService } from '../../application/redeem-scholarship/redeem-scholarship.service'
import { campaignRedirectActive, campaignSource, campaignState } from '../../domain/campaign'
import { EMAIL_PATTERN, isValidCode, normalizeCode } from '../../domain/codes'
import { CHECKOUT_SEGMENT, referralLinkUrl, scholarshipShareUrl } from '../../domain/links'
import type { CourseBenefitRepository } from '../../domain/ports/course-benefit-repository.port'
import type { ReferralRepository } from '../../domain/ports/referral-repository.port'
import { assertInternalCaller } from './auth'

const TOKEN_PATTERN = '^[A-Za-z0-9_-]{16,64}$'
const AUDIENCE = t.Union([t.Literal('kids'), t.Literal('adult')])

export interface InternalRoutesDeps {
  benefits?: Pick<CourseBenefitRepository, 'findById'>
  repo: ReferralRepository
  redeem: RedeemScholarshipService
  invite: CreateInviteService
  funnelPublicUrl: string
  campaigns?: CampaignAdminService
  /** Cria o código adulto do embaixador sob demanda (`shareUrls`). */
  ambassadors?: AmbassadorAdminService
  bonusAmountCents?: number
  bonusAnnualAmountCents?: number
  internalToken?: string
  /** Links `/i/...` (25/11/2026): o que cada link abre. */
  links?: ReferralLinkService
  /** As ofertas que o embaixador pode mandar (página do embaixador). */
  ambassadorOffers?: AmbassadorOffersService
  /** Pessoas que entraram pelos links do embaixador (o número da página). */
  reports?: AcquisitionReportsService
}

const SLUG = '^[a-z0-9]+(?:-[a-z0-9]+)*$'

/**
 * Rotas S2S consumidas pelo FUNIL (landings /bolsa e /embaixador) via gateway
 * (auth = HMAC de borda lá; aqui a prova de origem `x-internal-token`).
 * 404 UNIFORME para código/token inexistente OU desativado — não vazar qual.
 */
export function internalRoutes(deps: InternalRoutesDeps) {
  const guard = (headers: Record<string, string | undefined>) =>
    assertInternalCaller(headers['x-internal-token'], deps.internalToken)

  return new Elysia({ prefix: '/referrals/internal' })
    .onTransform(({ headers }) => guard(headers))
    .get(
      '/campaigns/:id/coupon-policy',
      async ({ params, set }) => {
        const policy = await deps.campaigns?.couponPolicy(params.id)
        if (!policy) {
          set.status = 404
          return envelope('CAMPAIGN_NOT_FOUND', 'Campanha não encontrada')
        }
        return policy
      },
      { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
    )
    .get(
      '/links/:code',
      async ({ params, query, set }) => {
        // Link curto por curso (`/i/<código>/<apelido>[/presente|/pagamento]`, 25/11/2026): o
        // funil manda os SKUs do produto da página (um por público) e o tipo da lista.
        if (query.product) {
          const skus = query.product
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
          return linkResponse(deps, params.code, null, query.checkout === '1', set, {
            kind: query.kind === 'gift' ? 'gift' : 'referral',
            skus,
          })
        }
        return linkResponse(deps, params.code, null, false, set)
      },
      {
        params: t.Object({ code: t.String({ minLength: 1, maxLength: 64 }) }),
        query: t.Object({
          product: t.Optional(
            t.String({ minLength: 1, maxLength: 200, pattern: '^[a-z0-9-]+(,[a-z0-9-]+){0,3}$' }),
          ),
          kind: t.Optional(t.Union([t.Literal('gift'), t.Literal('referral')])),
          checkout: t.Optional(t.Literal('1')),
        }),
      },
    )
    .get(
      '/links/:code/:offer',
      async ({ params, set }) =>
        params.offer === CHECKOUT_SEGMENT
          ? linkResponse(deps, params.code, null, true, set)
          : linkResponse(deps, params.code, params.offer, false, set),
      {
        params: t.Object({
          code: t.String({ minLength: 1, maxLength: 64 }),
          offer: t.String({ minLength: 1, maxLength: 80, pattern: SLUG }),
        }),
      },
    )
    .get(
      '/links/:code/:offer/:target',
      async ({ params, set }) => {
        if (params.target !== CHECKOUT_SEGMENT) {
          set.status = 404
          return envelope('LINK_NOT_FOUND', 'Link não encontrado')
        }
        return linkResponse(deps, params.code, params.offer, true, set)
      },
      {
        params: t.Object({
          code: t.String({ minLength: 1, maxLength: 64 }),
          offer: t.String({ minLength: 1, maxLength: 80, pattern: SLUG }),
          target: t.String({ minLength: 1, maxLength: 16 }),
        }),
      },
    )
    .get(
      '/redirects',
      async ({ query, set }) => {
        // Sem `path`: a lista dos endereços antigos ativos (o funil a guarda por um minuto e
        // confere cada visita localmente, sem uma chamada por caminho).
        if (query.path === undefined) {
          const active = (await deps.campaigns?.repo.listActiveRedirects(new Date())) ?? []
          return {
            items: active.flatMap((campaign) =>
              campaign.redirectPath && campaignRedirectActive(campaign)
                ? [
                    {
                      path: campaign.redirectPath,
                      url: deps.campaigns?.campaignLink(campaign) ?? null,
                      until: campaign.redirectUntil?.toISOString() ?? null,
                    },
                  ]
                : [],
            ),
          }
        }
        const campaign = await deps.campaigns?.repo.findByRedirectPath(query.path)
        if (!campaign || !campaignRedirectActive(campaign)) {
          set.status = 404
          return envelope('REDIRECT_NOT_FOUND', 'Sem redirecionamento')
        }
        return {
          url: deps.campaigns?.campaignLink(campaign) ?? null,
          until: campaign.redirectUntil?.toISOString() ?? null,
        }
      },
      { query: t.Object({ path: t.Optional(t.String({ minLength: 2, maxLength: 120 })) }) },
    )
    .get(
      '/codes/:code',
      async ({ params, query, headers, set }) => {
        guard(headers)
        const code = normalizeCode(params.code)
        if (!isValidCode(code)) {
          set.status = 404
          return envelope('CODE_NOT_FOUND', 'Código não encontrado')
        }
        const record = await deps.repo.findCodeByCode(code)
        if (record?.status !== 'active') {
          set.status = 404
          return envelope('CODE_NOT_FOUND', 'Código não encontrado')
        }
        if (record.ownerKind === 'benefit') {
          const benefit = record.benefitId ? await deps.benefits?.findById(record.benefitId) : null
          if (!benefit || benefit.status !== 'active') {
            set.status = 404
            return envelope('CODE_NOT_FOUND', 'Código não encontrado')
          }
          return {
            code: record.code,
            displayName: benefit.name,
            ownerKind: 'benefit',
            source: { kind: 'benefit', name: benefit.name },
            state: 'active',
            startsAt: null,
            endsAt: null,
            giftAvailable: false,
            audience: benefit.audience,
            courseBenefit: { courseSlug: benefit.courseSlug, name: benefit.name },
          }
        }
        const campaign =
          record.ownerKind === 'campaign' && record.campaignId
            ? await deps.campaigns?.repo.findById(record.campaignId)
            : null
        // Campanha de venda não tem página de presente (o link dela abre a oferta).
        if (
          record.ownerKind === 'campaign' &&
          (!campaign || campaignState(campaign) === 'draft' || campaign.kind === 'sale')
        ) {
          set.status = 404
          return envelope('CODE_NOT_FOUND', 'Código não encontrado')
        }
        const state = campaign ? campaignState(campaign) : 'active'
        const source: GiftSource = campaign
          ? campaignSource(campaign)
          : { kind: record.ownerKind, name: record.displayName }
        const publicName = publicGiftSourceName(source)
        // O público vem do código (campanha → público da campanha); a oferta vem da campanha
        // (ou é a padrão do público) e decide o curso consultado e o `gift` devolvido.
        const audience = campaign?.audience ?? record.audience
        // Fora do ar (agendada, pausada, encerrada) não há cadastro novo, mas a página ainda diz
        // qual curso é o presente (curso para pais tem outra página): o `gift` vem quando a
        // oferta resolve, e falha do catálogo só o omite (a página cai no texto de sempre).
        // A escolha do embaixador fora da lista do público: o link não existe.
        if (
          query.offer &&
          !campaign &&
          !(await deps.redeem.giftRefFor(null, audience, query.offer))
        ) {
          set.status = 404
          return envelope('CODE_NOT_FOUND', 'Código não encontrado')
        }
        const plan = await deps.redeem.publicGift(campaign ?? null, audience, query.offer)
        const { availability, gift } =
          state === 'active'
            ? plan
            : {
                availability: 'unavailable' as const,
                gift: plan.availability === 'available' ? plan.gift : undefined,
              }
        if (availability === 'upstream_error') {
          set.status = 502
          return envelope('UPSTREAM_ERROR', 'Não foi possível consultar o presente agora')
        }
        return {
          code: record.code,
          ownerKind: record.ownerKind,
          displayName: publicName,
          source: { ...source, name: publicName },
          state,
          startsAt: campaign?.startsAt.toISOString() ?? null,
          endsAt: campaign?.endsAt.toISOString() ?? null,
          giftAvailable: availability === 'available',
          audience,
          // O que a oferta entrega (ausente quando não resolve ou o presente está fechado).
          ...(gift ? { gift } : {}),
        }
      },
      {
        params: t.Object({ code: t.String({ minLength: 1, maxLength: 64 }) }),
        query: t.Object({
          /** O presente escolhido pelo embaixador (slug da lista do público). */
          offer: t.Optional(t.String({ minLength: 1, maxLength: 80, pattern: SLUG })),
        }),
      },
    )
    .get(
      '/ambassadors/by-token/:token',
      async ({ params, query, headers, set }) => {
        guard(headers)
        const ambassador = await deps.repo.findAmbassadorByToken(params.token)
        if (ambassador?.status !== 'active' || !ambassador.code) {
          set.status = 404
          return envelope('AMBASSADOR_NOT_FOUND', 'Página não encontrada')
        }
        // Bônus SEM PII do bolsista (LGPD): o embaixador vê valor/data/estado,
        // nunca quem assinou. A régua do que é visível vive no repo/domínio
        // (filtro no SQL, ANTES do limit — canceladas não empurram bônus reais
        // para fora da página).
        const [visible, shareUrls, campaigns, offers, results] = await Promise.all([
          deps.repo.listAmbassadorVisibleConversions(ambassador.id, 50),
          // O código adulto nasce aqui quando falta (idempotente e seguro em corrida).
          deps.ambassadors
            ? deps.ambassadors.shareUrls(ambassador)
            : Promise.resolve({
                kids: scholarshipShareUrl(deps.funnelPublicUrl, ambassador.code),
                adult: null,
              }),
          deps.campaigns?.forAmbassador(ambassador.id, query.campaignOffset ?? 0),
          ambassadorOfferLinks(deps, ambassador),
          deps.reports?.ambassadorResults([ambassador.id]),
        ])
        return {
          name: ambassador.name,
          code: ambassador.code,
          // `shareUrl` continua sendo o link Kids (compatível com o funil anterior).
          shareUrl: scholarshipShareUrl(deps.funnelPublicUrl, ambassador.code),
          shareUrls,
          campaigns,
          // Só quantidades: o embaixador nunca vê valores de venda (decisão de 25/11/2026).
          // Só quantidades (decisão de 25/11/2026): pessoas, presentes e compras pelos links.
          // Nunca valores de venda: o faturamento é leitura do Admin.
          stats: {
            ...ambassador.stats,
            people: results?.get(ambassador.id)?.people ?? null,
            gifts: results?.get(ambassador.id)?.gifts ?? null,
            purchases: results?.get(ambassador.id)?.purchases ?? null,
          },
          offers,
          bonus: {
            amountCents: deps.bonusAmountCents,
            annualAmountCents: deps.bonusAnnualAmountCents,
            pixKey: ambassador.pixKey,
            items: visible.map((c) => ({
              id: c.id,
              status: c.status,
              bonusCents: c.bonusCents,
              subscribedAt: c.paidAt.toISOString(),
              paidMarkedAt: c.paidMarkedAt?.toISOString() ?? null,
            })),
          },
        }
      },
      {
        params: t.Object({ token: t.String({ pattern: TOKEN_PATTERN }) }),
        query: t.Object({
          campaignOffset: t.Optional(t.Integer({ minimum: 0, maximum: 200_000 })),
        }),
      },
    )
    .patch(
      // Chave Pix do bônus — cadastrada pelo PRÓPRIO embaixador (a capability
      // da página é a autorização; validação leve: CPF/e-mail/fone/EVP cabem).
      '/ambassadors/by-token/:token/pix',
      async ({ params, body, headers, set }) => {
        guard(headers)
        const pixKey = body.pixKey.trim()
        const ok = await deps.repo.setAmbassadorPixByToken(params.token, pixKey)
        if (!ok) {
          set.status = 404
          return envelope('AMBASSADOR_NOT_FOUND', 'Página não encontrada')
        }
        return { ok: true }
      },
      {
        params: t.Object({ token: t.String({ pattern: TOKEN_PATTERN }) }),
        body: t.Object({ pixKey: t.String({ minLength: 5, maxLength: 140 }) }),
      },
    )
    .post(
      '/ambassadors/by-token/:token/invites',
      async ({ params, body, headers, set }) => {
        guard(headers)
        const result = await deps.invite.execute({
          pageToken: params.token,
          name: body.name,
          email: body.email,
          audience: body.audience ?? 'kids',
          offer: body.offer ?? null,
          kind: body.kind ?? 'gift',
        })
        switch (result.kind) {
          case 'sent':
            set.status = 202
            return { ok: true }
          case 'ambassador_not_found':
            set.status = 404
            return envelope('AMBASSADOR_NOT_FOUND', 'Página não encontrada')
          case 'already_invited':
            set.status = 409
            return envelope('INVITE_ALREADY_SENT', 'Esse e-mail já recebeu o convite')
          case 'already_redeemed':
            set.status = 409
            return envelope('EMAIL_ALREADY_REDEEMED', 'Este e-mail já resgatou este presente.')
          case 'offer_unavailable':
            set.status = 404
            return envelope('OFFER_NOT_FOUND', 'Esta oferta não está disponível para convites.')
          case 'gift_unavailable':
            // Presente do público sem configuração (adulto sem `COMMUNITY_URL`): nenhum
            // convite sai para um link que não abre.
            set.status = 503
            return envelope(
              'GIFT_UNAVAILABLE',
              'Este presente ainda não está disponível para convites.',
            )
          case 'daily_limit':
            set.status = 429
            return envelope('INVITE_DAILY_LIMIT', 'Limite diário de convites atingido')
          case 'upstream_error':
            set.status = 502
            return envelope('UPSTREAM_ERROR', 'Não foi possível enviar agora')
        }
      },
      {
        params: t.Object({ token: t.String({ pattern: TOKEN_PATTERN }) }),
        body: t.Object({
          name: t.String({ minLength: 2, maxLength: 120 }),
          email: t.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
          /** Público do presente convidado; ausente = `kids`. */
          audience: t.Optional(AUDIENCE),
          /** A oferta da lista do público (presente escolhido ou indicação). */
          offer: t.Optional(t.String({ minLength: 1, maxLength: 80, pattern: SLUG })),
          kind: t.Optional(t.Union([t.Literal('gift'), t.Literal('referral')])),
        }),
      },
    )
    .post(
      '/redemptions',
      async ({ body, headers, set }) => {
        guard(headers)
        const result = await deps.redeem.execute({
          code: body.code,
          name: body.name,
          email: body.email,
          phone: body.phone,
          attribution: sanitizeGiftAttribution(body.attribution),
          offer: body.offer ?? null,
        })
        switch (result.kind) {
          case 'completed':
            set.status = 201
            return {
              status: 'completed',
              expiresAt: result.expiresAt,
              emailStatus: result.emailStatus,
              muralAccess: result.muralAccess,
            }
          case 'processing':
            set.status = 202
            return { status: 'processing' }
          case 'code_not_found':
            set.status = 404
            return envelope('CODE_NOT_FOUND', 'Código não encontrado')
          case 'already_redeemed':
            set.status = 409
            return envelope(
              'SCHOLARSHIP_ALREADY_REDEEMED',
              'Este e-mail já resgatou este presente.',
            )
          case 'gift_unavailable':
            set.status = 503
            return envelope('GIFT_UNAVAILABLE', 'O cadastro por este link ainda não abriu.')
          case 'campaign_unavailable':
            set.status = 410
            return envelope(
              'CAMPAIGN_UNAVAILABLE',
              result.state === 'scheduled'
                ? 'Esta campanha ainda não começou.'
                : result.state === 'paused'
                  ? 'Esta campanha está pausada.'
                  : 'O período desta campanha terminou.',
            )
          case 'failed':
            if (result.reason === 'gift_window_elapsed') {
              set.status = 410
              return envelope('GIFT_EXPIRED', 'O prazo de acesso deste cadastro terminou.')
            }
            // Terminal (ex.: matrícula conflitante) — retry não resolve; suporte.
            set.status = 409
            return envelope('SCHOLARSHIP_FAILED', 'Não foi possível concluir o resgate')
          case 'upstream_error':
            set.status = 502
            return envelope('UPSTREAM_ERROR', 'Não foi possível concluir agora')
        }
      },
      {
        body: t.Object({
          code: t.String({ minLength: 4, maxLength: 32 }),
          name: t.String({ minLength: 2, maxLength: 120 }),
          email: t.String({ pattern: EMAIL_PATTERN, maxLength: 254 }),
          phone: t.Optional(t.String({ maxLength: 20 })),
          /** O presente escolhido pelo embaixador (slug da lista do público). */
          offer: t.Optional(t.String({ minLength: 1, maxLength: 80, pattern: SLUG })),
          attribution: t.Optional(
            t.Object({
              utmSource: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
              utmMedium: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
              utmCampaign: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
              utmContent: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
            }),
          ),
        }),
      },
    )
}

type SetStatus = { status?: number | string }

async function linkResponse(
  deps: InternalRoutesDeps,
  rawCode: string,
  offer: string | null,
  checkout: boolean,
  set: SetStatus,
  byProduct?: { kind: 'gift' | 'referral'; skus: string[] },
) {
  const code = normalizeCode(rawCode)
  if (!deps.links || !isValidCode(code)) {
    set.status = 404
    return envelope('LINK_NOT_FOUND', 'Link não encontrado')
  }
  const result = byProduct
    ? await deps.links.resolveForProduct(code, byProduct.kind, byProduct.skus, checkout)
    : await deps.links.resolve(code, offer, checkout)
  if (result.kind === 'upstream_error') {
    set.status = 502
    return envelope('UPSTREAM_ERROR', 'Não foi possível abrir o link agora')
  }
  if (result.kind === 'not_found') {
    set.status = 404
    return envelope('LINK_NOT_FOUND', 'Link não encontrado')
  }
  return result.link
}

/**
 * As opções da página do embaixador nos dois públicos, cada uma com o link pronto (`/i/<código
 * do público>/<oferta>`). O código adulto nasce sob demanda (como no `shareUrls`); sem ele, as
 * opções adultas ficam de fora.
 */
async function ambassadorOfferLinks(
  deps: InternalRoutesDeps,
  ambassador: { id: string; name: string; status: string; code: string | null },
) {
  if (!deps.ambassadorOffers) return []
  const codes = deps.ambassadors
    ? await deps.ambassadors.shareCodes({
        ...ambassador,
        status: ambassador.status === 'active' ? 'active' : 'disabled',
      })
    : { kids: ambassador.code, adult: null }
  const items = []
  for (const audience of ['kids', 'adult'] as const) {
    const code = codes[audience]
    if (!code) continue
    for (const option of await deps.ambassadorOffers.options(audience)) {
      items.push({
        ...option,
        link: referralLinkUrl(deps.funnelPublicUrl, code, { offerSlug: option.offerSlug }),
        checkoutLink:
          option.kind === 'referral'
            ? referralLinkUrl(deps.funnelPublicUrl, code, {
                offerSlug: option.offerSlug,
                checkout: true,
              })
            : null,
      })
    }
  }
  return items
}
