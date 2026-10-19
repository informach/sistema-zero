// Synthetic, loopback-only QA stack. Run from the repository root with bun --no-env-file.
// No payments, messaging or AI provider is configured; no remote records are modified.
import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
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

const secret = 'local-qa-internal-secret-2026-only'
const database =
  process.env.STUDIO_QA_DATABASE_URL ?? 'postgres://postgres@127.0.0.1:55433/sz_integrated_qa'
const target = new URL(database)
const databaseName = target.pathname.slice(1)
if (
  target.protocol !== 'postgres:' ||
  target.hostname !== '127.0.0.1' ||
  target.port !== '55433' ||
  target.username !== 'postgres' ||
  target.password ||
  target.search ||
  target.hash ||
  !/^sz_integrated_qa(?:_[a-z0-9]+)*$/.test(databaseName) ||
  databaseName.length > 60
)
  throw new Error('Explicit loopback55433 sz_integrated_qa[_attempt] database required')
const attemptId = `${new Date().toISOString().replaceAll(/[^0-9TZ]/g, '')}-${randomUUID()}`
const artifactDirectory = resolve(
  '.cache/studio-python-l0/public-chain-qa',
  databaseName,
  attemptId,
)
await mkdir(artifactDirectory, { recursive: true })
console.log(`Owned QA artifacts: ${artifactDirectory}`)
const manifestPath = resolve(artifactDirectory, 'manifest.json')
const cliLog = resolve(artifactDirectory, 'bootstrap.log')
const lifetime = new AbortController()
const startup = Promise.withResolvers()
const apps = []
let sql, connection, stopping
let manifest = {
  version: 1,
  attemptId,
  database: databaseName,
  state: 'starting',
  startedAt: new Date().toISOString(),
  ports: { gateway: 43100, auth: 43102, members: 43104, hub: 43110 },
}
async function persistManifest() {
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
}
async function migrateCanonicalHistory(pkg) {
  if (!['members', 'auth', 'hub'].includes(pkg)) throw new Error('Unknown QA migration owner')
  const table = `${pkg}_migrations`
  const migrations = readMigrationFiles({
    migrationsFolder: resolve(`packages/${pkg}/src/infrastructure/persistence/drizzle/migrations`),
  })
  if (!migrations.length) throw new Error(`Empty canonical ${pkg} migration history`)
  // Same checked journal/SQL history and per-migration commit boundary as the existing
  // Kids/Auth/Studio review database helpers. Historical enum ADD VALUE must commit
  // before the following canonical migration can consume it (PostgreSQL55P04).
  await sql`create schema if not exists drizzle`
  await sql.unsafe(
    `create table if not exists drizzle.${table} (id serial primary key, hash text not null, created_at bigint)`,
  )
  const applied = await sql.unsafe(
    `select hash,created_at from drizzle.${table} order by created_at,id`,
  )
  if (applied.length > migrations.length)
    throw new Error(`${pkg} QA journal contains unknown migration history`)
  for (const [index, migration] of migrations.entries()) {
    if (
      !Number.isSafeInteger(migration.folderMillis) ||
      (index > 0 && migrations[index - 1].folderMillis >= migration.folderMillis)
    )
      throw new Error(`${pkg} canonical migration journal order is invalid`)
    const row = applied[index]
    if (row && (Number(row.created_at) !== migration.folderMillis || row.hash !== migration.hash))
      throw new Error(`${pkg} QA migration history diverged at index ${index}`)
  }
  const committed = []
  for (const migration of migrations.slice(applied.length)) {
    lifetime.signal.throwIfAborted()
    await sql.begin(async (tx) => {
      for (const statement of migration.sql) {
        lifetime.signal.throwIfAborted()
        if (statement.trim()) await tx.unsafe(statement)
      }
      await tx.unsafe(`insert into drizzle.${table}(hash,created_at) values ($1,$2)`, [
        migration.hash,
        migration.folderMillis,
      ])
    })
    committed.push({ hash: migration.hash, createdAt: migration.folderMillis })
  }
  await writeFile(
    resolve(artifactDirectory, `migrations-${pkg}.json`),
    JSON.stringify(
      { package: pkg, previous: applied.length, total: migrations.length, committed },
      null,
      2,
    ) + '\n',
  )
  manifest.migrations ??= {}
  manifest.migrations[pkg] = {
    previous: applied.length,
    applied: committed.length,
    total: migrations.length,
  }
  await persistManifest()
}
async function shutdown(reason) {
  if (stopping) return stopping
  stopping = (async () => {
    lifetime.abort(new DOMException('Owned QA stack stopped', 'AbortError'))
    // No later factory resolution may escape the list being drained. Startup observes abort
    // before starting each owned app and resolves this barrier on both success and failure.
    await startup.promise
    const failures = []
    for (const app of apps.toReversed()) {
      try {
        await app.stop()
      } catch (error) {
        failures.push(error)
      }
    }
    if (connection) {
      try {
        await connection.close()
      } catch (error) {
        failures.push(error)
      }
      connection = undefined
    }
    if (sql) {
      try {
        await sql.end()
      } catch (error) {
        failures.push(error)
      }
      sql = undefined
    }
    manifest = {
      ...manifest,
      state: 'stopped',
      stoppedAt: new Date().toISOString(),
      stopReason: reason,
      cleanupErrors: failures.map((error) =>
        error instanceof Error ? error.message : String(error),
      ),
    }
    try {
      await persistManifest()
    } catch (error) {
      failures.push(error)
    }
    if (failures.length) throw new AggregateError(failures, 'Owned QA stack cleanup failed')
  })()
  return stopping
}
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void shutdown(signal).then(
      () => process.exit(0),
      (error) => {
        console.error(error)
        process.exit(1)
      },
    )
  })
