import { createLogger, serializeError } from '@sistemazero/core/logging'
import { CreateOfferService } from '../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../src/application/create-product/create-product.service'
import { ResolveOfferEntitlementsService } from '../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { UpdateProductService } from '../src/application/update-product/update-product.service'
import { loadEnv } from '../src/infrastructure/config/env'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleOfferRepository } from '../src/infrastructure/persistence/drizzle/offer.repository'
import { DrizzleProductRepository } from '../src/infrastructure/persistence/drizzle/product.repository'

/**
 * Popula o produto e a oferta atuais (No Comando da IA, R$37) — idempotente:
 * checa por sku/slug e pula se já existir. A copy de marketing continua no funil;
 * o catálogo guarda o núcleo comercial + o manifesto de entrega (fulfillment).
 *
 * Rode: `bun run db:seed` (precisa de DATABASE_URL e do schema migrado).
 */
const PRODUCT_SKU = 'no-comando-da-ia'
const OFFER_SLUG = 'no-comando-da-ia'

// Estúdio Completo (kids) — produto vendável que libera o editor standalone na
// comunidade kids. Entrega via `community` (a CHAVE casa com o `/members/access` e a
// re-validação do publish no hub; NÃO é curso de trilha, então fica fora das listagens).
const STUDIO_SKU = 'estudio-completo'
const STUDIO_OFFER_SLUG = 'estudio-completo'

// Pensa (kids) — o app de PLANEJAMENTO guiado (metodologia ZERO): a criança clareia a
// ideia com o Zappy, enxerga o jogo, roda as missões e lança. Mesmo molde do Estúdio:
// `kind: 'tool'` + entrega via `community` — a CHAVE `pensa` casa com o gate do members
// no CREATE de projeto do Pensa e com o `/members/access?refs=pensa` da página /pensa.
const PENSA_SKU = 'pensa'
const PENSA_OFFER_SLUG = 'pensa'

// Pinta (kids): o editor de assets de jogos (pixel art/animações/tiles/vetorial) —
// terceiro irmão do fluxo Pensa → Pinta → Estúdio. Mesmo molde: `kind: 'tool'` +
// entrega via `community`; a CHAVE `pinta` casa com o `/members/access?refs=pinta`
// da página /pinta (os DADOS são locais ao navegador — não há backend do Pinta).
const PINTA_SKU = 'pinta'
const PINTA_OFFER_SLUG = 'pinta'

// Servidores da comunidade kids vendidos como produtos À PARTE (gate `community_gated`
// no hub + `/members/access`). Cada um é INDEPENDENTE, com a SUA chave (= o slug do
// produto, que casa com o `accessConfig` do servidor homônimo no hub):
// - Clube dos Criadores: fórum vendável (`kind: community`).
// - Mural dos Criadores: vitrine, produto SEPARADO do Clube — dado de BÔNUS no desafio
//   do 1º jogo (o operador adiciona como item da oferta do desafio). Sem oferta própria
//   aqui (preço/venda é decisão do operador no painel); o produto basta p/ ser concedido.
const CLUBE_SKU = 'clube-dos-criadores'
const MURAL_SKU = 'mural-dos-criadores'

// Desafio do Primeiro Jogo (kids) — o funil `/kids/desafio-primeiro-jogo` vende ESTA
// oferta (env `FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO=desafio-primeiro-jogo`). É um
// CURSO (a criança faz o 1º jogo dentro do curso, autorado no admin com este slug) +
// o **Mural de BÔNUS** (item da oferta). Sem o produto/oferta, o checkout do funil quebra.
const DESAFIO_SKU = 'desafio-primeiro-jogo'
const DESAFIO_OFFER_SLUG = 'desafio-primeiro-jogo'

const env = loadEnv()
const logger = createLogger({ level: 'info', pretty: env.NODE_ENV !== 'production' })
const connection = createDbConnection(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX })

const products = new DrizzleProductRepository(connection.db)
const offers = new DrizzleOfferRepository(connection.db)
const resolver = new ResolveOfferEntitlementsService(products)
const createProduct = new CreateProductService(products, logger)
const updateProduct = new UpdateProductService(products, logger)
const createOffer = new CreateOfferService(offers, products, resolver, logger)

/**
 * Garante um produto de COMUNIDADE (servidor do hub vendido à parte): cria se não
 * existe; idempotente. Entrega via `community` — o `courseRef` é a CHAVE (= sku/slug),
 * que casa com o `accessConfig` `community_gated` do servidor homônimo no hub e com o
 * `/members/access`. NÃO cria oferta (preço/venda é decisão do operador no painel).
 */
