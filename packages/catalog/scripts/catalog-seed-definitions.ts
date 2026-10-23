import type { CreateOfferCommand } from '../src/application/create-offer/create-offer.service'
import type { CreateProductCommand } from '../src/application/create-product/create-product.service'

/** Approved payloads extracted unchanged from seed.ts (SHA-256 4f2b8694a02b1c570a5a041d3abf3b4b80585d54ce24ffb22bee270cea8f4e8f).
 * References use SKU until application; this module performs no I/O. */
export type CatalogSeedProduct = Omit<CreateProductCommand, 'components'> & {
  components?: { productSku: string; sortOrder?: number; isPrimary?: boolean }[]
}
export type CatalogSeedOffer = Omit<CreateOfferCommand, 'productId' | 'items'> & {
  productSku: string
  items?: { productSku: string; sortOrder?: number }[]
}

export const CATALOG_SEED_PRODUCTS: readonly CatalogSeedProduct[] = [
  {
    sku: 'estudio-completo',
    slug: 'estudio-completo',
    name: 'Estúdio Completo',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description:
      'O editor completo do Sistema Zero (blocos, ponte e código) liberado para a criança criar seus próprios jogos e apps na comunidade kids.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'estudio-completo',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'pensa',
    slug: 'pensa',
    name: 'Pensa',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description:
      'O app de planejamento do Sistema Zero: a criança clareia a ideia com o Zappy, enxerga o jogo, transforma tudo em missões e lança de verdade, versão por versão.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'pensa',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'pinta',
    slug: 'pinta',
    name: 'Pinta',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description:
      'O ateliê do Sistema Zero: a criança desenha os personagens (com animações!), cenários e peças dos próprios jogos, em pixel art e desenho livre, e usa tudo direto no Estúdio.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'pinta',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'molda',
    slug: 'molda',
    name: 'Molda',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description:
      'A oficina 3D do Sistema Zero: a criança monta modelos com caixas, rampas, cilindros e bolas, pinta direto na superfície, cria texturas e céus 360°, e usa tudo nos jogos 3D do Estúdio.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'molda',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'clube-dos-criadores',
    slug: 'clube-dos-criadores',
    name: 'Clube dos Criadores',
    kind: 'community',
    status: 'active',
    sellable: true,
    description:
      'Acesso ao Clube dos Criadores: o fórum da comunidade kids para conversar com os colegas e mostrar os projetos.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'clube-dos-criadores',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'mural-dos-criadores',
    slug: 'mural-dos-criadores',
    name: 'Mural dos Criadores',
    kind: 'community',
    status: 'active',
    sellable: true,
    description:
      'Acesso ao Mural dos Criadores: a vitrine onde a galera vê e curte os jogos criados pela comunidade kids.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'mural-dos-criadores',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'desafio-primeiro-jogo',
    slug: 'desafio-primeiro-jogo',
    name: 'Desafio do Primeiro Jogo',
    kind: 'course',
    status: 'active',
    sellable: true,
    description:
      'O desafio que leva a criança a criar o seu PRIMEIRO jogo, do zero, no Estúdio do Sistema Zero — passo a passo, com direito a publicar no Mural dos Criadores.',
    fulfillment: {
      accessType: 'course',
      courseRef: 'desafio-primeiro-jogo',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'todos-os-cursos-kids',
    slug: 'todos-os-cursos-kids',
    name: 'Todos os cursos kids',
    kind: 'course',
    status: 'active',
    sellable: false,
    description:
      'Chave-mestra da trilha kids: libera todos os cursos infantis publicados, os de hoje e os que ainda vão entrar. Entregue apenas dentro da Comunidade dos Criadores.',
    fulfillment: {
      accessType: 'all_kids_courses',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'comunidade-dos-criadores',
    slug: 'comunidade-dos-criadores',
    name: 'Comunidade dos Criadores',
    kind: 'bundle',
    status: 'active',
    sellable: true,
    description:
      'A assinatura da plataforma kids inteira: todos os cursos com professor acompanhando, o Clube e o Mural dos Criadores, e o kit de criação livre (Estúdio Completo, Pensa, Pinta e Molda).',
    components: [
      {
        isPrimary: true,
        sortOrder: 0,
        productSku: 'todos-os-cursos-kids',
      },
      {
        sortOrder: 1,
        productSku: 'clube-dos-criadores',
      },
      {
        sortOrder: 2,
        productSku: 'mural-dos-criadores',
      },
      {
        sortOrder: 3,
        productSku: 'estudio-completo',
      },
      {
        sortOrder: 4,
        productSku: 'pensa',
      },
      {
        sortOrder: 5,
        productSku: 'pinta',
      },
      {
        sortOrder: 6,
        productSku: 'molda',
      },
    ],
  },
  {
    sku: 'todos-os-cursos-adultos',
    slug: 'todos-os-cursos-adultos',
    name: 'Todos os cursos adultos',
    kind: 'course',
    status: 'active',
    sellable: false,
    description:
      'Chave-mestra da área adulta: libera todos os cursos gravados adultos publicados, os de hoje e os que ainda vão entrar. Não concede vaga em oficina ao vivo. Entregue apenas dentro da Comunidade dos Criadores adulta.',
    fulfillment: {
      accessType: 'all_courses',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'adult-estudio-completo',
    slug: 'adult-estudio-completo',
    name: 'Estúdio Completo (adultos)',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description:
      'O Estúdio livre da área adulta, com a paleta de blocos conquistada nos cursos concluídos.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'adult-estudio-completo',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'adult-pinta',
    slug: 'adult-pinta',
    name: 'Pinta (adultos)',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description: 'O editor de imagens dos jogos (pixel art, animações e cenários) da área adulta.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'adult-pinta',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'adult-molda',
    slug: 'adult-molda',
    name: 'Molda (adultos)',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description: 'A oficina 3D da área adulta: modelos low poly, texturas e céus para os jogos.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'adult-molda',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'adult-pensa',
    slug: 'adult-pensa',
    name: 'Pensa (adultos)',
    kind: 'tool',
    status: 'active',
    sellable: true,
    description:
      'O planejamento guiado de jogos da área adulta. O uso depende também da etapa da jornada que libera a formação avançada.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'adult-pensa',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'adult-clube-dos-criadores',
    slug: 'adult-clube-dos-criadores',
    name: 'Clube dos Criadores (adultos)',
    kind: 'community',
    status: 'active',
    sellable: true,
    description: 'O espaço de conversa da área adulta, separado do Clube kids.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'adult-clube-dos-criadores',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'adult-mural-dos-criadores',
    slug: 'adult-mural-dos-criadores',
    name: 'Mural dos Criadores (adultos)',
    kind: 'community',
    status: 'active',
    sellable: true,
    description: 'A vitrine dos jogos publicados na área adulta, separada do Mural kids.',
    fulfillment: {
      accessType: 'community',
      courseRef: 'adult-mural-dos-criadores',
      release: {
        mode: 'immediate',
      },
    },
  },
  {
    sku: 'comunidade-dos-criadores-adulto',
    slug: 'comunidade-dos-criadores-adulto',
    name: 'Comunidade dos Criadores (adultos)',
    kind: 'bundle',
    status: 'active',
    sellable: true,
    description:
      'A assinatura da área adulta: todos os cursos gravados adultos, o Clube e o Mural adultos e as ferramentas de criação livre (Estúdio, Pinta, Molda e Pensa), liberadas pela jornada.',
    components: [
      {
        isPrimary: true,
        sortOrder: 0,
        productSku: 'todos-os-cursos-adultos',
      },
      {
        sortOrder: 1,
        productSku: 'adult-clube-dos-criadores',
      },
      {
        sortOrder: 2,
        productSku: 'adult-mural-dos-criadores',
      },
      {
        sortOrder: 3,
        productSku: 'adult-estudio-completo',
      },
      {
        sortOrder: 4,
        productSku: 'adult-pinta',
      },
      {
        sortOrder: 5,
        productSku: 'adult-molda',
      },
      {
        sortOrder: 6,
        productSku: 'adult-pensa',
      },
    ],
  },
  {
    sku: 'desafio-primeiro-jogo-adulto',
    slug: 'desafio-primeiro-jogo-adulto',
    name: 'Desafio do Primeiro Jogo (adultos)',
    kind: 'course',
    status: 'active',
    sellable: true,
    description:
      'A trilha guiada em que a pessoa adulta monta o seu primeiro jogo, A Chave do Farol, no Estúdio do Sistema Zero e publica no Mural adulto.',
    fulfillment: {
      accessType: 'course',
      courseRef: 'desafio-primeiro-jogo-adulto',
      release: {
        mode: 'immediate',
      },
    },
  },
]

export const CATALOG_SEED_OFFERS: readonly CatalogSeedOffer[] = [
  {
    code: 'estudio-padrao',
    slug: 'estudio-completo',
    name: 'Estúdio Completo — Oferta padrão',
    priceCents: 9700,
    currency: 'BRL',
    pricingMode: 'one_time',
    installmentsMax: 12,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Crie seus próprios jogos',
      ctaLabel: 'Quero o Estúdio',
    },
    productSku: 'estudio-completo',
  },
  {
    code: 'pensa-padrao',
    slug: 'pensa',
    name: 'Pensa — Oferta padrão',
    priceCents: 9700,
    currency: 'BRL',
    pricingMode: 'one_time',
    installmentsMax: 12,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Pense como um criador de jogos',
      ctaLabel: 'Quero o Pensa',
    },
    productSku: 'pensa',
  },
  {
    code: 'pinta-padrao',
    slug: 'pinta',
    name: 'Pinta — Oferta padrão',
    priceCents: 9700,
    currency: 'BRL',
    pricingMode: 'one_time',
    installmentsMax: 12,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Desenhe os seus próprios jogos',
      ctaLabel: 'Quero o Pinta',
    },
    productSku: 'pinta',
  },
  {
    code: 'molda-padrao',
    slug: 'molda',
    name: 'Molda — Oferta padrão',
    priceCents: 9700,
    currency: 'BRL',
    pricingMode: 'one_time',
    installmentsMax: 12,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Modele o mundo dos seus jogos',
      ctaLabel: 'Quero o Molda',
    },
    productSku: 'molda',
  },
  {
    code: 'desafio-padrao',
    slug: 'desafio-primeiro-jogo',
    name: 'Desafio do Primeiro Jogo — Oferta padrão',
    priceCents: 3700,
    currency: 'BRL',
    pricingMode: 'one_time',
    accessMode: 'lifetime',
    installmentsMax: 12,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Crie seu primeiro jogo',
      ctaLabel: 'Topar o desafio',
    },
    items: [
      {
        productSku: 'mural-dos-criadores',
      },
    ],
    productSku: 'desafio-primeiro-jogo',
  },
  {
    code: 'desafio-30-dias',
    slug: 'desafio-primeiro-jogo-30-dias',
    name: 'Desafio do Primeiro Jogo — 30 dias',
    priceCents: 6700,
    currency: 'BRL',
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    guaranteeDays: 7,
    status: 'draft',
    content: {
      badge: 'Primeiro jogo em cinco dias',
      ctaLabel: 'Topar o desafio',
      allowsCoupon: true,
    },
    items: [
      {
        productSku: 'mural-dos-criadores',
      },
    ],
    productSku: 'desafio-primeiro-jogo',
  },
  {
    code: 'comunidade-mensal',
    slug: 'comunidade-dos-criadores-mensal',
    name: 'Comunidade dos Criadores — Assinatura mensal',
    priceCents: 9700,
    currency: 'BRL',
    pricingMode: 'subscription',
    billingIntervalMonths: 1,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'A plataforma inteira numa assinatura',
      ctaLabel: 'Quero que meu filho comece a criar',
      maxProfiles: 2,
      altOffer: {
        slug: 'comunidade-dos-criadores-anual',
        label: 'Economize no anual',
      },
    },
    productSku: 'comunidade-dos-criadores',
  },
  {
    code: 'comunidade-anual',
    slug: 'comunidade-dos-criadores-anual',
    name: 'Comunidade dos Criadores — Assinatura anual',
    priceCents: 79700,
    compareAtPriceCents: 116400,
    currency: 'BRL',
    pricingMode: 'subscription',
    billingIntervalMonths: 12,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'A plataforma inteira numa assinatura',
      ctaLabel: 'Garantir 1 ano de criação',
      maxProfiles: 2,
      altOffer: {
        slug: 'comunidade-dos-criadores-mensal',
        label: 'Prefiro começar no mensal',
      },
    },
    productSku: 'comunidade-dos-criadores',
  },
  {
    code: 'comunidade-adulto-mensal',
    slug: 'comunidade-dos-criadores-adulto-mensal',
    name: 'Comunidade dos Criadores adultos · Assinatura mensal',
    priceCents: 9700,
    currency: 'BRL',
    pricingMode: 'subscription',
    billingIntervalMonths: 1,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Todos os cursos e ferramentas numa assinatura',
      ctaLabel: 'Quero fazer o meu primeiro jogo',
      altOffer: {
        slug: 'comunidade-dos-criadores-adulto-anual',
        label: 'Economize no anual',
      },
    },
    productSku: 'comunidade-dos-criadores-adulto',
  },
  {
    code: 'comunidade-adulto-anual',
    slug: 'comunidade-dos-criadores-adulto-anual',
    name: 'Comunidade dos Criadores adultos · Assinatura anual',
    priceCents: 79700,
    compareAtPriceCents: 116400,
    currency: 'BRL',
    pricingMode: 'subscription',
    billingIntervalMonths: 12,
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Todos os cursos e ferramentas numa assinatura',
      ctaLabel: 'Garantir 1 ano de criação',
      altOffer: {
        slug: 'comunidade-dos-criadores-adulto-mensal',
        label: 'Prefiro começar no mensal',
      },
    },
    productSku: 'comunidade-dos-criadores-adulto',
  },
  {
    code: 'desafio-adulto-30-dias',
    slug: 'desafio-primeiro-jogo-adulto-30-dias',
    name: 'Desafio do Primeiro Jogo (adultos) · 30 dias',
    priceCents: 6700,
    currency: 'BRL',
    pricingMode: 'one_time',
    accessMode: 'fixed',
    accessDurationValue: 30,
    accessDurationUnit: 'days',
    guaranteeDays: 7,
    status: 'active',
    content: {
      badge: 'Seu primeiro jogo',
      ctaLabel: 'Quero fazer meu primeiro jogo',
      allowsCoupon: true,
    },
    items: [
      {
        productSku: 'adult-mural-dos-criadores',
      },
    ],
    productSku: 'desafio-primeiro-jogo-adulto',
  },
]