async function boundedText(stream, maximum = 256 * 1024) {
  const reader = stream.getReader(),
    chunks = []
  let length = 0
  try {
    for (;;) {
      const next = await reader.read()
      if (next.done) break
      length += next.value.byteLength
      if (length > maximum) throw new Error('Bootstrap CLI output exceeded its QA limit')
      chunks.push(next.value)
    }
    return Buffer.concat(chunks).toString('utf8')
  } finally {
    reader.releaseLock()
  }
}
async function bootstrapCli(command, ...args) {
  lifetime.signal.throwIfAborted()
  const child = Bun.spawn(
    [
      process.execPath,
      '--no-env-file',
      'scripts/bootstrap-kids-journey.ts',
      command,
      ...args,
      '--confirm-rollout-order',
    ],
    {
      cwd: resolve('packages/members'),
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
        NODE_ENV: 'test',
        DATABASE_URL: database,
        AUTH_BASE_URL: 'http://127.0.0.1:43102',
        AUTH_INTERNAL_TOKEN: secret,
        AUTH_REQUEST_TIMEOUT_MS: '8000',
      },
    },
  )
  const signal = AbortSignal.any([lifetime.signal, AbortSignal.timeout(180_000)])
  const abort = () => child.kill()
  signal.addEventListener('abort', abort, { once: true })
  let output
  try {
    const text = boundedText(child.stdout).catch((error) => {
      child.kill()
      throw error
    })
    const errors = boundedText(child.stderr).catch((error) => {
      child.kill()
      throw error
    })
    const results = await Promise.allSettled([text, errors, child.exited])
    const failed = results
      .filter((result) => result.status === 'rejected')
      .map((result) => result.reason)
    if (failed.length) throw new AggregateError(failed, 'Bootstrap CLI I/O failed')
    output = {
      command,
      args,
      exit: results[2].value,
      stdout: results[0].value,
      stderr: results[1].value,
    }
    await appendFile(cliLog, JSON.stringify(output) + '\n')
    signal.throwIfAborted()
    if (output.exit !== 0) throw new Error(`Bootstrap CLI ${command} failed; see ${cliLog}`)
    return output.stdout
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.startsWith('{'))
      .map((line) => JSON.parse(line))
  } finally {
    signal.removeEventListener('abort', abort)
  }
}
try {
  await persistManifest()
  const admin = postgres('postgres://postgres@127.0.0.1:55433/postgres', {
    max: 1,
    onnotice: () => {},
  })
  try {
    const exists = (await admin`select 1 from pg_database where datname=${databaseName}`).length > 0
    if (process.env.STUDIO_QA_NEW_DATABASE === '1' && exists)
      throw new Error(
        'Fresh QA target already exists; choose a new attempt name instead of overwriting it',
      )
    if (!exists) await admin.unsafe(`CREATE DATABASE "${databaseName}"`)
  } finally {
    await admin.end()
  }
  sql = postgres(database, { max: 2, onnotice: () => {} })
  connection = createDbConnection(database, { max: 2 })
  for (const pkg of ['members', 'auth', 'hub']) await migrateCanonicalHistory(pkg)
  const userId = '11111111-aaaa-4111-8111-111111111111',
    courseId = '33333333-aaaa-4333-8333-333333333333'
  const password = 'Local-QA-adult-2026!'
  const now = new Date()
  const muralId = '44444444-aaaa-4444-8444-444444444444'
  const muralChannelId = '55555555-aaaa-4555-8555-555555555555'
  await sql`insert into hub.spaces(id,slug,name,audience,access_config,created_at,updated_at)values(${muralId},'mural-dos-criadores-adulto','Mural dos Criadores','adult',${sql.json({ visibility: 'public', courses: [], roles: [] })},${now},${now})on conflict(id)do nothing`
  await sql`insert into hub.channels(id,space_id,slug,name,posting_policy,created_at,updated_at)values(${muralChannelId},${muralId},'parede','Parede','staff_only',${now},${now})on conflict(id)do nothing`
  const hash = await Bun.password.hash(password, { algorithm: 'argon2id' })
  await sql`insert into auth.users (id,email,password_hash,first_name,last_name,role,status,password_set_at,created_at,updated_at) values (${userId},'qa-adult@example.invalid',${hash},'Aluno','QA','customer','active',${now},${now},${now}) on conflict(id) do nothing`
  const [qaAccount] = await sql`select email,role,status from auth.users where id=${userId}`
  if (
    qaAccount?.email !== 'qa-adult@example.invalid' ||
    qaAccount.role !== 'customer' ||
    qaAccount.status !== 'active'
  )
    throw new Error(
      'QA account must remain an active ordinary customer; do not revive or privilege an old fixture',
    )
  const blocks = SERVER_BLOCK_CATALOG.filter((e) => e.extension === 'game-2d')
    .slice(0, 30)
    .map((e) => e.type)
  await sql`insert into members.courses(id,slug,title,status,audience,level,metadata,created_at,updated_at)values(${courseId},'qa-jogos','Projeto de QA','published','adult','avancado',${sql.json({ studioUnlockBlocks: blocks })},${now},${now})on conflict(id)do nothing`
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
      ref === 'all_kids_courses'
        ? 'all_kids_courses'
        : kind === 'community'
          ? 'community'
          : 'course'
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
          fulfillment: {
            accessType,
            courseRef: ref,
            ...(ref === 'all_kids_courses' ? { maxProfiles: 5 } : {}),
          },
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
  connection = undefined
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
    MEMBERS_PROFILE_ADMISSION_TOKEN: 'local-qa-profile-admission-secret-2026-only',
    CATALOG_INTERNAL_TOKEN: secret,
    HUB_INTERNAL_TOKEN: secret,
    AUTH_BASE_URL: 'http://127.0.0.1:43102',
    MEMBERS_BASE_URL: 'http://127.0.0.1:43104',
    HUB_BASE_URL: 'http://127.0.0.1:43110',
    KIDS_BFF_BASE_URL: 'http://127.0.0.1:43108',
    ADULT_BFF_BASE_URL: 'http://127.0.0.1:43107',
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
  if (process.env.STUDIO_QA_PYTHON_POLICY === '1') {
    const directory = resolve('.cache/studio-python-l0/real-public-qa')
    base.STUDIO_AUTHORING_POLICY_JSON = await Bun.file(resolve(directory, 'policy.json')).text()
    base.STUDIO_RUNTIME_HOSTS_JSON = await Bun.file(resolve(directory, 'hosts.json')).text()
    const hosts = JSON.parse(base.STUDIO_RUNTIME_HOSTS_JSON)
    if (
      hosts.length !== 1 ||
      hosts[0]?.runtime?.profileId !== 'python-probe' ||
      !/^http:\/\/127\.0\.0\.1:\d+$/.test(hosts[0]?.origin ?? '')
    )
      throw new Error('A política Python da stack QA exige o host local aprovado.')
    manifest.pythonRuntime = structuredClone(hosts[0].runtime)
    manifest.pythonOrigin = hosts[0].origin
    console.log('Local QA Python policy loaded:', hosts[0].runtime.manifestSha256)
  }
  Object.assign(process.env, base)
  // initialize is operator-only and may run before Members boot; advance requires real Auth cohort HTTP.
  const initialized = (await bootstrapCli('initialize'))[0]
  if (!initialized || !['initializing', 'already-published'].includes(initialized.status))
    throw new Error('Canonical bootstrap did not return an explicit policy state')
  for (const [create, load, port] of [
    [membersApp, membersEnv, '43104'],
    [authApp, authEnv, '43102'],
    [hubApp, hubEnv, '43110'],
    [gatewayApp, gatewayEnv, '43100'],
  ]) {
    lifetime.signal.throwIfAborted()
    const app = await create(load({ ...base, PORT: port }))
    apps.push(app)
    lifetime.signal.throwIfAborted()
    await app.start()
  }
  if (initialized.status === 'initializing') {
    if (!/^[a-f0-9-]{36}$/.test(initialized.preparationId ?? ''))
      throw new Error('Missing seed preparation identity')
    let phase
    for (let batch = 0; batch < 100; batch++) {
      const records = await bootstrapCli(
        'advance',
        '--preparation',
        initialized.preparationId,
        '--steps',
        '20',
      )
      phase = records.at(-1)?.phase
      if (phase === 'ready') break
      if (!['capturing', 'preparing'].includes(phase))
        throw new Error(`Seed preparation cannot continue: ${phase}`)
    }
    if (phase !== 'ready')
      throw new Error(
        'Bounded QA bootstrap did not finish; preserve artifacts and resume explicitly',
      )
    const published = (await bootstrapCli('publish', '--preparation', initialized.preparationId))[0]
    if (!published || !['published', 'already-published'].includes(published.status))
      throw new Error('Canonical seed publication failed')
  }
  const [policy] = await sql`select version,phase from members.kids_journey_policy`
  if (policy?.phase !== 'published' || policy.version < 1)
    throw new Error('Persisted Kids policy is not published')
  async function request(path, token, body) {
    lifetime.signal.throwIfAborted()
    const response = await fetch(`http://127.0.0.1:43100${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        'content-type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.any([lifetime.signal, AbortSignal.timeout(15_000)]),
    })
    return { status: response.status, body: await response.json() }
  }
  const login = await request('/auth/login', null, {
    platform: 'kids',
    email: 'qa-adult@example.invalid',
    password,
  })
  if (login.status !== 200 || typeof login.body.tokens?.accessToken !== 'string')
    throw new Error('Real Auth parent login failed')
  const parentToken = login.body.tokens.accessToken
  const historicalId = '22222222-aaaa-4222-8222-222222222222'
  const [historical] =
    await sql`select id,account_user_id,status,admission_state from auth.profiles where id=${historicalId}`
  let childId, profileOrigin
  if (historical) {
    if (
      historical.account_user_id !== userId ||
      historical.status !== 'active' ||
      historical.admission_state !== 'ready'
    )
      throw new Error(
        'Historical QA profile is not selectable; do not fabricate ready/repair orphan pending. Use a fresh QA database.',
      )
    childId = historical.id
    profileOrigin = 'historical-auth-ready'
  } else {
    const body = {
      requestId: '88888888-aaaa-4888-8888-888888888888',
      name: 'Criador QA',
      birthDate: '2016-04-10',
      publicProfileEnabled: true,
    }
    for (let attempt = 0; attempt < 30; attempt++) {
      const created = await request('/auth/profiles', parentToken, body)
      if (created.status !== 201 || typeof created.body.profile?.id !== 'string')
        throw new Error('Real Auth profile creation failed')
      childId ??= created.body.profile.id
      if (childId !== created.body.profile.id)
        throw new Error('Profile retry changed the child identity')
      if (created.body.profile.admissionState === 'ready') break
      if (created.body.profile.admissionState !== 'pending')
        throw new Error('Unexpected admission state')
      if (attempt === 29)
        throw new Error(
          'Profile admission remains pending; preserve its existing job and retry explicitly',
        )
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
    profileOrigin = 'real-auth-create-and-admit'
  }
  const [earned] =
    await sql`select account_id,level,capabilities from members.kids_journey_earned where user_id=${childId}`
  if (!earned || earned.account_id !== userId)
    throw new Error(
      'Ready profile lacks canonical owner registry; use fresh QA target, never insert earned manually',
    )
  if (profileOrigin === 'real-auth-create-and-admit') {
    const [admission] =
      await sql`select p.admission_state,a.status,a.account_user_id,a.request_id from auth.profiles p
    join auth.profile_admissions a on a.profile_id=p.id where p.id=${childId}`
    if (
      admission?.admission_state !== 'ready' ||
      admission.status !== 'completed' ||
      admission.account_user_id !== userId ||
      admission.request_id !== '88888888-aaaa-4888-8888-888888888888'
    )
      throw new Error(
        'Auth admission/job completion was not durable; preserve the existing child/job',
      )
  }
  manifest = {
    ...manifest,
    state: 'admitted',
    userId,
    childId,
    profileOrigin,
    policyVersion: policy.version,
    profileCreationRequestId:
      profileOrigin === 'real-auth-create-and-admit'
        ? '88888888-aaaa-4888-8888-888888888888'
        : null,
    email: 'qa-adult@example.invalid',
    manifestPath,
  }
  await persistManifest()
  if (process.env.STUDIO_QA_SEED_KIDS_49 === '1') {
    // Optional explicit QA curriculum facts, awarded through the production milestone/grant hook.
    const { seedKidsPublicQa49 } = await import('./qa-public-chain/seed-kids-49.mjs')
    manifest.kidsSeed49 = await seedKidsPublicQa49({ database, userId: childId, accountId: userId })
  }
  await sql.end()
  sql = undefined
  manifest = { ...manifest, state: 'ready', readyAt: new Date().toISOString() }
  await persistManifest()
  startup.resolve()
  console.log(
    `Local QA stack ready; canonical Kids policy and real Auth admission verified. Manifest: ${manifestPath}`,
  )
} catch (error) {
  startup.resolve()
  try {
    await shutdown('startup-failure')
  } catch (cleanup) {
    throw new AggregateError([error, cleanup], 'QA startup and cleanup failed')
  }
  throw error
}
