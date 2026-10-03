import type { FunnelDef } from '../registry'
import { DESAFIO_LANDING, DESAFIO_OBRIGADO, DESAFIO_PRODUTO } from './content'
import { DESAFIO_PERFIL_LABELS, DESAFIO_QUIZ } from './quiz/definition'

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
    'Seu filho aprende a programar A Chave do Farol. Para 9 a 14 anos, com aulas gravadas, prática integrada e 30 dias de acesso ao curso e ao Mural completo. Pagamento único.',
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
  content: {
    copy: DESAFIO_PRODUTO,
    landing: DESAFIO_LANDING,
    obrigado: DESAFIO_OBRIGADO,
    quiz: DESAFIO_QUIZ,
    result: { profiles: {}, fecho: '', perfilLabels: DESAFIO_PERFIL_LABELS },
  },
}
