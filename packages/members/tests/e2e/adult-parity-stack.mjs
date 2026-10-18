// Synthetic, loopback-only QA stack. Run from the repository root with bun --no-env-file.
// No payments, messaging or AI provider is configured; no remote records are modified.
import { resolve } from 'node:path'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import postgres from 'postgres'
import { createApplication as gatewayApp } from '../../../api-gateway/src/composition-root'
import { loadEnv as gatewayEnv } from '../../../api-gateway/src/infrastructure/config/env'
import { createApplication as authApp } from '../../../auth/src/composition-root'
import { loadEnv as authEnv } from '../../../auth/src/infrastructure/config/env'
import { createApplication as hubApp } from '../../../hub/src/composition-root'
import { loadEnv as hubEnv } from '../../../hub/src/infrastructure/config/env'
import { SERVER_BLOCK_CATALOG } from '../../../studio/src/blockly/blockCatalog'
import { createApplication as membersApp } from '../../src/composition-root'
import { EntitlementAggregate } from '../../src/domain/entitlement/entitlement.aggregate'
import { loadEnv as membersEnv } from '../../src/infrastructure/config/env'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleEntitlementRepository } from '../../src/infrastructure/persistence/drizzle/entitlement.repository'
import { DrizzleGamificationRepository } from '../../src/infrastructure/persistence/drizzle/gamification.repository'

const database = 'postgres://postgres@127.0.0.1:55433/sz_integrated_qa'
const target = new URL(database)
if (
  target.hostname !== '127.0.0.1' ||
  target.port !== '55433' ||
  target.pathname !== '/sz_integrated_qa'
)
  throw new Error('Local QA database required')
const admin = postgres('postgres://postgres@127.0.0.1:55433/postgres', { onnotice: () => {} })
if (!(await admin`select 1 from pg_database where datname='sz_integrated_qa'`).length)
  await admin.unsafe('CREATE DATABASE sz_integrated_qa')
await admin.end()
const sql = postgres(database, { onnotice: () => {} })
await sql`create schema if not exists drizzle`
for (const pkg of ['members', 'auth', 'hub']) {
  const table = `${pkg}_migrations`
  await sql.unsafe(
    `create table if not exists drizzle.${table} (id serial primary key,hash text not null,created_at bigint)`,
  )
  const existing = Number(
    (await sql.unsafe(`select max(created_at) as value from drizzle.${table}`))[0]?.value ?? 0,
  )
  for (const migration of readMigrationFiles({
    migrationsFolder: resolve(`packages/${pkg}/src/infrastructure/persistence/drizzle/migrations`),
  })) {
    if (migration.folderMillis <= existing) continue
    await sql.begin(async (tx) => {
      for (const statement of migration.sql) if (statement.trim()) await tx.unsafe(statement)
      await tx.unsafe(`insert into drizzle.${table}(hash,created_at) values ($1,$2)`, [
        migration.hash,
        migration.folderMillis,
      ])
    })
  }
}
const userId = '11111111-aaaa-4111-8111-111111111111',
  childId = '22222222-aaaa-4222-8222-222222222222',
  courseId = '33333333-aaaa-4333-8333-333333333333'
const password = 'Local-QA-adult-2026!'
const now = new Date()
const hash = await Bun.password.hash(password, { algorithm: 'argon2id' })
await sql`insert into auth.users (id,email,password_hash,first_name,last_name,role,status,password_set_at,created_at,updated_at) values (${userId},'qa-adult@example.invalid',${hash},'Aluno','QA','customer','active',${now},${now},${now}) on conflict(id) do nothing`
await sql`insert into auth.profiles(id,account_user_id,name,status,created_at,updated_at)values(${childId},${userId},'Criador QA','active',${now},${now}) on conflict(id)do nothing`
const blocks = SERVER_BLOCK_CATALOG.filter((e) => e.extension === 'game-2d')
  .slice(0, 30)
  .map((e) => e.type)
