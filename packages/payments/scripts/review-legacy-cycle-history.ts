import { readCycleHistoryReview } from '../src/domain/subscription/cycle-history-review'
import { loadEnv } from '../src/infrastructure/config/env'
import { EfiCobrancasClient } from '../src/infrastructure/gateways/efi/efi-cobrancas.client'
import { allPaidCycleHistory } from '../src/infrastructure/gateways/efi/efi-cycle-history-review'
import { DrizzleCycleHistoryReviewRepository } from '../src/infrastructure/persistence/drizzle/cycle-history-review.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

const environments = new Map([
  ['staging', 'f634cff6-aafb-4804-8b69-172fad4e946e'],
  ['production', '19c212a5-85c0-493c-9630-a7a0569e8412'],
])
async function main() {
  const [flag, environment, ...options] = process.argv.slice(2)
  if (
    flag !== '--environment' ||
    !environment ||
    !['local', 'staging', 'production'].includes(environment)
  )
    throw new Error('ARGUMENTS')
  let apply = false
  let subscriptionId: string | undefined
  for (let index = 0; index < options.length; index++) {
    const option = options[index]
    if (option === '--apply' && !apply) apply = true
    else if (option === '--subscription' && !subscriptionId) {
      subscriptionId = options[++index]
      if (
        !subscriptionId ||
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(subscriptionId)
      )
        throw new Error('ARGUMENTS')
    } else throw new Error('ARGUMENTS')
  }
  const env = loadEnv()
  if (env.EFI_SANDBOX !== (environment !== 'production'))
    throw new Error('PROVIDER_ENVIRONMENT_SCOPE')
  const url = new URL(env.DATABASE_URL)
  if (environment === 'local') {
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('LOCAL_SCOPE')
  } else if (
    process.env.RAILWAY_PROJECT_ID !== '415d5a1c-5f75-432c-8445-b395d0977ce3' ||
    process.env.RAILWAY_ENVIRONMENT_ID !== environments.get(environment) ||
    process.env.RAILWAY_SERVICE_ID !== '1d2455ac-05cd-436b-a39d-3f07392713f3'
  )
    throw new Error('RAILWAY_SCOPE')
  const connection = createDbConnection(env.DATABASE_URL, { max: 2 })
  try {
    const repository = new DrizzleCycleHistoryReviewRepository(connection.db)
    const client = new EfiCobrancasClient({
      clientId: env.EFI_COBRANCAS_CLIENT_ID || env.EFI_CLIENT_ID,
      clientSecret: env.EFI_COBRANCAS_CLIENT_SECRET || env.EFI_CLIENT_SECRET,
      sandbox: env.EFI_SANDBOX,
      maxRetries: 0,
      requestTimeoutMs: 10_000,
      totalBudgetMs: 10_000,
    })
    const candidates = await repository.candidates(subscriptionId)
    const results: { before: number; after?: number; outcome: string }[] = []
    const deadline = Date.now() + 120_000
    let stopped = false
    for (const candidate of candidates) {
      if (Date.now() + 25_000 > deadline) {
        stopped = true
        break
      }
      try {
        const local = await repository.localIdentities(candidate)
        const observedAt = new Date()
        const raw = await client.detailSubscription(candidate.providerSubscriptionId)
        const source = allPaidCycleHistory(raw, candidate.providerSubscriptionId, observedAt)
        if (
          !source ||
          JSON.stringify(local) !== JSON.stringify(source) ||
          source.length >= candidate.before
        ) {
          results.push({ before: candidate.before, outcome: 'REVIEW_REQUIRED' })
          continue
        }
        const audit = readCycleHistoryReview({
          version: 1,
          actorId: 'system:legacy-cycle-history-v1',
          requestId: crypto.randomUUID(),
          providerSubscriptionId: candidate.providerSubscriptionId,
          subscriptionVersion: candidate.version,
          before: candidate.before,
          after: source.length,
          providerPaymentIds: source,
          sourceObservedAt: observedAt.toISOString(),
          reviewedAt: new Date().toISOString(),
        })
        if (apply) await repository.apply(candidate, audit)
        results.push({
          before: candidate.before,
          after: source.length,
          outcome: apply ? 'CORRECTED' : 'ELIGIBLE',
        })
      } catch {
        results.push({ before: candidate.before, outcome: 'REVIEW_REQUIRED' })
      }
    }
    console.log(
      JSON.stringify({
        environment,
        mode: apply ? 'APPLY' : 'PREVIEW',
        scoped: Boolean(subscriptionId),
        batchLimit: 25,
        stopped,
        results,
      }),
    )
    if (stopped || results.some((result) => result.outcome === 'REVIEW_REQUIRED'))
      process.exitCode = 2
  } finally {
    await connection.close()
  }
}
if (import.meta.main)
  main().catch(() => {
    console.error(JSON.stringify({ error: 'CYCLE_HISTORY_REVIEW_FAILED' }))
    process.exitCode = 1
  })
