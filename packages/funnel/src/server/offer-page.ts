import { getFunnel } from '../funnels/registry'
import { formatBRLFromCents, formatBRLFromCents2 } from '../lib/money'
import { getActiveOffer, type OfferPlans } from './catalog'
import { resolveCouponPresentation } from './coupon-presentation'
import { getDeps } from './deps'
import { resolveOfferSlug } from './offer'
import { checkOfferContract } from './offer-contract'
import { type ReferralGiftPage, resolveReferralGiftPage } from './referral-gift-page'

/** A página da oferta no modo PRESENTE (`?presente=<código>`, 25/11/2026). */
export type OfferGiftMode = Extract<ReferralGiftPage, { gift: unknown }> & {
  gift: { gift: NonNullable<Extract<ReferralGiftPage, { gift: unknown }>['gift']['gift']> }
  /** O presente escolhido pelo embaixador (`?oferta-presente=`), repassado ao resgate. */
  chosenOffer: string | null
}

const OFFER_SLUG = /^(?=.{1,80}$)[a-z0-9]+(?:-[a-z0-9]+)*$/

const GIFT_CODE = /^[a-z0-9-]{4,32}$/

// Resolve no servidor; somente as rotas podem devolver Responses HTTP.
export async function resolveOfferPage(
  params: { audience?: string; produto?: string },
  url: URL,
  site?: URL,
) {
  // Funil resolvido pela URL (/[audience]/[produto]/oferta). Inexistente → 404.
  const f = getFunnel(params.audience, params.produto)
  if (!f) return new Response(null, { status: 404 })

  const { env, gateway, log } = getDeps()
  // Oferta vem da env do funil (FUNNEL_OFFER_<KEY>). MESMA fonte do checkout.
  const offerSlug = resolveOfferSlug(env, f.key)
  const offer = await getActiveOffer(gateway, offerSlug, { log })
  // Modo presente (uma página por CURSO, resolvido ANTES da oferta de venda: o presente só
  // depende do referrals, e a venda fora do ar não pode derrubar o resgate): o código dá de presente um curso desta página
  // (`giftCourses`), qualquer que seja a oferta do presente (a de 15 dias, a escolhida pelo
  // embaixador em `?oferta-presente=`). Presente de outro curso → `/bolsa/<código>`, que só
  // redireciona à página certa. Código inválido ou referrals fora: a venda normal.
  const presenteCode = url.searchParams.get('presente')?.trim().toLowerCase() ?? ''
  const chosenRaw = url.searchParams.get('oferta-presente')?.trim() ?? ''
  const chosenOffer = OFFER_SLUG.test(chosenRaw) ? chosenRaw : null
  let presente: OfferGiftMode | null = null
  if (GIFT_CODE.test(presenteCode)) {
    const gift = await resolveReferralGiftPage(gateway, presenteCode, chosenOffer)
    if ('gift' in gift && gift.gift.gift) {
      const course = gift.gift.gift.courseSlug
      if (course && (f.giftCourses ?? []).includes(course))
        presente = { ...gift, chosenOffer } as OfferGiftMode
      else if (course) {
        const target = new URL(`/bolsa/${presenteCode}`, url)
        if (chosenOffer) target.searchParams.set('oferta', chosenOffer)
        return new Response(null, {
          status: 302,
          headers: { location: `${target.pathname}${target.search}`, 'cache-control': 'no-store' },
        })
      }
    }
  }

  const contractCheck = checkOfferContract(f.offerContract, offer)
  // A venda fora do contrato fecha a página, mas não o PRESENTE (ele não cobra nada).
  if (!contractCheck.ok && !presente) {
    log('offer.contract_mismatch', {
      funnel: f.key,
      offerSlug,
      reason: contractCheck.reason,
      expected: contractCheck.expected,
      actual: contractCheck.actual,
    })
    return new Response('Esta oferta está temporariamente indisponível.', { status: 503 })
  }
  const productName = offer?.productName || f.productName
  // QR/link de evento aceita `?cupom=` e o alias `?coupon=`. O desconto exibido
  // existe somente depois de uma cotação autoritativa no catálogo. A própria
  // cotação também atualiza o preço cheio caso o cache visual esteja defasado.
  const coupon = await resolveCouponPresentation(gateway, offerSlug, url.searchParams)
  const priceCents =
    coupon.status === 'valid'
      ? coupon.listPriceCents
      : (offer?.priceCents ?? env.PRODUCT_PRICE_CENTS)
  const priceLabel = formatBRLFromCents2(priceCents) // "R$ 37,00" (boxes de preço)
  const priceLabelShort = formatBRLFromCents(priceCents) // "R$ 37" (botões e copy)
  const priceReais = (priceCents / 100).toFixed(2)
  const imagesBase = f.imagesBase
  const perfil = url.searchParams.get('perfil')
  // Segmento enum não-PII do desejo (P10), vindo do resultado. Só o Desafio o usa; cache
  // por-URL segue seguro (mesma classe do `perfil`: grosso, sem dado pessoal).
  const quer = url.searchParams.get('quer')
  const ofertaUrl = new URL(url.pathname, site ?? url).toString()

  // Assinatura: resolve também a oferta IRMÃ do alternador (mesmo padrão do
  // checkout.astro) pra página exibir os DOIS planos (mensal + anual) com preço
  // vivo. `plans === null` = oferta one_time OU catálogo fora do ar (o body de
  // assinatura degrada pro fallback próprio, sem `data-checkout-oferta`).
  let plans: OfferPlans | null = null
  if (offer && offer.pricingMode === 'subscription') {
    let alt: OfferPlans['alt'] = null
    if (offer.altOffer) {
      const sibling = await getActiveOffer(gateway, offer.altOffer.slug, { log })
      if (sibling && sibling.pricingMode === 'subscription' && sibling.billingIntervalMonths) {
        alt = {
          slug: sibling.slug,
          priceCents: sibling.priceCents,
          intervalMonths: sibling.billingIntervalMonths,
          label: offer.altOffer.label,
        }
      }
    }
    plans = {
      main: {
        slug: offer.slug,
        priceCents: offer.priceCents,
        intervalMonths: offer.billingIntervalMonths,
        label: null,
      },
      alt,
    }
  }

  // A política de acesso publicada pelo catálogo: as páginas que leem o prazo da própria oferta
  // (o Cadê, 25/11/2026) e a garantia. `null` com o catálogo fora (o contrato já barrou a venda).
  const access = offer
    ? {
        mode: offer.accessMode,
        durationValue: offer.accessDurationValue,
        durationUnit: offer.accessDurationUnit,
        guaranteeDays: offer.guaranteeDays,
      }
    : null

  const bodyProps = {
    f,
    offerSlug,
    access,
    productName,
    priceLabel,
    priceLabelShort,
    priceReais,
    imagesBase,
    perfil,
    quer,
    ofertaUrl,
    coupon,
    presente,
  }
  // O modo presente depende do código na URL (e do estado da campanha): nunca em cache público.
  return { bodyProps, plans, noStore: presenteCode !== '' }
}

export type OfferPageData = Exclude<Awaited<ReturnType<typeof resolveOfferPage>>, Response>
