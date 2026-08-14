// Funil "Comunidade dos Criadores" (kids, /kids/comunidade-dos-criadores) — a
// ASSINATURA da plataforma inteira (mensal R$ 97 / anual R$ 797). SEM quiz: o
// funil é oferta → checkout → obrigado (quiz/resultado dão 404 pelos steps).
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
  seoTitle: 'Comunidade dos Criadores | De jogar a criar: jogos que ficam',
  seoDescription:
    'A assinatura pra criança de 9 a 14 anos que vive em jogo, computador e tecnologia criar os próprios jogos: cursos com professor acompanhando, jogos publicados com link de verdade e uma comunidade segura e moderada. Comunicação dirigida aos pais.',
  theme: 'kids',
  // Assinatura: sem o disclaimer de acesso vitalício no rodapé.
  lifetimeAccess: false,
  steps: { quiz: false, resultado: false, upsell: false, downsell: false },
  content: {
    copy: COMUNIDADE_PRODUTO,
    landing: COMUNIDADE_LANDING,
    // sem `sales`: a página de vendas tem layout próprio (ComunidadeOfertaBody.astro).
    obrigado: COMUNIDADE_OBRIGADO,
    // sem quiz/hero/result: funil sem quiz entra direto na oferta.
  },
}
