// Funil kids do curso para pais "Como ajudar seu filho autista a lidar com frustrações e evitar
// crises" (`kids/como-ajudar-seu-filho-autista-nas-frustracoes`, 25/11/2026), com a psicóloga
// Vivianne Lima, da Laopa: curso pago normal, com 6 meses de acesso. A página pública
// `/kids/como-ajudar-seu-filho-autista-nas-frustracoes` é a página de venda dele (o mesmo corpo do
// `/oferta`); o presente sai pelos links de campanha e de embaixador, que abrem a página no modo
// presente (`?presente=`). Quem assiste é o adulto, na área dos pais do app Kids.
//
// Oferta no catálogo: a principal do produto (marcada no Admin), a de 6 meses e R$ 67 do curso (slug `-1-ano` mantido)
// `como-ajudar-seu-filho-autista-nas-frustracoes`. Registrado por último: a landing `/kids` segue
// abrindo o Desafio.

import {
  CURSO_PAIS_AUTISMO_SLUG,
  CURSO_PAIS_AUTISMO_TITULO,
} from '../../content/curso-pais-autismo'
import { TERMOS_CURSO_AUTISMO } from '../../content/legal/termos-curso-autismo'
import type {
  FunnelCheckoutIntro,
  FunnelCopy,
  FunnelDef,
  FunnelLanding,
  FunnelObrigado,
} from '../registry'

const PRODUTO: FunnelCopy = {
  nome: CURSO_PAIS_AUTISMO_TITULO,
  precoLabel: 'R$ 67',
  artigo: 'o',
}

// Exigida pelo tipo FunnelContent (este funil não tem quiz nem landing genérica).
const LANDING: FunnelLanding = {
  h1: 'Na hora da crise, o seu filho está pedindo ajuda do jeito que consegue.',
  subtitulo:
    'A psicóloga Vivianne Lima, da Laopa, mostra o que você pode fazer antes, durante e depois de uma crise, com exemplos do dia a dia da sua casa.',
  tempo: '',
}

const CHECKOUT: FunnelCheckoutIntro = {
  titulo: 'Falta pouco para a primeira aula do curso',
  paragrafos: [
    'Revise o valor, informe os seus dados e escolha a forma de pagamento. Depois da aprovação, o curso aparece na área dos pais, em Cursos para pais.',
  ],
}

const OBRIGADO: FunnelObrigado = {
  titulo: 'Seu curso está confirmado.',
  intro: 'O próximo passo é abrir a primeira aula na área dos pais.',
  acesso:
    'Se já tem conta no Sistema Zero Kids, entre como responsável com seu acesso habitual. No primeiro acesso, siga as instruções enviadas ao e-mail da compra para criar a senha.',
  passosTitulo: 'Os primeiros passos',
  botao: 'Entrar na área dos pais →',
  entrega: [
    `${CURSO_PAIS_AUTISMO_TITULO}: 5 aulas curtas em vídeo, com a psicóloga Vivianne Lima.`,
    'Apostila para consultar e certificado no final.',
    'O curso fica na sua conta pelo prazo do acesso, contado da aprovação do pagamento.',
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
      texto: 'Na área dos pais, o curso aparece no menu Cursos para pais.',
    },
    {
      titulo: 'Assista no seu ritmo',
      texto:
        'As aulas são curtas e podem ser vistas no computador ou no celular. Você pode voltar a qualquer parte quando quiser.',
    },
  ],
}

export const AUTISMO_FRUSTRACOES: FunnelDef = {
  audience: 'kids',
  produto: 'como-ajudar-seu-filho-autista-nas-frustracoes',
  key: 'kids/como-ajudar-seu-filho-autista-nas-frustracoes',
  basePath: '/kids/como-ajudar-seu-filho-autista-nas-frustracoes',
  productName: CURSO_PAIS_AUTISMO_TITULO,
  productSku: CURSO_PAIS_AUTISMO_SLUG,
  apelido: 'frustracoes',
  imagesBase: '/img/como-ajudar-seu-filho-autista',
  checkoutImage: 'checkout-capa.webp',
  byline: 'Vivianne Lima · Sistema Zero',
  seoTitle: `${CURSO_PAIS_AUTISMO_TITULO}: curso para pais | Sistema Zero`,
  seoDescription:
    'Curso para pais, em 5 aulas curtas em vídeo. A psicóloga Vivianne Lima mostra o que fazer antes, durante e depois de uma crise, com exemplos do dia a dia da sua casa.',
  theme: 'kids',
  lifetimeAccess: false,
  // Prazo fixo em MESES lido da oferta (6 meses desde 26/11/2026, pedido da Vivianne; antes 1 ano):
  // a copy escreve o prazo do catálogo, então trocar a duração na oferta não derruba a página.
  offerContract: {
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: null,
    accessDurationUnit: 'months',
    guaranteeDays: null,
    anyDuration: true,
    anyGuarantee: true,
  },
  steps: { quiz: false, resultado: false, upsell: false, downsell: false },
  giftCourses: [CURSO_PAIS_AUTISMO_SLUG],
  legal: { termos: TERMOS_CURSO_AUTISMO, termsVersion: 'curso-autismo-2026-11-26' },
  content: {
    copy: PRODUTO,
    landing: LANDING,
    obrigado: OBRIGADO,
    checkout: CHECKOUT,
  },
}