await sql`insert into members.courses(id,slug,title,status,audience,level,metadata,created_at,updated_at)values(${courseId},'qa-jogos','Projeto de QA','published','adult','avancado',${sql.json({ studioUnlockBlocks: blocks })},${now},${now})on conflict(id)do nothing`
const connection = createDbConnection(database)
const entitlements = new DrizzleEntitlementRepository(connection.db)
for (const ref of [
  'qa-jogos',
  'all_kids_courses',
  'adult-estudio-completo',
  'adult-pinta',
  'adult-molda',
  'adult-pensa',
  'adult-clube-dos-criadores',
  'adult-mural-dos-criadores',
  'estudio-completo',
  'pinta',
  'molda',
]) {
  const productId = crypto.randomUUID(),
    offerId = crypto.randomUUID()
  const kind = ref.includes('mural') || ref.includes('clube') ? 'community' : 'course'
  const accessType =
    ref === 'all_kids_courses' ? 'all_kids_courses' : kind === 'community' ? 'community' : 'course'
  await entitlements.save(
    EntitlementAggregate.grant({
      id: crypto.randomUUID(),
      userId,
      productId,
      productKind: kind,
      accessType,
      courseRef: ref,
      offerId,
      snapshot: {
        offerId,
        offerSlug: 'local-qa',
        productId,
        sku: ref,
        name: ref,
        kind,
        accessType,
        courseRef: ref,
        fulfillment: { accessType, courseRef: ref },
        resolvedAt: now.toISOString(),
      },
      sourceKind: 'manual',
      sourceId: `local-qa-${ref}`,
      subscriptionId: null,
      grantedAt: now,
      expiresAt: null,
      idempotencyKey: `local-qa-${ref}`,
    }),
  )
}
for (const capability of ['studio', 'pinta', 'molda', 'bridge', 'pro'])
  await sql`insert into members.adult_journey_grants(user_id,capability,policy_version,granted_at)values(${userId},${capability},0,${now})on conflict do nothing`
const gamification = new DrizzleGamificationRepository(connection.db)
await gamification.award({
  userId,
  accountId: userId,
  audience: 'adult',
  events: [{ sourceType: 'course_complete', sourceId: courseId, amount: 100, coins: 100 }],
  today: now.toISOString().slice(0, 10),
  now,
  privileged: false,
})
await connection.close()
await sql.end()
const secret = 'local-qa-internal-secret-2026-only'
const base = {
  NODE_ENV: 'test',
  DATABASE_URL: database,
  HOST: '127.0.0.1',
  INTERNAL_API_TOKEN: secret,
  GATEWAY_HMAC_SECRET: secret,
  GATEWAY_CONSUMER_ID: 'api-gateway',
  PAYMENTS_INTERNAL_TOKEN: secret,
  MARKETING_INTERNAL_TOKEN: secret,
  FUNNEL_INTERNAL_TOKEN: secret,
  AUTH_INTERNAL_TOKEN: secret,
  MEMBERS_INTERNAL_TOKEN: secret,
  CATALOG_INTERNAL_TOKEN: secret,
  HUB_INTERNAL_TOKEN: secret,
  AUTH_BASE_URL: 'http://127.0.0.1:43102',
  MEMBERS_BASE_URL: 'http://127.0.0.1:43104',
  HUB_BASE_URL: 'http://127.0.0.1:43110',
  CATALOG_BASE_URL: 'http://127.0.0.1:43103',
  JWT_ISSUER: 'local-qa-auth',
  JWT_AUDIENCE: 'local-qa',
  JWT_ALG: 'RS256',
  JWT_JWKS_URL: 'http://127.0.0.1:43102/auth/.well-known/jwks.json',
  MEMBER_SHELL_HMAC_SECRET: secret,
  FUNNEL_HMAC_SECRET: secret,
  AUTH_URL: 'http://127.0.0.1:43102',
  MEMBERS_URL: 'http://127.0.0.1:43104',
  HUB_URL: 'http://127.0.0.1:43110',
  CATALOG_URL: 'http://127.0.0.1:43103',
  PAYMENTS_URL: 'http://127.0.0.1:43101',
  MESSAGING_URL: 'http://127.0.0.1:43105',
  FUNNEL_URL: 'http://127.0.0.1:43106',
  FISCAL_URL: 'http://127.0.0.1:43111',
  REFERRALS_URL: 'http://127.0.0.1:43112',
  MARKETING_URL: 'http://127.0.0.1:43113',
  REQUIRE_ADMIN: 'true',
  GATEWAY_CONFIG_PATH: resolve('packages/api-gateway/gateway.config.ts'),
  COMMUNITY_URL: 'http://127.0.0.1:43107',
  KIDS_COMMUNITY_URL: 'http://127.0.0.1:43108',
}
Object.assign(process.env, base)
const apps = [
  await authApp(authEnv({ ...base, PORT: '43102' })),
  await membersApp(membersEnv({ ...base, PORT: '43104' })),
  await hubApp(hubEnv({ ...base, PORT: '43110' })),
  await gatewayApp(gatewayEnv({ ...base, PORT: '43100' })),
]
for (const app of apps) await app.start()
console.log(
  'Local QA stack ready: gateway 43100, auth 43102, members 43104, hub 43110. No outbound email or AI configured.',
)
process.on('SIGINT', async () => {
  for (const app of apps.toReversed()) await app.stop()
  process.exit(0)
})
