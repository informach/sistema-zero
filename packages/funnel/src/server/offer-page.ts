import { getFunnel } from '../funnels/registry'
import { formatBRLFromCents, formatBRLFromCents2 } from '../lib/money'
import { getActiveOffer, type OfferPlans } from './catalog'
import { resolveCouponPresentation } from './coupon-presentation'
import { getDeps } from './deps'
import { resolveOfferSlug } from './offer'
import { checkOfferContract } from './offer-contract'

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
  const contractCheck = checkOfferContract(f.offerContract, offer)
  if (!contractCheck.ok) {
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

  const bodyProps = {
    f,
    productName,
    priceLabel,
    priceLabelShort,
    priceReais,
    imagesBase,
    perfil,
    quer,
    ofertaUrl,
    coupon,
  }
  return { bodyProps, plans }
}

export type OfferPageData = Exclude<Awaited<ReturnType<typeof resolveOfferPage>>, Response>
