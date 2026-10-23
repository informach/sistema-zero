// Funil "Comunidade dos Criadores" (kids, /kids/comunidade-dos-criadores) — a
// ASSINATURA da plataforma inteira, com quiz opcional de orientação familiar.
// As ofertas têm layout PRÓPRIO (Comunidade917Body, ComunidadeMenor9Body e
// ComunidadeContinuarBody) com body próprio; a /oferta despacha pelo body
// deste funil via `f.key`.
//
// Oferta no catálogo: env `FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES` aponta a
// oferta MENSAL (`comunidade-dos-criadores-mensal`); a ANUAL é a irmã ligada por
// `content.altOffer` (alternador do checkout). Se um dia a env apontar pra anual,
// a página se auto-normaliza por `billingIntervalMonths`, mas o preço estrutural
// (JSON-LD/og) passa a ser o anual — preferir a mensal como principal.

import { TERMOS_COMUNIDADE_KIDS } from '../../content/legal/termos-comunidade-kids'
import type { FunnelDef } from '../registry'
import {
  COMUNIDADE_CHECKOUT,
  COMUNIDADE_LANDING,
  COMUNIDADE_OBRIGADO,
  COMUNIDADE_PRODUTO,
} from './content'
import { PAGINA_9A17 } from './oferta/pagina-9a17'
import { COMMUNITY_QUIZ } from './quiz'
import { PROFILE_IDS, PROFILE_IDS_M9 } from './quiz/engine'
import { PROFILE_LABELS_9A17 } from './quiz/result-copy-9a17'
import { PROFILE_LABELS_M9 } from './quiz/result-copy-m9'

/** Os perfis da v5 (até 20/10/2026): a aba Perfis os mostra quando há leads com eles. */
const PERFIS_V5: Record<string, string> = {
  'tempo-de-tela': 'Tempo de tela',
  'criacao-de-jogos': 'Criação de jogos',
  'expressao-visual': 'Desenho e personagens',
  'formacao-tecnologica': 'Programação',
  'habilidades-escolares': 'Habilidades escolares',
}

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
  // SEO da página principal (9 a 17 anos, `/oferta`).
  seoTitle: PAGINA_9A17.seoTitle,
  seoDescription: PAGINA_9A17.description,
  theme: 'kids',
  // Assinatura: sem o disclaimer de acesso vitalício no rodapé.
  lifetimeAccess: false,
  steps: { quiz: true, resultado: true, upsell: false, downsell: false },
  legal: { termos: TERMOS_COMUNIDADE_KIDS, termsVersion: 'comunidade-kids-2026-10-20b' },
  content: {
    copy: COMUNIDADE_PRODUTO,
    landing: COMUNIDADE_LANDING,
    // sem `sales`: as páginas de vendas têm layout próprio (Comunidade917Body e irmãs).
    obrigado: COMUNIDADE_OBRIGADO,
    checkout: COMUNIDADE_CHECKOUT,
    quiz: COMMUNITY_QUIZ,
    result: {
      profiles: {},
      fecho: '',
      perfilLabels: {
        ...Object.fromEntries(
          Object.entries(PROFILE_IDS).map(([id, slug]) => [
            slug,
            PROFILE_LABELS_9A17[id as keyof typeof PROFILE_IDS],
          ]),
        ),
        ...Object.fromEntries(
          Object.entries(PROFILE_IDS_M9).map(([id, slug]) => [
            slug,
            PROFILE_LABELS_M9[id as keyof typeof PROFILE_IDS_M9],
          ]),
        ),
      },
      legacyPerfilLabels: PERFIS_V5,
    },
  },
}
