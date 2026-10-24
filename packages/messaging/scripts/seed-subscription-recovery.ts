import { and, eq, inArray, sql } from 'drizzle-orm'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { messages } from '../src/infrastructure/persistence/drizzle/schema'
import { DrizzleSenderRepository } from '../src/infrastructure/persistence/drizzle/sender.repository'
import { DrizzleTemplateRepository } from '../src/infrastructure/persistence/drizzle/template.repository'
import { seedRecoveryTemplates } from './recovery-template-seed'
import { seeds } from './seed-templates'

const environments = {
  staging: 'f634cff6-aafb-4804-8b69-172fad4e946e',
  production: '19c212a5-85c0-493c-9630-a7a0569e8412',
}
async function main() {
  const [flag, environment, ...options] = process.argv.slice(2)
  if (
    flag !== '--environment' ||
    !environment ||
    !['local', 'staging', 'production'].includes(environment) ||
    options.some((option) => !['--apply', '--retire-legacy'].includes(option)) ||
    new Set(options).size !== options.length
  )
    throw new Error('ARGUMENTS')
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_MISSING')
  const url = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_PROTOCOL')
  if (environment === 'local') {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('LOCAL_SCOPE')
  } else if (
    process.env.RAILWAY_PROJECT_ID !== '415d5a1c-5f75-432c-8445-b395d0977ce3' ||
    process.env.RAILWAY_ENVIRONMENT_ID !== environments[environment as keyof typeof environments]
  )
    throw new Error('RAILWAY_SCOPE')
  const connection = createDbConnection(databaseUrl, { max: 1 })
  try {
    const result = await seedRecoveryTemplates(
      new DrizzleTemplateRepository(connection.db),
      seeds,
      {
        apply: options.includes('--apply'),
        retireLegacy: options.includes('--retire-legacy'),
        now: new Date(),
      },
    )
    const [legacyQueue] = await connection.db
      .select({ pending: sql<number>`count(*)::integer` })
      .from(messages)
      .where(
        and(
          eq(messages.templateKey, 'subscription-charge-failed'),
          inArray(messages.status, ['QUEUED', 'SCHEDULED', 'SENDING']),
        ),
      )
    const sender = await new DrizzleSenderRepository(connection.db).findDefault()
    const senderReady = sender?.state.status === 'VERIFIED'
    const pendingLegacyMessages = legacyQueue?.pending ?? 0
    console.log(
      JSON.stringify({
        environment,
        ...result,
        senderReady,
        pendingLegacyMessages,
        ready: result.ready && senderReady && pendingLegacyMessages === 0,
      }),
    )
  } finally {
    await connection.close()
  }
}
if (import.meta.main)
  main().catch((error: unknown) => {
    const allowed = [
      'ARGUMENTS',
      'DATABASE_MISSING',
      'DATABASE_PROTOCOL',
      'LOCAL_SCOPE',
      'RAILWAY_SCOPE',
      'RECOVERY_TEMPLATE_CONTRACT',
    ]
    const code =
      error instanceof Error && allowed.includes(error.message)
        ? error.message
        : 'SEED_OPERATION_FAILED'
    console.error(
      JSON.stringify({
        error: code,
        usage:
          'bun scripts/seed-subscription-recovery.ts --environment local|staging|production [--apply] [--retire-legacy]',
      }),
    )
    process.exitCode = 1
  })
