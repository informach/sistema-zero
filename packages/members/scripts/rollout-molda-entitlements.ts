import { createLogger } from '@sistemazero/core/logging'
import { MoldaEntitlementRolloutService } from '../src/application/molda-rollout/molda-entitlement-rollout.service'
import { createCatalogHttpGateway } from '../src/infrastructure/gateways/catalog-http.gateway'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from '../src/infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleMoldaRolloutCandidateSource } from '../src/infrastructure/persistence/drizzle/molda-rollout-candidates'

const apply = process.argv.includes('--apply')
if (apply && process.argv.includes('--dry-run')) {
  throw new Error('Use somente um modo: --apply ou --dry-run')
}

const databaseUrl = process.env.DATABASE_URL?.trim()
if (!databaseUrl) throw new Error('DATABASE_URL é obrigatória')
const catalogBaseUrl = process.env.CATALOG_BASE_URL?.trim()
if (!catalogBaseUrl) throw new Error('CATALOG_BASE_URL é obrigatória')

const logger = createLogger({ pretty: process.env.NODE_ENV !== 'production' })
const connection = createDbConnection(databaseUrl, {
  max: 1,
  ssl: ['true', '1'].includes(process.env.DATABASE_SSL?.toLowerCase() ?? ''),
})

try {
  const service = new MoldaEntitlementRolloutService({
    candidates: new DrizzleMoldaRolloutCandidateSource(connection.db),
    catalog: createCatalogHttpGateway({
      baseUrl: catalogBaseUrl,
      internalToken: process.env.CATALOG_INTERNAL_TOKEN,
      logger,
    }),
    entitlements: new DrizzleEntitlementRepository(connection.db),
    newId: () => crypto.randomUUID(),
    clock: () => new Date(),
    logger,
  })
  const result = await service.execute({ apply })
  logger.info('molda_rollout.summary', { mode: apply ? 'apply' : 'dry-run', ...result })
  if (result.failed > 0) process.exitCode = 1
} finally {
  await connection.close()
}
