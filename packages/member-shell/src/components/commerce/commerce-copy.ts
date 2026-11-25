import type { CommerceCatalogOffer } from '@sistemazero/core/commerce'

/**
 * As frases do mini checkout e dos cartões de venda (Canvas "pais-checkout", 25/11/2026). Tudo
 * que é número vem da oferta do catálogo: preço, intervalo, garantia, prazo e perfis. Nada de
 * valor escrito à mão, nada de acesso vitalício prometido.
 */
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100)

export const isRecurring = (offer: CommerceCatalogOffer) => offer.pricingMode === 'subscription'

/** "por mês", "por ano" ou "a cada N meses"; compra avulsa não tem intervalo. */
export function intervalText(offer: CommerceCatalogOffer): string {
  if (!isRecurring(offer)) return ''
  const months = offer.billingIntervalMonths
  if (months === 1) return 'por mês'
  if (months === 12) return 'por ano'
  return `a cada ${months} meses`
}

/** O nome do plano no resumo e nos cartões de escolha. */
export function planName(offer: CommerceCatalogOffer): string {
  const months = offer.billingIntervalMonths
  if (months === 1) return 'Plano mensal'
  if (months === 12) return 'Plano anual'
  return `Plano a cada ${months} meses`
}

export function planShortName(offer: CommerceCatalogOffer): string {
  const months = offer.billingIntervalMonths
  if (months === 1) return 'Mensal'
  if (months === 12) return 'Anual'
  return `A cada ${months} meses`
}

/** Só o anual (ou outro intervalo de 12) pode ser pago à vista no Pix. */
export const pixAllowed = (offer: CommerceCatalogOffer) =>
  !isRecurring(offer) || offer.billingIntervalMonths === 12

/** A linha de renovação do resumo, pela forma de pagamento escolhida. */
export function renewalText(offer: CommerceCatalogOffer, method: 'pix' | 'card'): string {
  if (!isRecurring(offer)) return 'Pagamento único, sem assinatura.'
  if (method === 'pix') return 'Pagamento à vista, sem renovação automática.'
  const months = offer.billingIntervalMonths
  const cancel = `Você cancela ${offer.product.audience === 'kids' ? 'em Conta' : 'em Compras'}.`
  if (months === 1) return `Renova todo mês no cartão. ${cancel}`
  if (months === 12) return `Renova a cada ano no cartão. ${cancel}`
  return `Renova a cada ${months} meses no cartão. ${cancel}`
}

/** O prazo de uma compra avulsa ("Acesso por 1 ano"). Sem prazo fixo, nada é dito. */
export function accessText(offer: CommerceCatalogOffer): string | null {
  if (isRecurring(offer) || offer.accessMode !== 'fixed' || !offer.accessDurationValue) return null
  const n = offer.accessDurationValue
  if (offer.accessDurationUnit === 'months')
    return n === 12 ? 'Acesso por 1 ano' : `Acesso por ${n} ${n === 1 ? 'mês' : 'meses'}`
  return `Acesso por ${n} ${n === 1 ? 'dia' : 'dias'}`
}

export function guaranteeText(offer: CommerceCatalogOffer): string | null {
  const days = offer.guaranteeDays
  if (!days || days <= 0) return null
  const prazo = `${days} ${days === 1 ? 'dia' : 'dias'}`
  return isRecurring(offer)
    ? `Garantia de ${prazo}: se não fizer sentido para a família, devolvemos o valor.`
    : `${prazo} de garantia: se não fizer sentido, devolvemos o valor.`
}

/** O limite de perfis vem da oferta (`content.maxProfiles`), nunca de um número fixo. */
export function profilesText(offer: CommerceCatalogOffer): string | null {
  const max = offer.content?.maxProfiles
  if (!max || max < 1 || offer.product.audience !== 'kids') return null
  return max === 1
    ? 'Um perfil de criança na conta.'
    : `Até ${max} perfis de criança na mesma conta, um para cada filho.`
}

/** Quanto o anual economiza diante de 12 mensalidades; sem economia de verdade, nada. */
export function annualSavingsCents(plans: readonly CommerceCatalogOffer[]): number | null {
  const monthly = plans.find((p) => isRecurring(p) && p.billingIntervalMonths === 1)
  const annual = plans.find((p) => isRecurring(p) && p.billingIntervalMonths === 12)
  if (!monthly || !annual) return null
  const savings = monthly.priceCents * 12 - annual.priceCents
  return savings > 0 ? savings : null
}

/**
 * O plano anual dividido por 12, arredondado para CIMA: 12 vezes o "por mês" nunca dá menos do que
 * o anual cobra.
 */
export const perMonthCents = (offer: CommerceCatalogOffer) =>
  Math.ceil(offer.priceCents / (offer.billingIntervalMonths || 1))

/** Os produtos da Comunidade dos Criadores (Kids e adulta), pelo SKU do catálogo. */
export const COMMUNITY_PRODUCT_SKUS: readonly string[] = [
  'comunidade-dos-criadores',
  'comunidade-dos-criadores-adulto',
]

/** Só a Comunidade fala dos cursos, do Estúdio e do Mural; outra assinatura fala só dela. */
export const isCommunityProduct = (offer: CommerceCatalogOffer) =>
  COMMUNITY_PRODUCT_SKUS.includes(offer.product.sku)

/** Curso pelo tipo do catálogo; sem o tipo (resposta antiga), não chama de curso. */
export const isCourseProduct = (offer: CommerceCatalogOffer) => offer.product.kind === 'course'

/** O rótulo da linha do preço numa compra avulsa ("Curso" ou, fora de curso, "Produto"). */
export const oneTimeItemLabel = (offer: CommerceCatalogOffer) =>
  isCourseProduct(offer) ? 'Curso' : 'Produto'

/** O título da janela de compra. */
export function purchaseDialogTitle(offer: CommerceCatalogOffer): string {
  if (isRecurring(offer))
    return isCommunityProduct(offer) ? `Assinar a ${offer.product.name}` : 'Fazer a assinatura'
  return isCourseProduct(offer) ? 'Comprar o curso' : 'Finalizar a compra'
}

/** O texto do botão de pagar, com o valor de hoje (o cotado com cupom, quando houver). */
export function payButtonText(
  offer: CommerceCatalogOffer,
  method: 'pix' | 'card',
  totalCents: number,
): string {
  if (!isRecurring(offer)) return method === 'pix' ? 'Gerar o Pix' : 'Pagar com cartão'
  if (method === 'pix') return `Gerar o Pix de ${money(totalCents)}`
  const months = offer.billingIntervalMonths
  const when = months === 1 ? 'ao mês' : months === 12 ? 'ao ano' : `a cada ${months} meses`
  return `Assinar por ${money(totalCents)} ${when}`
}

/** Onde a pessoa confere compras e assinaturas em cada app. */
export const accountPlace = (audience: 'kids' | 'adult') =>
  audience === 'kids' ? 'em Conta, em Compras em andamento' : 'em Compras'
