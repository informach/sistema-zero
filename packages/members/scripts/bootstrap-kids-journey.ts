import { z } from 'zod'
import { KidsJourneyBootstrapService } from '../src/application/kids-journey/kids-journey-bootstrap.service'
import { KidsSeedCaptureService } from '../src/application/kids-journey/kids-seed-capture.service'
import { createAuthProfileCohortGateway } from '../src/infrastructure/gateways/auth-profile-cohort.gateway'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleKidsJourneyRepository } from '../src/infrastructure/persistence/drizzle/kids-journey.repository'

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}
const command = process.argv[2]
if (!['initialize', 'advance', 'publish'].includes(command ?? ''))
  throw new Error(
    'Use initialize | advance --preparation <uuid> [--steps <1..20>] | publish --preparation <uuid>.',
  )
// Deployment evidence is operational: this acknowledgement does not pretend to inspect other Auth instances.
if (!process.argv.includes('--confirm-rollout-order'))
  throw new Error(
    'Confirme a ordem documentada de rollout/retirada dos criadores Auth antigos com --confirm-rollout-order.',
  )
const databaseUrl = z.url().parse(process.env.DATABASE_URL)
const steps = z.coerce
  .number()
  .int()
  .min(1)
  .max(20)
  .parse(argument('--steps') ?? 1)
const preparationId =
  command === 'initialize' ? undefined : z.uuid().parse(argument('--preparation'))
const connection = createDbConnection(databaseUrl, { max: 2 })
try {
  const repository = new DrizzleKidsJourneyRepository(connection.db)
  const auth = createAuthProfileCohortGateway({
    baseUrl: process.env.AUTH_BASE_URL,
    internalToken: process.env.AUTH_INTERNAL_TOKEN,
    timeoutMs: z.coerce
      .number()
      .int()
      .positive()
      .parse(process.env.AUTH_REQUEST_TIMEOUT_MS ?? 8000),
  })
  const service = new KidsJourneyBootstrapService(
    repository,
    new KidsSeedCaptureService(repository, auth),
  )
  if (command === 'initialize') {
    const result = await service.initialize()
    console.log(
      JSON.stringify({
        status: result.status,
        version: result.policy.version,
        preparationId: result.status === 'initializing' ? result.preparation.id : undefined,
      }),
    )
  } else if (command === 'publish') {
    const result = await service.publish(preparationId!)
    console.log(
      JSON.stringify({
        status: result.status,
        version: result.status === 'published' ? result.policy.version : undefined,
      }),
    )
  } else {
    for (let index = 0; index < steps; index++) {
      const result = await service.advance(preparationId!)
      const current = result.preparation
      console.log(
        JSON.stringify({
          status: result.status,
          preparationId: current.id,
          phase: current.status,
          captureStage: current.captureStage,
          processed: current.processed,
        }),
      )
      if (result.status !== 'advanced' || !['capturing', 'preparing'].includes(current.status))
        break
    }
  }
} finally {
  await connection.close()
}
