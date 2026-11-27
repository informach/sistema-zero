// Funil kids do guia para pais "Transformando o vilão em aliado" (`kids/vilao-em-aliado`,
// 25/11/2026): curso pago normal, com 6 meses de acesso (27/11/2026; antes, 1 ano). A página pública `/kids/vilao-em-aliado` é a página de
// venda dele (o mesmo corpo de `/kids/vilao-em-aliado/oferta`); o presente sai pelos links de
// campanha e de embaixador, que abrem a página no modo presente (`?presente=`). Quem assiste é o
// adulto, na área dos pais do app Kids.
//
// Oferta no catálogo: a principal do produto (marcada no Admin) (a oferta de 6 meses, R$ 27, do curso
// `transformando-o-vilao-em-aliado`). Registrado por último: a landing `/kids` segue abrindo o
// Desafio.

import { TERMOS_GUIA_PAIS } from '../../content/legal/termos-guia-pais'
import type {
  FunnelCheckoutIntro,
  FunnelCopy,
  FunnelDef,
  FunnelLanding,
  FunnelObrigado,
} from '../registry'

const GUIA_PRODUTO: FunnelCopy = {
  nome: 'Transformando o vilão em aliado',
  precoLabel: 'R$ 27',
  artigo: 'o',
}

// Exigida pelo tipo FunnelContent (este funil não tem quiz nem landing genérica).
const GUIA_LANDING: FunnelLanding = {
  h1: 'A tela que hoje vira briga em casa pode ser sua aliada no desenvolvimento do seu filho.',
  subtitulo:
    'No guia Transformando o vilão em aliado, a Helena, mãe e profissional de tecnologia, mostra como usar o tempo de tela que o seu filho já tem para ele aprender a planejar, seguir um passo a passo e lidar com o erro.',
  tempo: '',
}

const GUIA_CHECKOUT: FunnelCheckoutIntro = {
  titulo: 'Falta pouco para a primeira aula do guia',
  paragrafos: [
    'Revise o valor, informe os seus dados e escolha a forma de pagamento. Depois da aprovação, o guia aparece na área dos pais, em Cursos para pais.',
  ],
}

const GUIA_OBRIGADO: FunnelObrigado = {
  titulo: 'Seu guia está confirmado.',
  intro: 'O próximo passo é abrir a primeira aula na área dos pais.',
  acesso:
    'Se já tem conta no Sistema Zero Kids, entre como responsável com seu acesso habitual. No primeiro acesso, siga as instruções enviadas ao e-mail da compra para criar a senha.',
  passosTitulo: 'Os primeiros passos',
  botao: 'Entrar na área dos pais →',
  entrega: [
    'Transformando o vilão em aliado: 7 aulas curtas em vídeo.',
    'Apostila para consultar e certificado no final.',
    'O guia fica na sua conta pelo prazo contratado, contado da aprovação do pagamento.',
    'Pagamento único, sem assinatura.',
  ],
  passos: [
    {
      titulo: 'Entre com o e-mail da compra',
      texto:
        'No primeiro acesso, siga as instruções para criar sua senha. Confira também a caixa de spam.',
    },
    {
      titulo: 'Abra Cursos para pais',
      texto: 'Na área dos pais, o guia aparece no menu Cursos para pais.',
    },
    {
      titulo: 'Assista no seu ritmo',
      texto:
        'As aulas são curtas e podem ser vistas no computador ou no celular. Você pode voltar a qualquer parte quando quiser.',
    },
  ],
}

export const VILAO_EM_ALIADO: FunnelDef = {
  audience: 'kids',
  produto: 'vilao-em-aliado',
  key: 'kids/vilao-em-aliado',
  basePath: '/kids/vilao-em-aliado',
  productName: 'Transformando o vilão em aliado',
  productSku: 'transformando-o-vilao-em-aliado',
  apelido: 'guia',
  imagesBase: '/img/transformando-o-vilao-em-aliado',
  checkoutImage: 'vilao-em-aliado.webp',
  byline: 'Helena · Sistema Zero',
  seoTitle: 'Transformando o vilão em aliado: guia para pais | Sistema Zero',
  seoDescription:
    'Guia para pais, em 7 aulas curtas em vídeo. A Helena mostra como a tela que hoje vira briga em casa pode ser sua aliada no desenvolvimento do seu filho.',
  theme: 'kids',
  lifetimeAccess: false,
  // 6 meses de acesso (decisão de 27/11/2026: prazo único das compras avulsas; nada de vitalício).
  offerContract: {
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: 6,
    accessDurationUnit: 'months',
    guaranteeDays: null,
    anyGuarantee: true,
  },
  steps: { quiz: false, resultado: false, upsell: false, downsell: false },
  giftCourses: ['transformando-o-vilao-em-aliado'],
  legal: { termos: TERMOS_GUIA_PAIS, termsVersion: 'guia-pais-2026-11-27' },
  content: {
    copy: GUIA_PRODUTO,
    landing: GUIA_LANDING,
    obrigado: GUIA_OBRIGADO,
    checkout: GUIA_CHECKOUT,
  },
}
