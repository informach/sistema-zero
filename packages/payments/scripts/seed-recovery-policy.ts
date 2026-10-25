import { INITIAL_RECOVERY_POLICY } from '../src/domain/subscription-recovery/recovery-policy'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { DrizzleRecoveryPolicyRepository } from '../src/infrastructure/persistence/drizzle/recovery-policy.repository'

const environments = {
  staging: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  production: '19c212a5-85c0-493c-9630-a7a0569e8412',
}

async function main(): Promise<void> {
  const [flag, environment, applyFlag, extra] = process.argv.slice(2)
  if (
    flag !== '--environment' ||
    !environment ||
    !['local', 'staging', 'production'].includes(environment) ||
    (applyFlag !== undefined && applyFlag !== '--apply') ||
    extra !== undefined
  ) {
    throw new Error('ARGUMENTS')
  }
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_MISSING')
  const url = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_PROTOCOL')
  if (environment === 'local') {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('LOCAL_SCOPE')
  } else {
    const expected = environment === 'staging' ? environments.staging : environments.production
    if (
      process.env.RAILWAY_PROJECT_ID !== '415d5a1c-5f75-432c-8445-b395d0977ce3' ||
      process.env.RAILWAY_ENVIRONMENT_ID !== expected
    )
      throw new Error('RAILWAY_SCOPE')
  }
  const connection = createDbConnection(databaseUrl, { max: 1 })
  try {
    const repository = new DrizzleRecoveryPolicyRepository(connection.db)
    const before = await repository.get()
    const current = applyFlag === '--apply' ? await repository.initialize(new Date()) : before
    console.log(
      JSON.stringify({
        environment,
        mode: applyFlag === '--apply' ? 'APPLY' : 'PREVIEW',
        exists: Boolean(current),
        initialized: !before && Boolean(current),
        enabled: current?.enabled ?? false,
        policy: current?.policy ?? INITIAL_RECOVERY_POLICY,
      }),
    )
  } finally {
    await connection.close()
  }
}

main().catch((error: unknown) => {
  const known =
    error instanceof Error &&
    ['ARGUMENTS', 'DATABASE_MISSING', 'DATABASE_PROTOCOL', 'LOCAL_SCOPE', 'RAILWAY_SCOPE'].includes(
      error.message,
    )
      ? error.message
      : 'DATABASE_OPERATION_FAILED'
  console.error(
    JSON.stringify({
      error: known,
      usage: 'bun scripts/seed-recovery-policy.ts --environment local|staging|production [--apply]',
    }),
  )
  process.exitCode = 1
})
