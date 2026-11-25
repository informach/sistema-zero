import {
  CommerceBlockSchema,
  type CommerceCatalogOffer,
  CommerceCatalogOfferSchema,
  type CommerceOrigin,
  CommerceOriginSchema,
  memberPromotionSchema,
} from '@sistemazero/core/commerce'
import type { ReferralGiftOfferView } from '@sistemazero/core/referrals'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { PromotionCardView } from '../lib/commerce'
import {
  type CommerceAccess,
  commerceEligibility,
  giftAlreadyIncluded,
  hasOngoingSubscription,
} from '../lib/commerce-eligibility'
import { isSameOriginRequest } from '../lib/csrf'
import type { AuthClient, MembersClient, PaymentsClient } from '../server/clients'
import type { GatewayModule } from '../server/gateway'
import type { SessionModule } from '../server/session'

export interface CommerceRouteDeps {
  session: Pick<SessionModule, 'getSession'>
  gateway: Pick<GatewayModule, 'gatewayFetch' | 'gatewayFetchHmac'>
  auth: Pick<AuthClient, 'getMe'>
  members: Pick<MembersClient, 'getLesson'>
  payments: Pick<PaymentsClient, 'listMySubscriptions' | 'getCardConfig'>
  audience: 'kids' | 'adult'
}
const bodySchema = z.strictObject({
  action: z.enum(['inspect', 'redeem', 'pay', 'status', 'restart', 'quote']),
  origin: CommerceOriginSchema,
  checkoutId: z.uuid().optional(),
  /** O outro plano do mesmo produto (mensal ou anual): só vale se for a irmã da oferta da origem. */
  offerRef: z
    .string()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,139}$/)
    .optional(),
  /** O botão que abriu a compra. Fora da lista do público, vale o lugar padrão da origem. */
  place: z.string().max(48).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
})
/**
 * Os botões da plataforma que vendem (25/11/2026). Vão ao metadata da cobrança como `origemLugar`
 * e alimentam a Origem das vendas no Admin. A aula é sempre `aula`.
 */
