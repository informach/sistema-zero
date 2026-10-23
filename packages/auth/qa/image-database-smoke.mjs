import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

// This proof only admits the disposable database created by the operator.
// It does not create/drop databases or contact a real Members/Gateway service.
const url = new URL(process.env.DATABASE_URL)
const args = process.argv.slice(2)
assert.equal(new Set(args).size, args.length)
assert.ok(
  args.every((arg) =>
    ['--existing-migrations', '--start=workspace', '--start=wrapper', '--hold-purge'].includes(arg),
  ),
)
assert.ok(!(args.includes('--start=workspace') && args.includes('--start=wrapper')))
const existingMigrations = args.includes('--existing-migrations')
const holdPurge = args.includes('--hold-purge')
const startCommand = args.includes('--start=wrapper')
  ? ['bun', '/app/scripts/release/start.mjs', 'packages/auth/src/index.ts']
  : ['bun', 'run', '--filter', '@sistemazero/auth', 'start']
assert.equal(url.hostname, 'auth-image-qa-pg')
assert.equal(url.pathname, '/auth_image_closure_review_r1')
assert.equal(process.getuid(), 1000)
const { default: postgres } = await import(Bun.resolveSync('postgres', '/app/packages/auth'))
const sql = postgres(url.href, {
  max: 1,
  connect_timeout: 5,
  connection: { statement_timeout: 10000 },
})
let child
let lockConnection
let lockTransaction
let releaseLock
let stdoutDone
let stderrDone
let logs = ''
let errors = ''
let streamError
let failure
let receipt
let cleanupFailures = []
async function collect(stream, append) {
  const decoder = new TextDecoder()
  for await (const bytes of stream) append(decoder.decode(bytes, { stream: true }))
  append(decoder.decode())
}
async function until(check, description, timeoutMs = 15000) {
  const deadline = performance.now() + timeoutMs
  while (!(await check())) {
    if (streamError) throw streamError
    assert.equal(child?.exitCode, null, `Auth exited while waiting for ${description}: ${errors}`)
    assert.ok(performance.now() < deadline, `Deadline waiting for ${description}`)
    await Bun.sleep(20)
  }
}
function assertNoApplicationErrors() {
  assert.ok(!/"level":"error"/.test(logs + errors), `Auth background jobs failed: ${errors}`)
  if (streamError) throw streamError
}
try {
  const [before] = await sql`select to_regclass('drizzle.auth_migrations') as journal`
  if (!existingMigrations)
    assert.equal(before.journal, null, 'The first migration proof requires a fresh QA database')
  const root = '/app/packages/auth/src/infrastructure/persistence/drizzle/migrations'
  const journal = JSON.parse(readFileSync(`${root}/meta/_journal.json`, 'utf8'))
  const expectedHashes = journal.entries.map((entry) =>
    createHash('sha256')
      .update(readFileSync(`${root}/${entry.tag}.sql`))
      .digest('hex'),
  )
  let beforeCount = 0
  if (existingMigrations) {
    const rows = await sql`select hash from drizzle.auth_migrations order by created_at`
    assert.deepEqual(
      rows.map((row) => row.hash),
      expectedHashes,
    )
    beforeCount = rows.length
  }
  for (const run of ['first', 'replay']) {
    const migration = Bun.spawn(['bun', 'run', '--filter', '@sistemazero/auth', 'db:migrate'], {
      cwd: '/app',
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const [exit, stdout, stderr] = await Promise.all([
      migration.exited,
      new Response(migration.stdout).text(),
      new Response(migration.stderr).text(),
    ])
    assert.equal(
      exit,
      0,
      `Migration ${run} failed (${stdout.length}/${stderr.length} diagnostic bytes)`,
    )
    const rows = await sql`select hash from drizzle.auth_migrations order by created_at`
    assert.deepEqual(
      rows.map((row) => row.hash),
      expectedHashes,
    )
  }
  const applicationName = `auth-image-qa-${args.includes('--start=wrapper') ? 'wrapper' : 'workspace'}`
  const applicationUrl = new URL(url)
  applicationUrl.searchParams.set('application_name', applicationName)
  if (holdPurge) {
    lockConnection = postgres(url.href, {
      max: 1,
      connect_timeout: 5,
      connection: { statement_timeout: 10000, idle_in_transaction_session_timeout: 20000 },
    })
    let locked
    const lockReady = new Promise((resolve) => {
      locked = resolve
    })
    const unlock = new Promise((resolve) => {
      releaseLock = resolve
    })
    lockTransaction = lockConnection.begin(async (tx) => {
      await tx`lock table auth.refresh_tokens in access exclusive mode`
      locked()
      await unlock
    })
    await Promise.race([
      lockReady,
      lockTransaction.then(() => {
        throw new Error('Lock ended before readiness')
      }),
    ])
  }
  const fixture = {
    ...process.env,
    NODE_ENV: 'production',
    HOST: '127.0.0.1',
    PORT: '3002',
    JWT_ALG: 'HS256',
    JWT_HS256_SECRET: 'auth-image-qa-only-signing-key-32-characters',
    AUTH_INTERNAL_TOKEN: 'auth-image-qa-only-internal-token',
    AUTH_HMAC_SECRET: 'auth-image-qa-only-hmac-secret',
    MEMBERS_INTERNAL_TOKEN: 'auth-image-qa-only-members-token',
    MEMBERS_PROFILE_ADMISSION_TOKEN: 'auth-image-qa-only-admission-token',
    MEMBERS_BASE_URL: 'http://members.invalid',
    GATEWAY_URL: 'http://gateway.invalid',
    COMMUNITY_URL: 'https://community.invalid',
    RELEASE_MAINTENANCE_MODE: 'off',
    DATABASE_URL: applicationUrl.href,
    DATABASE_POOL_MAX: undefined,
  }
  const { loadEnv } = await import('/app/packages/auth/src/infrastructure/config/env.ts')
  assert.throws(
    () => loadEnv({ ...fixture, MEMBERS_PROFILE_ADMISSION_TOKEN: undefined }),
    /MEMBERS_PROFILE_ADMISSION_TOKEN/,
  )
  assert.throws(
    () => loadEnv({ ...fixture, AUTH_INTERNAL_TOKEN: undefined }),
    /AUTH_INTERNAL_TOKEN/,
  )
  loadEnv(fixture)
  child = Bun.spawn(startCommand, {
    cwd: '/app',
    env: fixture,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  stdoutDone = collect(child.stdout, (text) => {
    logs += text
    assert.ok(logs.length < 65536)
  }).catch((error) => {
    streamError = error
  })
  stderrDone = collect(child.stderr, (text) => {
    errors += text
    assert.ok(errors.length < 65536)
  }).catch((error) => {
    streamError = error
  })
  await until(() => logs.includes('http.listening'), 'http.listening')
  let purgePid
  if (holdPurge) {
    await until(async () => {
      const rows = await sql`select pid from pg_stat_activity
        where datname = current_database() and application_name = ${applicationName}
          and wait_event_type = 'Lock' and query like 'delete from "auth"."refresh_tokens"%'`
      assert.ok(rows.length <= 1, 'Expected exactly one purge query')
      purgePid = rows[0]?.pid
      return Boolean(purgePid)
    }, 'the identified purge query waiting on the controlled table lock')
  }
  const ready = await fetch('http://127.0.0.1:3002/readyz', { signal: AbortSignal.timeout(5000) })
  assert.equal(ready.status, 200)
  assert.equal(ready.headers.get('x-release-maintenance'), null)
  assert.deepEqual(await ready.json(), { status: 'ready', checks: { db: 'ok' } })
  const denied = await fetch('http://127.0.0.1:3002/auth/internal/staff-directory', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids: [] }),
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(denied.status, 401)
  const accounts = await sql`select count(*)::int as count from auth.users`
  assert.equal(accounts[0].count, 0)
  assertNoApplicationErrors()
  child.kill('SIGTERM')
  if (holdPurge) {
    await until(() => logs.includes('app.shutdown'), 'SIGTERM acknowledgement')
    // The real pool's close timeout is 5s. Observe the exact blocked query for
    // longer than that boundary; an early pool.close must fail this proof.
    const observedUntil = performance.now() + 6000
    while (performance.now() < observedUntil) {
      assertNoApplicationErrors()
      assert.equal(child.exitCode, null, 'Shutdown abandoned the locked purge')
      const rows = await sql`select pid from pg_stat_activity
        where pid = ${purgePid} and datname = current_database()
          and application_name = ${applicationName} and wait_event_type = 'Lock'
          and query like 'delete from "auth"."refresh_tokens"%'`
      assert.equal(rows.length, 1, 'Shutdown closed the in-flight purge connection')
      await Bun.sleep(20)
    }
    releaseLock()
    await lockTransaction
  }
  assert.equal(await child.exited, 0)
  await Promise.all([stdoutDone, stderrDone])
  assert.equal(errors, '')
  assertNoApplicationErrors()
  child = undefined
  receipt = {
    state: 'IMAGE_DATABASE_SMOKE_PASSED',
    uid: process.getuid(),
    bun: Bun.version,
    migrationsBefore: beforeCount,
    migrationsAfter: expectedHashes.length,
    migrationReplayUnchanged: true,
    emptyAccountsPreserved: true,
    productionEnvGuards: true,
    readyz: true,
    unauthenticatedInternalStatus: denied.status,
    gracefulStop: true,
    purgeDrainedBeforePoolClose: holdPurge,
    startCommand,
    realMembersOrMessaging: false,
  }
} catch (error) {
  failure = error
} finally {
  releaseLock?.()
  const cleanup = await Promise.allSettled([
    (async () => {
      try {
        await lockTransaction
      } finally {
        await lockConnection?.end({ timeout: 5 })
      }
    })(),
    (async () => {
      if (child) {
        child.kill('SIGTERM')
        await child.exited
      }
      await Promise.all([stdoutDone, stderrDone])
    })(),
    sql.end({ timeout: 5 }),
  ])
  cleanupFailures = cleanup.flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : [],
  )
}
if (failure) cleanupFailures.unshift(failure)
if (cleanupFailures.length === 1) throw cleanupFailures[0]
if (cleanupFailures.length > 1)
  throw new AggregateError(cleanupFailures, 'Auth image QA and cleanup failed')
console.log(JSON.stringify(receipt))
