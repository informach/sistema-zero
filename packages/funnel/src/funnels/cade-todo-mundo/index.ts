// Funil kids "Cadê Todo Mundo" (`kids/cade-todo-mundo`, 25/11/2026): a página de venda do curso que
// também é o presente padrão do embaixador. Uma página por oferta: a mesma oferta do catálogo serve
// de venda e de presente (`?presente=` abre o modo presente). O corpo é `CadeKidsBody`, montado com
// as seções aprovadas da página do presente.
//
// Oferta no catálogo: env `FUNNEL_OFFER_KIDS_CADE_TODO_MUNDO` (a oferta do Cadê, hoje
// `cade-todo-mundo-7-dias`). O prazo vem da oferta (a copy o lê do catálogo); o contrato só exige
// pagamento único com prazo fixo em dias. Registrado DEPOIS da Comunidade: a landing `/kids` segue
// abrindo o Desafio.

import { TERMOS_CADE_KIDS } from '../../content/legal/termos-cade-kids'
import type {
  FunnelCheckoutIntro,
  FunnelCopy,
  FunnelDef,
  FunnelLanding,
  FunnelObrigado,
} from '../registry'

const CADE_PRODUTO: FunnelCopy = { nome: 'Cadê Todo Mundo', precoLabel: 'R$ 37', artigo: 'o' }

// Exigida pelo tipo FunnelContent (este funil não tem quiz nem landing genérica).
const CADE_LANDING: FunnelLanding = {
  h1: 'Ajude seu filho a resolver problemas e explicar suas ideias com mais autonomia.',
  subtitulo:
    'No Cadê Todo Mundo, ele pratica planejar, testar e pedir ajuda de forma lúdica, fazendo um jogo de procurar personagens funcionar, com orientação.',
  tempo: '',
}

const CADE_CHECKOUT: FunnelCheckoutIntro = {
  titulo: 'Falta pouco para o Cadê Todo Mundo começar',
  paragrafos: [
    'Revise o valor, informe os dados do responsável e escolha a forma de pagamento. O prazo de acesso começa quando o pagamento é aprovado.',
  ],
}

const CADE_OBRIGADO: FunnelObrigado = {
  intro: 'O próximo passo é abrir o Cadê Todo Mundo com seu filho.',
  entrega: [
    'Cadê Todo Mundo: duas aulas guiadas, experiências, projeto e certificado.',
    'Curso, Estúdio das atividades e Mural pelo prazo da oferta, desde a aprovação.',
    'Depois do prazo, Mural visitante para ver e jogar.',
    'Pagamento único, sem renovação automática.',
  ],
  passos: [
    {
      titulo: 'Entre com o e-mail da compra',
      texto:
        'Se já tem conta no Sistema Zero, use seu acesso habitual. No primeiro acesso, siga as instruções para criar sua senha. Confira também a caixa de spam.',
    },
    {
      titulo: 'Crie o perfil do seu filho',
      texto:
        'Na área dos pais, adicione a criança e autorize o computador em que ela vai participar.',
    },
    {
      titulo: 'Abram a primeira aula no computador',
      texto:
        'Com internet, mouse e teclado, seu filho começa pela experiência da aula 1. As explicações podem ser pausadas e revistas, e o “Preciso de ajuda” leva a dúvida à equipe.',
    },
  ],
}

export const CADE_TODO_MUNDO: FunnelDef = {
  audience: 'kids',
  produto: 'cade-todo-mundo',
  key: 'kids/cade-todo-mundo',
  basePath: '/kids/cade-todo-mundo',
  productName: 'Cadê Todo Mundo',
  productSku: 'cade-todo-mundo',
  imagesBase: '/img/cade-todo-mundo',
  checkoutImage: 'cade-jogo-0.webp',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: 'Cadê Todo Mundo: o primeiro jogo do seu filho | Sistema Zero',
  seoDescription:
    'Seu filho pratica planejamento, raciocínio e comunicação criando um jogo, com orientação. Para 5 a 17 anos; abaixo de 9, com acompanhante. Pagamento único, sem assinatura.',
  theme: 'kids',
  lifetimeAccess: false,
  // A copy lê o prazo e a garantia da oferta; só o pagamento único com prazo em dias é rígido.
  offerContract: {
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: null,
    accessDurationUnit: 'days',
    guaranteeDays: null,
    anyDuration: true,
    anyGuarantee: true,
  },
  steps: { quiz: false, resultado: false, upsell: false, downsell: false },
  legal: { termos: TERMOS_CADE_KIDS, termsVersion: 'cade-kids-2026-11-25' },
  content: {
    copy: CADE_PRODUTO,
    landing: CADE_LANDING,
    obrigado: CADE_OBRIGADO,
    checkout: CADE_CHECKOUT,
  },
}
