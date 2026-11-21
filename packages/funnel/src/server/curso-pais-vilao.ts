// O que a página `/kids/vilao-em-aliado` mostra, a partir da campanha do curso no referrals.
// Função pura sobre o gateway (testável com o fake): decide se o formulário abre e, se não, qual
// estado aparece no lugar. Falha fechada: o cadastro só abre quando a campanha é Kids, está ativa e
// entrega exatamente o curso para pais desta página.
import type { ReferralGiftOfferView } from '@sistemazero/core/referrals'
import {
  CODIGO_DA_CAMPANHA,
  CURSO_PAIS_VILAO,
  CURSO_PAIS_VILAO_SLUG,
} from '../content/curso-pais-vilao'
import type { EstadoPresente } from '../content/presente'
import type { GatewayClient } from '../lib/gateway-client'
import { giftVariant, resolveReferralGiftPage } from './referral-gift-page'

export interface CursoPaisVilaoView {
  copy: typeof CURSO_PAIS_VILAO
  ready: boolean
  resgate?: {
    code: string
    referrerName: string
    communityUrl: string
    campaign: boolean
    gift: ReferralGiftOfferView
  }
  estado?: EstadoPresente
  podeRetomar: boolean
}

export async function cursoPaisVilaoView(
  gateway: Pick<GatewayClient, 'resolveReferralCode'>,
  kidsCommunityUrl: string,
): Promise<CursoPaisVilaoView> {
  const copy = CURSO_PAIS_VILAO
  const emBreve: CursoPaisVilaoView = {
    copy,
    ready: false,
    estado: copy.estados.emBreve,
    podeRetomar: false,
  }
  const page = await resolveReferralGiftPage(gateway, CODIGO_DA_CAMPANHA)
  if (!('gift' in page)) return emBreve
  const oferta = page.gift.gift
  if (
    !oferta ||
    page.audience !== 'kids' ||
    giftVariant(oferta, page.audience) !== 'pais' ||
    oferta.courseSlug !== CURSO_PAIS_VILAO_SLUG
  )
    return emBreve
  const resgate = {
    code: page.gift.code,
    referrerName: page.gift.source.name,
    communityUrl: kidsCommunityUrl.replace(/\/$/, ''),
    campaign: page.gift.source.kind === 'campaign',
    gift: oferta,
  }
  if (page.kind === 'ready') return { copy, ready: true, resgate, podeRetomar: false }
  const fechado = page.kind === 'paused' || page.kind === 'ended'
  return {
    copy,
    ready: false,
    resgate,
    estado: fechado ? copy.estados.fechado : copy.estados.emBreve,
    podeRetomar: fechado,
  }
}
