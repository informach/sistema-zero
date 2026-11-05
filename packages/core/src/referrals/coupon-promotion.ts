import type { CampaignCouponView, GiftAudience } from './index'

export function campaignCouponPromotion(coupon: CampaignCouponView, audience: GiftAudience) {
  const discount =
    coupon.percentOff !== null
      ? `${coupon.percentOff}%`
      : ((coupon.amountOffCents ?? 0) / 100).toLocaleString('pt-BR', {
          style: 'currency',
          currency: coupon.currency,
        })
  const lastDay = new Date(Date.parse(coupon.endsAt) - 1).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })
  const firstDay = new Date(coupon.startsAt).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })
  const duration =
    coupon.accessMode === 'fixed' && coupon.accessDurationValue
      ? ` Acesso por ${coupon.accessDurationValue} ${coupon.accessDurationUnit === 'days' ? 'dias' : 'meses'} a partir do pagamento.`
      : coupon.accessMode === 'billing_cycle'
        ? ' Desconto só na primeira cobrança. Renovações pelo preço normal.'
        : ''
  return {
    url: coupon.shareUrl,
    title: `${discount} de desconto`,
    subtitle: audience === 'kids' ? 'Kids · para crianças' : 'Adultos · 18 anos ou mais',
    description: `${coupon.offerName}. Use o cupom ${coupon.code}.${duration}`,
    notice: `Válido de ${firstDay} a ${lastDay}, até 23h59 (Brasília).${audience === 'kids' ? ' Compra pelo responsável.' : ''}`,
  }
}