export const COMMERCE_PLACES = {
  kids: { inicio: 'pais-inicio', cursos: 'pais-cursos', curso: 'pais-curso-fechado' },
  adult: { inicio: 'inicio', cursos: 'cursos', curso: 'curso-fechado' },
} as const
/** Duas ofertas do mesmo produto ligadas pelo alternador (`content.altOffer`), em qualquer sentido. */
const isSubscription = (offer: CommerceCatalogOffer) => offer.pricingMode === 'subscription'
function siblingOffers(a: CommerceCatalogOffer, b: CommerceCatalogOffer) {
  return (
    a.id !== b.id &&
    a.product.id === b.product.id &&
    (a.content?.altOffer?.slug === b.slug || b.content?.altOffer?.slug === a.slug)
  )
}
function failure(message: string, status = 503) {
  return NextResponse.json({ error: { code: 'COMMERCE_UNAVAILABLE', message } }, { status })
}
export function createCommerceRoutes(deps: CommerceRouteDeps) {
  function placeFor(origin: CommerceOrigin, requested: string | undefined) {
    if (origin.kind === 'lesson') return 'aula'
    const places = COMMERCE_PLACES[deps.audience]
    if (requested && (Object.values(places) as string[]).includes(requested)) return requested
    return origin.kind === 'offer' ? places.curso : places.inicio
  }
  async function account() {
    const session = await deps.session.getSession()
    if (
      !session ||
      session.act ||
      session.activeProfile ||
      (deps.audience === 'kids' && session.kids?.kind !== 'parent')
    )
      return null
    // A leitura do JWT sozinha pode tolerar exp no app adulto; /auth/me revalida e renova.
    const response = await deps.auth.getMe()
    if (response.status >= 500)
      return failure('Não foi possível conferir sua conta agora. Tente novamente.')
    const user = response.body?.user
    if (response.status !== 200 || !user || user.id !== session.id || user.status !== 'active')
      return null
    return {
      userId: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim().slice(0, 120),
      phone: typeof user.phone === 'string' ? user.phone : undefined,
      audience: deps.audience,
    }
  }
  async function offer(ref: string): Promise<CommerceCatalogOffer | null> {
    const found = await deps.gateway.gatewayFetch(`/catalog/offers/${encodeURIComponent(ref)}`)
    const parsed = CommerceCatalogOfferSchema.safeParse(found.body)
    return found.status === 200 && parsed.success && parsed.data.product.audience === deps.audience
      ? parsed.data
      : null
  }
  async function originConfig(
    origin: CommerceOrigin,
    actor: {
      userId: string
      email: string
      name: string
      phone?: string
      audience: 'kids' | 'adult'
    },
  ) {
    if (origin.kind === 'community') {
      const response = await deps.gateway.gatewayFetchHmac<{ offer: unknown }>(
        '/funnel/internal/commerce/default-offer',
        { method: 'POST', body: { account: actor, origin } },
      )
      const target = CommerceCatalogOfferSchema.safeParse(response.body?.offer)
      return response.status === 200 &&
        target.success &&
        target.data.product.audience === deps.audience
        ? {
            config: { kind: 'purchase' as const, offerRef: target.data.slug },
            expectedOfferId: target.data.id,
          }
        : null
    }
    if (origin.kind === 'offer') {
      // A página do curso só vende a oferta principal do produto ou uma marcada no Admin
      // "Pode ser vendida na página do produto": a oferta de presente nunca abre à venda.
      const target = await offer(origin.offerRef)
      if (!target?.isAvailable || target.product.status !== 'active') return null
      if (target.content?.pageSellable !== true) {
        const product = await deps.gateway.gatewayFetch<{ primaryOfferSlug?: unknown }>(
          `/catalog/products/by-sku/${encodeURIComponent(target.product.sku)}`,
        )
        if (product.status !== 200 && product.status !== 404) return 'unavailable' as const
        if (product.status !== 200 || product.body?.primaryOfferSlug !== target.slug) return null
      }
      return {
        config: { kind: 'purchase' as const, offerRef: target.slug },
        expectedOfferId: target.id,
      }
    }
    if (origin.kind === 'lesson') {
      const lesson = await deps.members.getLesson(origin.courseSlug, origin.lessonId)
      if (lesson.status !== 200 || !lesson.body) return null
      const block = lesson.body.blocks.find((b) => b.id === origin.blockId)
      const parsed = CommerceBlockSchema.safeParse(block?.content)
      return parsed.success ? { config: parsed.data, expectedOfferId: null } : null
    }
    const target = await offer(origin.offerRef)
    const promotion = memberPromotionSchema.safeParse(target?.content?.memberPromotion)
    if (!target?.isAvailable || !promotion.success || !promotion.data.enabled) return null
    const p = promotion.data
    const config =
      p.mode === 'gift' && p.campaignCode
        ? {
            kind: 'gift' as const,
            campaignCode: p.campaignCode,
            title: p.title,
            description: p.description,
            buttonLabel: p.buttonLabel,
          }
        : p.mode === 'purchase'
          ? {
              kind: 'purchase' as const,
              offerRef: target.slug,
              title: p.title,
              description: p.description,
              buttonLabel: p.buttonLabel,
            }
          : null
    return config ? { config, expectedOfferId: target.id } : null
  }
  async function eligibility(target: CommerceCatalogOffer) {
    const [access, subscriptions] = await Promise.all([
      deps.gateway.gatewayFetch<{ items: CommerceAccess[] }>('/members/commerce/access'),
      deps.payments.listMySubscriptions(),
    ])
    if (
      access.status !== 200 ||
      !Array.isArray(access.body?.items) ||
      subscriptions.status !== 200 ||
      !Array.isArray(subscriptions.body?.items)
    )
      return null
    if (access.body.items.some((a) => a.productId === target.product.id && a.kind !== 'gift'))
      return { kind: 'manage' as const }
    const resolved = await Promise.all(
      subscriptions.body.items.map(async (subscription) => {
        const relevant = hasOngoingSubscription(subscription)
        if (!subscription.offerId) return { subscription, productId: null, unresolved: relevant }
        const bought = await offer(subscription.offerId)
        return {
          subscription,
          productId: bought?.product.id ?? null,
          unresolved: relevant && !bought,
        }
      }),
    )
    if (resolved.some((s) => s.unresolved)) return null
    return commerceEligibility(target, access.body.items, resolved)
  }
  const commerce = {
    POST: async (request: Request) => {
      if (
        !isSameOriginRequest({
          secFetchSite: request.headers.get('sec-fetch-site'),
          origin: request.headers.get('origin'),
          host: request.headers.get('x-forwarded-host') ?? request.headers.get('host'),
        })
      )
        return failure('Origem não permitida.', 403)
      const actor = await account()
      if (actor instanceof NextResponse) return actor
      if (!actor)
        return failure(
          'Entre com a própria conta do responsável ou do aluno adulto para continuar.',
          403,
        )
      if (Number(request.headers.get('content-length') || 0) > 16384)
        return failure('Pedido muito grande.', 413)
      const parsed = bodySchema.safeParse(await request.json().catch(() => null))
      if (!parsed.success) return failure('Pedido inválido.', 400)
      const input = parsed.data
      if (input.action === 'inspect' && !input.checkoutId) {
        // Recuperar uma operação própria precede regras de NOVAS vendas e a leitura
        // do bloco/card atual. Não cria lead nem inicia pagamento.
        const recovered = await deps.gateway.gatewayFetchHmac<Record<string, unknown>>(
          '/funnel/internal/commerce/recover',
          { method: 'POST', body: { account: actor, origin: input.origin } },
        )
        if (recovered.status === 200 && recovered.body) {
          const recoveredOffer = CommerceCatalogOfferSchema.safeParse(recovered.body.offer)
          if (!recoveredOffer.success || recoveredOffer.data.product.audience !== deps.audience)
            return failure('Não foi possível conferir sua compra em andamento. Tente novamente.')
          const cardConfig = await deps.payments.getCardConfig()
          return NextResponse.json(
            {
              ...recovered.body,
              mode: 'purchase',
              config: {
                kind: 'purchase',
                offerRef: recoveredOffer.data.slug,
              },
              ...(cardConfig.status === 200 ? { cardConfig: cardConfig.body } : {}),
            },
            { headers: { 'cache-control': 'no-store' } },
          )
        }
        if (recovered.status !== 404)
          return failure('Não foi possível conferir sua compra em andamento. Tente novamente.')
      }
      if (
        input.checkoutId &&
        (input.action === 'inspect' ||
          input.action === 'status' ||
          (input.action === 'pay' && input.data?.resume === true))
      ) {
        // A conta pode consultar/retomar uma compra própria já iniciada mesmo que o bloco
        // saia da aula ou a oferta seja pausada. O serviço confere dono e tentativa gravada.
        const response = await deps.gateway.gatewayFetchHmac(
          `/funnel/internal/commerce/${input.action === 'inspect' ? 'status' : input.action}`,
          {
            method: 'POST',
            body: {
              account: actor,
              origin: input.origin,
              checkoutId: input.checkoutId,
              data: input.data,
            },
          },
        )
        const cardConfig = input.action === 'inspect' ? await deps.payments.getCardConfig() : null
        return NextResponse.json(
          {
            ...(response.body as object),
            ...(response.status === 200 ? { mode: 'purchase' } : {}),
            ...(cardConfig?.status === 200 ? { cardConfig: cardConfig.body } : {}),
          },
          { status: response.status, headers: { 'cache-control': 'no-store' } },
        )
      }
      const source = await originConfig(input.origin, actor)
      if (source === 'unavailable')
        return failure('Não foi possível consultar esta oferta. Tente novamente.')
      if (!source) return failure('Esta oferta não está disponível neste local.', 404)
      const { config } = source
      if (config.kind === 'gift') {
        if (input.action !== 'inspect' && input.action !== 'redeem')
          return failure('Ação inválida.', 400)
        const body = {
          account: actor,
          code: config.campaignCode,
          originKind: input.origin.kind,
          originId:
            input.origin.kind === 'lesson'
              ? input.origin.lessonId
              : input.origin.kind === 'promotion'
                ? input.origin.offerRef
                : 'community',
          ...(input.origin.kind === 'lesson' ? { blockId: input.origin.blockId } : {}),
        }
        const inspected = await deps.gateway.gatewayFetchHmac<{
          gift?: ReferralGiftOfferView
          state?: string
        }>('/referrals/internal/member-gifts', {
          method: 'POST',
          body: { ...body, action: 'inspect' },
        })
        if (inspected.status !== 200 || !inspected.body?.gift)
          return NextResponse.json(inspected.body, { status: inspected.status })
        if (source.expectedOfferId && inspected.body.gift.offerId !== source.expectedOfferId)
          return failure('A campanha está vinculada a outra oferta.', 409)
        const gift = inspected.body.gift
        if (gift.courseSlug && (input.action === 'inspect' || input.action === 'redeem')) {
          const access = await deps.gateway.gatewayFetch<{ items: CommerceAccess[] }>(
            '/members/commerce/access',
          )
          if (
            access.status !== 200 ||
            !Array.isArray(access.body?.items) ||
            access.body.items.some((entry) => !entry.accessType)
          )
            return failure('Não foi possível conferir seus acessos agora. Tente novamente.')
          if (giftAlreadyIncluded(access.body.items, gift.courseSlug, deps.audience))
            return NextResponse.json(
              {
                mode: 'included',
                courseTitle: gift.courseTitle || gift.offerTitle,
                continueUrl:
                  deps.audience === 'kids' && gift.learner === 'child'
                    ? '/pais/familia'
                    : `${deps.audience === 'kids' ? '/pais' : ''}/cursos/${encodeURIComponent(gift.courseSlug)}`,
                message:
                  'Este curso já faz parte do seu acesso. Vocês podem começar sem ativar o presente.',
              },
              { headers: { 'cache-control': 'no-store' } },
            )
        }
        if (input.action === 'inspect')
          return NextResponse.json(
            { ...inspected.body, mode: 'gift', config },
            { headers: { 'cache-control': 'no-store' } },
          )
        const redeemed = await deps.gateway.gatewayFetchHmac('/referrals/internal/member-gifts', {
          method: 'POST',
          body: { ...body, action: 'redeem' },
        })
        return NextResponse.json(redeemed.body, {
          status: redeemed.status,
          headers: { 'cache-control': 'no-store' },
        })
      }
      const base = await offer(config.offerRef)
      if (!base) return failure('Não foi possível consultar esta oferta.')
      let target = base
      if (input.offerRef && input.offerRef !== base.slug) {
        // Trocar de plano: só a irmã do alternador, do mesmo produto e do mesmo público.
        const chosen = await offer(input.offerRef)
        if (!chosen || !siblingOffers(base, chosen))
          return failure('Este plano não está disponível aqui.', 404)
        target = chosen
      }
      let plans: CommerceCatalogOffer[] | undefined
      if (input.action === 'inspect') {
        const otherSlug = target.id === base.id ? base.content?.altOffer?.slug : base.slug
        const other =
          otherSlug && otherSlug !== target.slug
            ? target.id === base.id
              ? await offer(otherSlug)
              : base
            : null
        if (other?.isAvailable && siblingOffers(target, other)) plans = [target, other]
      }
      if (input.action === 'inspect' || input.action === 'pay' || input.action === 'restart') {
        const decision = await eligibility(target)
        if (!decision)
          return failure('Não foi possível conferir seus acessos e assinaturas. Tente novamente.')
        if (decision.kind === 'manage')
          return NextResponse.json({
            mode: 'manage',
            manageUrl: deps.audience === 'kids' ? '/pais/conta' : '/compras',
            message: 'Você já tem acesso ou uma assinatura deste produto.',
          })
      }
      const response = await deps.gateway.gatewayFetchHmac(
        `/funnel/internal/commerce/${input.action}`,
        {
          method: 'POST',
          body: {
            account: actor,
            origin: input.origin,
            offerRef: target.slug,
            checkoutId: input.checkoutId,
            place: placeFor(input.origin, input.place),
            data: input.data,
          },
        },
      )
      if (response.status !== 200 || input.action === 'quote')
        return NextResponse.json(response.body, {
          status: response.status,
          headers: { 'cache-control': 'no-store' },
        })
      const cardConfig = input.action === 'inspect' ? await deps.payments.getCardConfig() : null
      return NextResponse.json(
        {
          ...(response.body as object),
          mode: 'purchase',
          config,
          ...(plans ? { plans } : {}),
          ...(cardConfig?.status === 200 ? { cardConfig: cardConfig.body } : {}),
        },
        { headers: { 'cache-control': 'no-store' } },
      )
    },
  }
  /** O outro plano da assinatura (mensal ou anual) para a linha de preço do cartão. */
  async function plansOf(target: CommerceCatalogOffer) {
    const slug = target.content?.altOffer?.slug
    const other = slug ? await offer(slug) : null
    return other?.isAvailable && siblingOffers(target, other) ? [target, other] : undefined
  }
  const commercePromotions = {
    GET: async () => {
      const actor = await account()
      if (actor instanceof NextResponse) return actor
      if (!actor) return failure('Conta adulta necessária.', 403)
      const result = await deps.gateway.gatewayFetch<{ items: unknown[] }>(
        '/catalog/member-promotions',
        { query: { audience: deps.audience } },
      )
      if (result.status !== 200 || !Array.isArray(result.body?.items))
        return failure('Não foi possível consultar as ofertas.')
      const items: PromotionCardView[] = []
      for (const raw of result.body.items) {
        const parsed = CommerceCatalogOfferSchema.safeParse(raw)
        if (!parsed.success || parsed.data.product.audience !== deps.audience) continue
        const target = parsed.data
        const promotion = target.content?.memberPromotion
        if (!promotion?.enabled || promotion.location !== 'parent_home') continue
        const decision =
          promotion.mode === 'purchase' ? await eligibility(target) : { kind: 'gift' }
        if (!decision) continue
        items.push({
          offerRef: target.slug,
          promotion,
          decision,
          ...(promotion.mode === 'purchase'
            ? { offer: target, plans: isSubscription(target) ? await plansOf(target) : undefined }
            : {}),
        })
      }
      if (
        !result.body.items.some((raw) => {
          const p = CommerceCatalogOfferSchema.safeParse(raw)
          return (
            p.success &&
            p.data.content?.memberPromotion?.enabled &&
            p.data.content.memberPromotion.location === 'parent_home' &&
            p.data.content.memberPromotion.mode === 'purchase'
          )
        })
      ) {
        const current = await deps.gateway.gatewayFetchHmac<{ offer: unknown }>(
          '/funnel/internal/commerce/default-offer',
          { method: 'POST', body: { account: actor, origin: { kind: 'community' } } },
        )
        const parsed = CommerceCatalogOfferSchema.safeParse(current.body?.offer)
        if (
          current.status === 200 &&
          parsed.success &&
          parsed.data.product.audience === deps.audience &&
          (!parsed.data.content?.memberPromotion ||
            (parsed.data.content.memberPromotion.enabled &&
              parsed.data.content.memberPromotion.location === 'parent_home'))
        ) {
          const target = parsed.data
          const decision = await eligibility(target)
          // O destaque da Comunidade na Início dos pais (Canvas "pais-inicio", 25/11/2026).
          if (decision)
            items.push({
              origin: { kind: 'community' as const },
              offerRef: target.slug,
              promotion: {
                enabled: true,
                mode: 'purchase' as const,
                location: 'parent_home' as const,
                ...(deps.audience === 'kids'
                  ? {
                      title: 'Seus filhos também podem criar os próprios jogos',
                      description:
                        'Na Comunidade dos Criadores, crianças e adolescentes de 5 a 17 anos aprendem a criar jogos, com aulas, o Estúdio e a nossa equipe por perto. E você fica com todos os cursos para pais.',
                      buttonLabel: 'Assinar a Comunidade',
                      // A ilustração da criança criando um jogo (`public/ilustra` do app Kids).
                      imageUrl: '/ilustra/criando.webp',
                    }
                  : {
                      title: target.name,
                      description: 'Aulas, ferramentas e acompanhamento para continuar criando.',
                      buttonLabel: 'Assinar a comunidade',
                    }),
              },
              decision,
              offer: target,
              plans: await plansOf(target),
            })
        }
      }
      return NextResponse.json(
        {
          items: items.map((item) => ({
            ...item,
            decision: {
              ...item.decision,
              manageUrl: deps.audience === 'kids' ? '/pais/conta' : '/compras',
            },
          })),
        },
        { headers: { 'cache-control': 'no-store' } },
      )
    },
  }
  const commercePending = {
    GET: async () => {
      const actor = await account()
      if (actor instanceof NextResponse) return actor
      if (!actor) return failure('Conta adulta necessária.', 403)
      const result = await deps.gateway.gatewayFetchHmac('/funnel/internal/commerce/pending', {
        method: 'POST',
        body: { account: actor, origin: { kind: 'community' } },
      })
      const parsed = z
        .object({
          items: z.array(
            z.object({ checkoutId: z.uuid(), origin: CommerceOriginSchema, title: z.string() }),
          ),
        })
        .safeParse(result.body)
      if (result.status !== 200 || !parsed.success)
        return failure('Não foi possível conferir suas compras em andamento.')
      return NextResponse.json(parsed.data, { headers: { 'cache-control': 'no-store' } })
    },
  }
  return { commerce, commercePromotions, commercePending }
}
