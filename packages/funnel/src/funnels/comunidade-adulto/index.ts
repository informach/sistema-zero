// Funil adulto "Comunidade dos Criadores" (`pro/comunidade-dos-criadores`, 20/10/2026): a
// assinatura da área adulta, com quiz opcional e resultado em conversa. A oferta tem layout PRÓPRIO
// (ComunidadeAdultoOfertaBody, tema arcade); a /oferta
// despacha pelo body deste funil via `f.key`.
//
// Oferta no catálogo: env `FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES` aponta a oferta MENSAL
// (`comunidade-dos-criadores-adulto-mensal`, criada pelo seed do catálogo); a ANUAL é a irmã
// ligada por `altOffer` (alternador do checkout). A landing `/pro` abre esta Comunidade.

import { TERMOS_COMUNIDADE_ADULTO } from '../../content/legal/termos-comunidade-adulto'
import type { FunnelDef } from '../registry'
import {
  COMUNIDADE_ADULTO_CHECKOUT,
  COMUNIDADE_ADULTO_LANDING,
  COMUNIDADE_ADULTO_OBRIGADO,
  COMUNIDADE_ADULTO_PRODUTO,
} from './content'
import { PAGINA_ADULTO } from './oferta/pagina'
import { ADULT_PROFILE_LABELS, COMUNIDADE_ADULTO_QUIZ } from './quiz'

export const COMUNIDADE_ADULTO: FunnelDef = {
  audience: 'pro',
  produto: 'comunidade-dos-criadores',
  key: 'pro/comunidade-dos-criadores',
  basePath: '/pro/comunidade-dos-criadores',
  productName: 'Comunidade dos Criadores',
  chargeName: 'Comunidade dos Criadores (adultos)',
  productSku: 'comunidade-dos-criadores-adulto',
  imagesBase: '/img/comunidade-adulto',
  checkoutImage: 'checkout-capa.webp',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: PAGINA_ADULTO.seoTitle,
  seoDescription: PAGINA_ADULTO.description,
  // `.theme-arcade` no <html>: tokens `--cda-*` e mapeamento semântico em global.css.
  theme: 'arcade',
  // Assinatura: sem o disclaimer de acesso vitalício no rodapé.
  lifetimeAccess: false,
  steps: { quiz: true, resultado: true, upsell: false, downsell: false },
  legal: { termos: TERMOS_COMUNIDADE_ADULTO, termsVersion: 'comunidade-adulto-2026-10-20' },
  content: {
    copy: COMUNIDADE_ADULTO_PRODUTO,
    landing: COMUNIDADE_ADULTO_LANDING,
    // sem `sales`: a página de vendas tem layout próprio (ComunidadeAdultoOfertaBody.astro).
    obrigado: COMUNIDADE_ADULTO_OBRIGADO,
    checkout: COMUNIDADE_ADULTO_CHECKOUT,
    quiz: COMUNIDADE_ADULTO_QUIZ,
    result: { profiles: {}, fecho: '', perfilLabels: ADULT_PROFILE_LABELS },
  },
}
