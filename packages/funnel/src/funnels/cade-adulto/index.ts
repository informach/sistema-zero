// Funil adulto "Cadê Todo Mundo" (`pro/cade-todo-mundo`, 25/11/2026): a página de venda da versão
// adulta do curso, que também é o presente adulto do embaixador. Uma página por oferta: a mesma
// oferta do catálogo serve de venda e de presente (`?presente=` abre o modo presente). O corpo é
// `CadeAdultoBody`, montado com as seções aprovadas da página do presente adulto (tema arcade).
//
// Oferta no catálogo: env `FUNNEL_OFFER_PRO_CADE_TODO_MUNDO` (hoje
// `cade-todo-mundo-adulto-7-dias`). O prazo vem da oferta. Registrado DEPOIS do Desafio adulto: a
// landing `/pro` segue abrindo a Comunidade.

import { TERMOS_CADE_ADULTO } from '../../content/legal/termos-cade-adulto'
import type {
  FunnelCheckoutIntro,
  FunnelCopy,
  FunnelDef,
  FunnelLanding,
  FunnelObrigado,
} from '../registry'

const CADE_ADULTO_PRODUTO: FunnelCopy = {
  nome: 'Cadê Todo Mundo',
  precoLabel: 'R$ 37',
  artigo: 'o',
}

// Exigida pelo tipo FunnelContent (este funil não tem quiz nem landing genérica).
const CADE_ADULTO_LANDING: FunnelLanding = {
  h1: 'O seu primeiro jogo funcionando no navegador.',
  subtitulo:
    'O Cadê Todo Mundo começa com o jardim e os personagens prontos. Você monta as regras, testa e vê o jogo responder.',
  tempo: '',
}

const CADE_ADULTO_CHECKOUT: FunnelCheckoutIntro = {
  titulo: 'Falta pouco para o seu primeiro jogo',
  paragrafos: [
    'Confira o valor, informe os seus dados e escolha a forma de pagamento. O prazo de acesso começa quando o pagamento é aprovado.',
  ],
}

const CADE_ADULTO_OBRIGADO: FunnelObrigado = {
  titulo: 'Seu Cadê Todo Mundo está confirmado.',
  intro: 'O próximo passo é abrir a primeira aula no computador.',
  acesso:
    'Se já tem conta, entre com seu acesso habitual. No primeiro acesso, siga as instruções enviadas ao e-mail da compra para criar a senha.',
  passosTitulo: 'Os primeiros passos',
  botao: 'Entrar no Sistema Zero →',
  entrega: [
    'Cadê Todo Mundo na versão adulta: o primeiro jogo, do jardim ao placar.',
    'Curso, Estúdio das aulas e Mural adulto pelo prazo da oferta, desde a aprovação.',
    'Depois do prazo, Mural visitante para ver e jogar.',
    'Pagamento único, sem renovação automática.',
  ],
  passos: [
    {
      titulo: 'Confirme seu acesso no e-mail',
      texto:
        'Depois da aprovação do pagamento, as instruções chegam ao e-mail da compra. No primeiro acesso, você cria sua senha. Confira também o spam ou as promoções.',
    },
    {
      titulo: 'Abra a primeira aula no computador',
      texto:
        'Com mouse e teclado, monte a regra que faz o esconderijo sumir, teste e siga para o placar.',
    },
    {
      titulo: 'Publique e mande o link',
      texto:
        'Quando os três personagens aparecerem, publique no Mural e mande o link para alguém jogar. Se travar no caminho, a ajuda por mensagens responde.',
    },
  ],
}

export const CADE_ADULTO: FunnelDef = {
  audience: 'pro',
  produto: 'cade-todo-mundo',
  key: 'pro/cade-todo-mundo',
  basePath: '/pro/cade-todo-mundo',
  productName: 'Cadê Todo Mundo',
  // O nome da cobrança separa o Cadê adulto do Kids em Compras.
  chargeName: 'Cadê Todo Mundo (adultos)',
  productSku: 'cade-todo-mundo-adulto',
  imagesBase: '/img/cade-todo-mundo',
  checkoutImage: 'cade-jogo-0.webp',
  byline: 'Helena e Júlio · Sistema Zero',
  seoTitle: 'Cadê Todo Mundo: o seu primeiro jogo | Sistema Zero',
  seoDescription:
    'O seu primeiro jogo funcionando no navegador, com o Cadê Todo Mundo na versão adulta e o Mural adulto. Pagamento único, para quem tem 18 anos ou mais.',
  theme: 'arcade',
  lifetimeAccess: false,
  offerContract: {
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: null,
    // A venda é por 1 ano (decisão de 25/11/2026); o presente é outra oferta, de dias.
    accessDurationUnit: 'months',
    guaranteeDays: null,
    anyDuration: true,
    anyGuarantee: true,
  },
  steps: { quiz: false, resultado: false, upsell: false, downsell: false },
  legal: { termos: TERMOS_CADE_ADULTO, termsVersion: 'cade-adulto-2026-11-25' },
  content: {
    copy: CADE_ADULTO_PRODUTO,
    landing: CADE_ADULTO_LANDING,
    obrigado: CADE_ADULTO_OBRIGADO,
    checkout: CADE_ADULTO_CHECKOUT,
  },
}
