// Funil adulto "Desafio do Primeiro Jogo" (`pro/desafio-primeiro-jogo`, 21/10/2026): a versão adulta
// do mesmo curso (A Chave do Farol), com a mesma oferta do Kids (decisão da dona: mesmo preço,
// mesmas condições). A /oferta escolhe o body próprio (DesafioAdultoBody, tema arcade)
// pelo `f.key`. Quiz adulto v1 em conversa (`quiz/`) com
// resultado em carta, desde 21/10/2026.
//
// Oferta no catálogo: env `FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO` aponta
// `desafio-primeiro-jogo-adulto-30-dias` (criada pelo seed do catálogo, curso
// `desafio-primeiro-jogo-adulto`). Registrado DEPOIS da Comunidade adulta: a landing `/pro`
// abre a Comunidade dos Criadores adulta.

import { TERMOS_DESAFIO_ADULTO } from '../../content/legal/termos-desafio-adulto'
import type { FunnelDef } from '../registry'
import {
  DESAFIO_ADULTO_CHECKOUT,
  DESAFIO_ADULTO_LANDING,
  DESAFIO_ADULTO_OBRIGADO,
  DESAFIO_ADULTO_PRODUTO,
} from './content'
import { PAGINA_DESAFIO_ADULTO } from './oferta/pagina'
import { DESAFIO_ADULTO_PERFIL_LABELS, DESAFIO_ADULTO_QUIZ } from './quiz'

export const DESAFIO_ADULTO: FunnelDef = {
  audience: 'pro',
  produto: 'desafio-primeiro-jogo',
  key: 'pro/desafio-primeiro-jogo',
  basePath: '/pro/desafio-primeiro-jogo',
  productName: 'Desafio do Primeiro Jogo',
  // O mesmo nome da oferta no catálogo: é por ele que Compras separa o Desafio adulto do Kids.
  chargeName: 'Desafio do Primeiro Jogo (adultos)',
  productSku: 'desafio-primeiro-jogo-adulto',
  imagesBase: '/img/desafio-primeiro-jogo',
  checkoutImage: 'farol-capa.webp',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: PAGINA_DESAFIO_ADULTO.seoTitle,
  seoDescription: PAGINA_DESAFIO_ADULTO.description,
  // `.theme-arcade` no <html>: tokens `--cda-*` e mapeamento semântico em global.css.
  theme: 'arcade',
  lifetimeAccess: false,
  // A mesma promessa rígida do Desafio Kids: página e cobrança falham fechadas se a env apontar
  // para uma oferta com outra política.
  offerContract: {
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    guaranteeDays: 7,
  },
  steps: { quiz: true, resultado: true, upsell: false, downsell: false },
  legal: { termos: TERMOS_DESAFIO_ADULTO, termsVersion: 'desafio-adulto-2026-10-21' },
  content: {
    copy: DESAFIO_ADULTO_PRODUTO,
    landing: DESAFIO_ADULTO_LANDING,
    obrigado: DESAFIO_ADULTO_OBRIGADO,
    checkout: DESAFIO_ADULTO_CHECKOUT,
    quiz: DESAFIO_ADULTO_QUIZ,
    result: { profiles: {}, fecho: '', perfilLabels: DESAFIO_ADULTO_PERFIL_LABELS },
  },
}
