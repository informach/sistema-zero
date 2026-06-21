import { createLogger, serializeError } from '@sistemazero/core/logging'
import { CreateOfferService } from '../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../src/application/create-product/create-product.service'
import { ResolveOfferEntitlementsService } from '../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
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

const env = loadEnv()
const logger = createLogger({ level: 'info', pretty: env.NODE_ENV !== 'production' })
const connection = createDbConnection(env.DATABASE_URL, { max: env.DATABASE_POOL_MAX })

const products = new DrizzleProductRepository(connection.db)
const offers = new DrizzleOfferRepository(connection.db)
const resolver = new ResolveOfferEntitlementsService(products)
const createProduct = new CreateProductService(products, logger)
const createOffer = new CreateOfferService(offers, products, resolver, logger)

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
  let studio = await products.findBySku(STUDIO_SKU)
  if (studio) {
    logger.info('seed.product_exists', { id: studio.id, sku: studio.sku })
  } else {
    const view = await createProduct.execute({
      sku: STUDIO_SKU,
      slug: STUDIO_SKU,
      name: 'Estúdio Completo',
      kind: 'community',
      status: 'active',
      sellable: true,
      description:
        'O editor completo do Sistema Zero (blocos, ponte e código) liberado para a criança criar seus próprios jogos e apps na comunidade kids.',
      // Entrega via `community`: o `courseRef` é a CHAVE de acesso (não um curso de
      // trilha). Casa com o `/members/access?refs=estudio-completo` e a re-validação
      // do publish no hub (`STUDIO_STANDALONE_ACCESS_REF`).
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
