// Funil "Desafio do Primeiro Jogo" (kids, /kids/desafio-primeiro-jogo). Monta o
// FunnelDef a partir do conteúdo (content.ts) + lógica do quiz (quiz.ts). A oferta
// tem layout PRÓPRIO (DesafioOfertaBody) → `content.sales` fica ausente de propósito;
// a /oferta despacha pelo body do Desafio quando o funil não tem `sales`.

import type { FunnelDef } from '../registry'
import {
  DESAFIO_FECHO,
  DESAFIO_HERO_PADRAO,
  DESAFIO_HERO_POR_PERFIL,
  DESAFIO_LANDING,
  DESAFIO_OBRIGADO,
  DESAFIO_PRODUTO,
  DESAFIO_QUIZ_STEPS,
  DESAFIO_RESULT_PROFILES,
  DESAFIO_TOTAL,
} from './content'
import {
  DESAFIO_PERFIL_LABELS,
  DESAFIO_VALUE_SCHEMA,
  desafioComputePerfil,
  desafioDerive,
  desafioRenderCorpo,
} from './quiz'

export const DESAFIO_PRIMEIRO_JOGO: FunnelDef = {
  audience: 'kids',
  produto: 'desafio-primeiro-jogo',
  key: 'kids/desafio-primeiro-jogo',
  basePath: '/kids/desafio-primeiro-jogo',
  catalogOfferSlug: 'desafio-primeiro-jogo',
  productName: 'Desafio do Primeiro Jogo',
  productSku: 'desafio-primeiro-jogo',
  imagesBase: '/img/desafio-primeiro-jogo',
  // Sem capa dedicada: o checkout usa a MESMA arte do hero da oferta.
  checkoutImage: 'hero-desafio.webp',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: 'Desafio do Primeiro Jogo · Seu filho cria o primeiro jogo em 3 dias',
  seoDescription:
    'Trilha guiada de 3 dias para crianças a partir de 9 anos criarem o primeiro joguinho jogável, dentro do Sistema Zero Studio. Comunicação dirigida aos pais.',
  theme: 'kids',
  steps: { quiz: true, resultado: true, upsell: false, downsell: false },
  content: {
    copy: DESAFIO_PRODUTO,
    landing: DESAFIO_LANDING,
    // sem `sales`: a página de vendas tem layout próprio (DesafioOfertaBody.astro).
    obrigado: DESAFIO_OBRIGADO,
    quiz: {
      steps: DESAFIO_QUIZ_STEPS,
      total: DESAFIO_TOTAL,
      valueSchema: DESAFIO_VALUE_SCHEMA,
      derive: desafioDerive,
      computePerfil: desafioComputePerfil,
    },
    hero: {
      padrao: DESAFIO_HERO_PADRAO,
      paragrafoComum: '',
      porPerfil: DESAFIO_HERO_POR_PERFIL,
    },
    result: {
      profiles: DESAFIO_RESULT_PROFILES,
      fecho: DESAFIO_FECHO,
      perfilLabels: DESAFIO_PERFIL_LABELS,
      renderCorpo: desafioRenderCorpo,
    },
  },
}
