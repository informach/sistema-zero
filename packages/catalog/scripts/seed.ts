import { createLogger } from '@sistemazero/core/logging'
import { eq } from 'drizzle-orm'
import { CreateOfferService } from '../src/application/create-offer/create-offer.service'
import { CreateProductService } from '../src/application/create-product/create-product.service'
import { ResolveOfferEntitlementsService } from '../src/application/resolve-offer-entitlements/resolve-offer-entitlements.service'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleOfferRepository } from '../src/infrastructure/persistence/drizzle/offer.repository'
import { DrizzleProductRepository } from '../src/infrastructure/persistence/drizzle/product.repository'
import { offers as offerRows } from '../src/infrastructure/persistence/drizzle/schema'
import { parseCatalogSeedArgs, runCatalogSeed } from './catalog-seed-plan'

export async function main(args = process.argv.slice(2)): Promise<void> {
  const mode = parseCatalogSeedArgs(args)
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error('DATABASE_URL ausente')
  const connection = createDbConnection(databaseUrl, { max: 1 })
  try {
    const products = new DrizzleProductRepository(connection.db)
    const offers = new DrizzleOfferRepository(connection.db)
    const logger = createLogger({ level: 'error', pretty: false })
    const report = await runCatalogSeed(mode, {
      products,
      offers,
      findOfferByCode: async (code) => {
        const [row] = await connection.db
          .select({ id: offerRows.id })
          .from(offerRows)
          .where(eq(offerRows.code, code))
          .limit(1)
        return row ? offers.findById(row.id) : null
      },
      createProduct: new CreateProductService(products, logger),
      createOffer: new CreateOfferService(
        offers,
        products,
        new ResolveOfferEntitlementsService(products),
        logger,
      ),
    })
    console.log(JSON.stringify(report, null, 2))
    if (report.outcome === 'incomplete') process.exitCode = 1
  } finally {
    await connection.close()
  }
}

if (import.meta.main)
  main().catch(() => {
    // Driver errors may contain connection strings or SQL values.
    console.error(
      JSON.stringify({
        domain: 'catalog',
        outcome: 'failed',
        reason: 'Confira argumentos, conexão e schema; nenhum registro existente é atualizado.',
      }),
    )
    process.exitCode = 1
  })
