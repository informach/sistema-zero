import { TERMOS_DESAFIO } from '../../content/legal/termos-desafio'
import type { FunnelDef } from '../registry'
import { DESAFIO_CHECKOUT, DESAFIO_LANDING, DESAFIO_OBRIGADO, DESAFIO_PRODUTO } from './content'
import { DESAFIO_PERFIL_LABELS, DESAFIO_QUIZ } from './quiz'

export const DESAFIO_PRIMEIRO_JOGO: FunnelDef = {
  audience: 'kids',
  produto: 'desafio-primeiro-jogo',
  key: 'kids/desafio-primeiro-jogo',
  basePath: '/kids/desafio-primeiro-jogo',
  productName: 'Desafio do Primeiro Jogo',
  productSku: 'desafio-primeiro-jogo',
  imagesBase: '/img/desafio-primeiro-jogo',
  checkoutImage: 'farol-capa.webp',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: 'Desafio do Primeiro Jogo | Sistema Zero',
  seoDescription:
    'Seu filho programa A Chave do Farol na plataforma do Sistema Zero Kids: aulas gravadas com o Estúdio ao lado, ajuda por mensagens e Mural completo por 30 dias. Para 9 a 17 anos, e para menores de 9 criando junto com um adulto. Pagamento único, sem assinatura.',
  theme: 'kids',
  lifetimeAccess: false,
  offerContract: {
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    guaranteeDays: 7,
  },
  steps: { quiz: true, resultado: true, upsell: false, downsell: false },
  legal: { termos: TERMOS_DESAFIO, termsVersion: 'desafio-2026-10-21' },
  content: {
    copy: DESAFIO_PRODUTO,
    landing: DESAFIO_LANDING,
    obrigado: DESAFIO_OBRIGADO,
    checkout: DESAFIO_CHECKOUT,
    quiz: DESAFIO_QUIZ,
    result: { profiles: {}, fecho: '', perfilLabels: DESAFIO_PERFIL_LABELS },
  },
}
