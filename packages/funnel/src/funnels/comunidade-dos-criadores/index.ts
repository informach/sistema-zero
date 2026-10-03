// Funil "Comunidade dos Criadores" (kids, /kids/comunidade-dos-criadores) — a
// ASSINATURA da plataforma inteira, com quiz opcional de orientação familiar.
// A oferta tem layout PRÓPRIO (ComunidadeOfertaBody) → `content.sales` ausente
// de propósito; a /oferta despacha pelo body deste funil via `f.key`.
//
// Oferta no catálogo: env `FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES` aponta a
// oferta MENSAL (`comunidade-dos-criadores-mensal`); a ANUAL é a irmã ligada por
// `content.altOffer` (alternador do checkout). Se um dia a env apontar pra anual,
// a página se auto-normaliza por `billingIntervalMonths`, mas o preço estrutural
// (JSON-LD/og) passa a ser o anual — preferir a mensal como principal.

import type { FunnelDef } from '../registry'
import { COMUNIDADE_LANDING, COMUNIDADE_OBRIGADO, COMUNIDADE_PRODUTO } from './content'
import { PAGE_A } from './oferta/tempo-de-tela'
import { COMMUNITY_QUIZ } from './quiz'
import { PROFILE_IDS } from './quiz/engine'
import { PRIMARY_COPY } from './quiz/result-copy'

export const COMUNIDADE_DOS_CRIADORES: FunnelDef = {
  audience: 'kids',
  produto: 'comunidade-dos-criadores',
  key: 'kids/comunidade-dos-criadores',
  basePath: '/kids/comunidade-dos-criadores',
  productName: 'Comunidade dos Criadores',
  productSku: 'comunidade-dos-criadores',
  imagesBase: '/img/comunidade-dos-criadores',
  // Capa dedicada (card do checkout + og:image + JSON-LD): a arte "Corre, Dino!".
  checkoutImage: 'checkout-capa.webp',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: PAGE_A.seoTitle,
  seoDescription: PAGE_A.description,
  theme: 'kids',
  // Assinatura: sem o disclaimer de acesso vitalício no rodapé.
  lifetimeAccess: false,
  steps: { quiz: true, resultado: true, upsell: false, downsell: false },
  content: {
    copy: COMUNIDADE_PRODUTO,
    landing: COMUNIDADE_LANDING,
    // sem `sales`: a página de vendas tem layout próprio (ComunidadeOfertaBody.astro).
    obrigado: COMUNIDADE_OBRIGADO,
    quiz: COMMUNITY_QUIZ,
    result: {
      profiles: {},
      fecho: '',
      perfilLabels: Object.fromEntries(
        Object.entries(PROFILE_IDS).map(([id, slug]) => [slug, PRIMARY_COPY[id]!.title]),
      ),
    },
  },
}