async function ensureCommunityProduct(input: {
  sku: string
  name: string
  description: string
}): Promise<string> {
  const existing = await products.findBySku(input.sku)
  if (existing) {
    logger.info('seed.product_exists', { id: existing.id, sku: existing.sku })
    return existing.id
  }
  const view = await createProduct.execute({
    sku: input.sku,
    slug: input.sku,
    name: input.name,
    kind: 'community',
    status: 'active',
    sellable: true,
    description: input.description,
    fulfillment: { accessType: 'community', courseRef: input.sku, release: { mode: 'immediate' } },
  })
  logger.info('seed.product_created', { id: view.id, sku: view.sku })
  return view.id
}

async function main(): Promise<void> {
  let product = await products.findBySku(PRODUCT_SKU)
  if (product) {
    logger.info('seed.product_exists', { id: product.id, sku: product.sku })
  } else {
    const view = await createProduct.execute({
      sku: PRODUCT_SKU,
      slug: PRODUCT_SKU,
      name: 'No Comando da IA',
      kind: 'ebook',
      status: 'active',
      sellable: true,
      description:
        'Guia direto para tirar uma ideia do papel usando IA sem virar refém dela (método Z.E.R.O.).',
      // Manifesto do que a área de membros libera: a entrega é via CURSO
      // (`courseRef` = slug do curso no members; o ebook + materiais vivem dentro
      // dele como blocos/anexos). Convenção: rode o seed do members ANTES
      // (`bun run --filter @sistemazero/members db:seed`) — mesmo slug.
      fulfillment: {
        accessType: 'course',
        courseRef: 'no-comando-da-ia',
        release: { mode: 'immediate' },
      },
    })
    logger.info('seed.product_created', { id: view.id, sku: view.sku })
    product = await products.findById(view.id)
  }
  if (!product) throw new Error('Produto não encontrado após a criação')

  const existingOffer = await offers.findBySlug(OFFER_SLUG)
  if (existingOffer) {
    logger.info('seed.offer_exists', { id: existingOffer.id, slug: existingOffer.slug })
  } else {
    const view = await createOffer.execute({
      productId: product.id,
      code: 'ncia-padrao',
      slug: OFFER_SLUG,
      name: 'No Comando da IA — Oferta padrão',
      priceCents: 3700,
      currency: 'BRL',
      pricingMode: 'one_time',
      installmentsMax: 12,
      guaranteeDays: 7,
      status: 'active',
      content: { badge: 'Ebook + kit prático', ctaLabel: 'Quero meu acesso' },
    })
    logger.info('seed.offer_created', { id: view.id, slug: view.slug, priceCents: view.priceCents })
  }

  // ── Estúdio Completo (kids) ───────────────────────────────────────────────
  // `kind: 'tool'` (Ferramenta) — é um app/editor vendável, NÃO uma comunidade. A
  // ENTREGA segue via `accessType: 'community'` (a CHAVE `estudio-completo` casa com o
  // `/members/access` e a re-validação do publish no hub) — `kind` é só taxonomia.
  let studio = await products.findBySku(STUDIO_SKU)
  if (studio) {
    // RECONCILIA o tipo do que já existe (legado `community` → `tool`). Idempotente:
    // só atualiza se o kind divergir (preserva o fulfillment `community`).
    if (studio.kind !== 'tool') {
      await updateProduct.execute({ id: studio.id, kind: 'tool' })
      logger.info('seed.product_reconciled', { id: studio.id, sku: studio.sku, kind: 'tool' })
    } else {
      logger.info('seed.product_exists', { id: studio.id, sku: studio.sku })
    }
  } else {
    const view = await createProduct.execute({
      sku: STUDIO_SKU,
      slug: STUDIO_SKU,
      name: 'Estúdio Completo',
      kind: 'tool',
      status: 'active',
      sellable: true,
      description:
        'O editor completo do Sistema Zero (blocos, ponte e código) liberado para a criança criar seus próprios jogos e apps na comunidade kids.',
      fulfillment: {
        accessType: 'community',
        courseRef: STUDIO_SKU,
        release: { mode: 'immediate' },
      },
    })
    logger.info('seed.product_created', { id: view.id, sku: view.sku })
    studio = await products.findById(view.id)
  }
  if (!studio) throw new Error('Produto do Estúdio não encontrado após a criação')

  const existingStudioOffer = await offers.findBySlug(STUDIO_OFFER_SLUG)
  if (existingStudioOffer) {
    logger.info('seed.offer_exists', { id: existingStudioOffer.id, slug: existingStudioOffer.slug })
  } else {
    const view = await createOffer.execute({
      productId: studio.id,
      code: 'estudio-padrao',
      slug: STUDIO_OFFER_SLUG,
      name: 'Estúdio Completo — Oferta padrão',
      priceCents: 9700,
      currency: 'BRL',
      pricingMode: 'one_time',
      installmentsMax: 12,
      guaranteeDays: 7,
      status: 'active',
      content: { badge: 'Crie seus próprios jogos', ctaLabel: 'Quero o Estúdio' },
    })
    logger.info('seed.offer_created', { id: view.id, slug: view.slug, priceCents: view.priceCents })
  }

  // ── Pensa (kids) — planejamento guiado (metodologia ZERO) ─────────────────
  // Irmão do Estúdio: `kind: 'tool'` (app vendável) com entrega `community` — o
  // members gateia o CREATE de projeto do Pensa pela chave `pensa` e a página
  // /pensa gateia pelo `/members/access?refs=pensa`. Preço inicial R$97 (mesma
  // faixa do Estúdio) — o operador ajusta no painel; comercialmente Pensa +
  // Estúdio como combo é a oferta natural (montar no painel quando fizer sentido).
  let pensa = await products.findBySku(PENSA_SKU)
  if (pensa) {
    logger.info('seed.product_exists', { id: pensa.id, sku: pensa.sku })
  } else {
    const view = await createProduct.execute({
      sku: PENSA_SKU,
      slug: PENSA_SKU,
      name: 'Pensa',
      kind: 'tool',
      status: 'active',
      sellable: true,
      description:
        'O app de planejamento do Sistema Zero: a criança clareia a ideia com o Zappy, enxerga o jogo, transforma tudo em missões e lança de verdade, versão por versão.',
      fulfillment: {
        accessType: 'community',
        courseRef: PENSA_SKU,
        release: { mode: 'immediate' },
      },
    })
    logger.info('seed.product_created', { id: view.id, sku: view.sku })
    pensa = await products.findById(view.id)
  }
  if (!pensa) throw new Error('Produto do Pensa não encontrado após a criação')

  const existingPensaOffer = await offers.findBySlug(PENSA_OFFER_SLUG)
  if (existingPensaOffer) {
    logger.info('seed.offer_exists', { id: existingPensaOffer.id, slug: existingPensaOffer.slug })
  } else {
    const view = await createOffer.execute({
      productId: pensa.id,
      code: 'pensa-padrao',
      slug: PENSA_OFFER_SLUG,
      name: 'Pensa — Oferta padrão',
      priceCents: 9700,
      currency: 'BRL',
      pricingMode: 'one_time',
      installmentsMax: 12,
      guaranteeDays: 7,
      status: 'active',
      content: { badge: 'Pense como um criador de jogos', ctaLabel: 'Quero o Pensa' },
    })
    logger.info('seed.offer_created', { id: view.id, slug: view.slug, priceCents: view.priceCents })
  }

  // ── Pinta (kids) — editor de assets de jogos ──────────────────────────────
  // Terceiro irmão do fluxo criativo (Pensa planeja → Pinta desenha → Estúdio
  // constrói): `kind: 'tool'` com entrega `community` — a página /pinta gateia
  // pelo `/members/access?refs=pinta`; os desenhos são locais ao navegador.
  // Preço inicial R$97 (placeholder, mesma faixa dos irmãos) — o operador ajusta.
  let pinta = await products.findBySku(PINTA_SKU)
  if (pinta) {
    logger.info('seed.product_exists', { id: pinta.id, sku: pinta.sku })
  } else {
    const view = await createProduct.execute({
      sku: PINTA_SKU,
      slug: PINTA_SKU,
      name: 'Pinta',
      kind: 'tool',
      status: 'active',
      sellable: true,
      description:
        'O ateliê do Sistema Zero: a criança desenha os personagens (com animações!), cenários e peças dos próprios jogos, em pixel art e desenho livre, e usa tudo direto no Estúdio.',
      fulfillment: {
        accessType: 'community',
        courseRef: PINTA_SKU,
        release: { mode: 'immediate' },
      },
    })
    logger.info('seed.product_created', { id: view.id, sku: view.sku })
    pinta = await products.findById(view.id)
  }
  if (!pinta) throw new Error('Produto do Pinta não encontrado após a criação')

  const existingPintaOffer = await offers.findBySlug(PINTA_OFFER_SLUG)
  if (existingPintaOffer) {
    logger.info('seed.offer_exists', { id: existingPintaOffer.id, slug: existingPintaOffer.slug })
  } else {
    const view = await createOffer.execute({
      productId: pinta.id,
      code: 'pinta-padrao',
      slug: PINTA_OFFER_SLUG,
      name: 'Pinta — Oferta padrão',
      priceCents: 9700,
      currency: 'BRL',
      pricingMode: 'one_time',
      installmentsMax: 12,
      guaranteeDays: 7,
      status: 'active',
      content: { badge: 'Desenhe os seus próprios jogos', ctaLabel: 'Quero o Pinta' },
    })
    logger.info('seed.offer_created', { id: view.id, slug: view.slug, priceCents: view.priceCents })
  }

  // ── Comunidade kids: Clube + Mural (produtos `community`, SEPARADOS) ──────
  await ensureCommunityProduct({
    sku: CLUBE_SKU,
    name: 'Clube dos Criadores',
    description:
      'Acesso ao Clube dos Criadores: o fórum da comunidade kids para conversar com os colegas e mostrar os projetos.',
  })
  const muralProductId = await ensureCommunityProduct({
    sku: MURAL_SKU,
    name: 'Mural dos Criadores',
    description:
      'Acesso ao Mural dos Criadores: a vitrine onde a galera vê e curte os jogos criados pela comunidade kids.',
  })

  // ── Desafio do Primeiro Jogo (kids): CURSO + Mural de bônus ───────────────
  // CURSO (`accessType:'course'`, courseRef = slug; o conteúdo é autorado no admin com
  // ESTE slug + audience kids — sem ele o aluno compra mas vê 404 no curso). A oferta
  // leva o **Mural como item de BÔNUS** (`items`) → comprar libera o curso + o Mural.
  let desafio = await products.findBySku(DESAFIO_SKU)
  if (desafio) {
    logger.info('seed.product_exists', { id: desafio.id, sku: desafio.sku })
  } else {
    const view = await createProduct.execute({
      sku: DESAFIO_SKU,
      slug: DESAFIO_SKU,
      name: 'Desafio do Primeiro Jogo',
      kind: 'course',
      status: 'active',
      sellable: true,
      description:
        'O desafio que leva a criança a criar o seu PRIMEIRO jogo, do zero, no Estúdio do Sistema Zero — passo a passo, com direito a publicar no Mural dos Criadores.',
      fulfillment: { accessType: 'course', courseRef: DESAFIO_SKU, release: { mode: 'immediate' } },
    })
    logger.info('seed.product_created', { id: view.id, sku: view.sku })
    desafio = await products.findById(view.id)
  }
  if (!desafio) throw new Error('Produto do Desafio não encontrado após a criação')

  const existingDesafioOffer = await offers.findBySlug(DESAFIO_OFFER_SLUG)
  if (existingDesafioOffer) {
    logger.info('seed.offer_exists', {
      id: existingDesafioOffer.id,
      slug: existingDesafioOffer.slug,
    })
  } else {
    const view = await createOffer.execute({
      productId: desafio.id,
      code: 'desafio-padrao',
      slug: DESAFIO_OFFER_SLUG,
      name: 'Desafio do Primeiro Jogo — Oferta padrão',
      priceCents: 3700,
      currency: 'BRL',
      pricingMode: 'one_time',
      installmentsMax: 12,
      guaranteeDays: 7,
      status: 'active',
      content: { badge: 'Crie seu primeiro jogo', ctaLabel: 'Topar o desafio' },
      // Mural dos Criadores entra como BÔNUS desta oferta (item extra entregue junto).
      items: [{ productId: muralProductId }],
    })
    logger.info('seed.offer_created', { id: view.id, slug: view.slug, priceCents: view.priceCents })
  }

  // ── EXEMPLO (referência futura): combo de produtos ────────────────────────
  // Um combo é um produto `kind: 'bundle'` que inclui outros, um deles `isPrimary`.
  // Cada filho precisa existir antes. A oferta vende o combo; "o que está incluído"
  // sai da resolução de entitlements (combo → componentes), e o destaque vem do
  // componente principal. Itens extras só de UMA oferta entram em `items` da oferta.
  //
  //   const combo = await createProduct.execute({
  //     sku: 'sistema-zero-completo', slug: 'sistema-zero-completo',
  //     name: 'Sistema Zero Completo', kind: 'bundle', status: 'active',
  //     components: [
  //       { componentProductId: product.id, isPrimary: true, sortOrder: 0 }, // principal
  //       { componentProductId: '<outro-produto-id>', sortOrder: 1 },         // "como bônus"
  //     ],
  //   })
  //   await createOffer.execute({
  //     productId: combo.id, code: 'szc-lancamento', slug: 'sistema-zero-completo',
  //     name: 'Sistema Zero Completo — Lançamento', priceCents: 9700,
  //     compareAtPriceCents: 14700, status: 'active',
  //     items: [{ productId: '<material-exclusivo-desta-oferta-id>' }],
  //   })

  await connection.close()
  logger.info('seed.done')
}

main().catch(async (error) => {
  logger.error('seed.failed', { error: serializeError(error) })
  await connection.close().catch(() => {})
  process.exit(1)
})
