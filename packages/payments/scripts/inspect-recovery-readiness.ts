import postgres from 'postgres'

const environments = new Map([
  ['staging', 'f634cff6-aafb-4804-8b69-172fad4e946e'],
  ['production', '19c212a5-85c0-493c-9630-a7a0569e8412'],
])
async function main() {
  const [flag, environment, extra] = process.argv.slice(2)
  if (
    flag !== '--environment' ||
    !environment ||
    !['local', 'staging', 'production'].includes(environment) ||
    extra
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
    process.env.RAILWAY_ENVIRONMENT_ID !== environments.get(environment) ||
    process.env.RAILWAY_SERVICE_ID !== '1d2455ac-05cd-436b-a39d-3f07392713f3'
  )
    throw new Error('RAILWAY_SCOPE')
  const connection = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 5,
    connection: { statement_timeout: 10_000 },
  })
  try {
    const result = await connection.begin(async (sql) => {
      await sql`set transaction read only`
      const [subscriptions] = await sql`select count(*)::integer total,
        count(*) filter(where status='ACTIVE')::integer active,
        count(*) filter(where status='CANCELED')::integer canceled from payments.subscriptions`
      const [cycles] = await sql`with receipts as (
        select s.id,s.cycles_completed,count(distinct p.provider_payment_id) filter(where p.status='PAID'
          and p.method='CREDIT_CARD' and p.consumer_id=s.consumer_id and p.provider=s.provider
          and p.currency=s.currency and p.amount_in_cents=s.amount_in_cents)::integer paid
        from payments.subscriptions s left join payments.payments p on p.subscription_id=s.id group by s.id
      ) select count(*) filter(where paid<>cycles_completed)::integer "differingCounters",
          count(*) filter(where paid>0 and cycles_completed=0)::integer "paidWithoutParentCount" from receipts`
      const [schema] =
        await sql`select to_regclass('payments.subscription_recovery_policy') is not null as "policyInstalled",
        to_regclass('payments.subscription_paid_cycles') is not null as "cycleIdentityInstalled"`
      let policyEnabled = null
      if (schema?.policyInstalled) {
        const [row] =
          await sql`select enabled from payments.subscription_recovery_policy where id=1`
        policyEnabled = row?.enabled ?? null
      }
      return { environment, subscriptions, cycles, schema, policyEnabled }
    })
    console.log(JSON.stringify(result))
  } finally {
    await connection.end({ timeout: 3 })
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
    ]
    const code =
      error instanceof Error && allowed.includes(error.message)
        ? error.message
        : 'READINESS_QUERY_FAILED'
    console.error(JSON.stringify({ error: code }))
    process.exitCode = 1
  })
