import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'

// Run inside the final image, mounted read-only at /qa; no database or external
// service is used. A separate PostgreSQL proof is required for migrations/readyz.
assert.equal(process.cwd(), '/app')
assert.equal(process.getuid(), 1000)
assert.equal(Bun.version, '1.4.4')
assert.equal(process.env.NODE_ENV, 'production')
assert.deepEqual(readdirSync('/app/packages').sort(), ['auth', 'core'])
for (const path of [
  '/root/.bun/install/cache',
  '/home/bun/.bun/install/cache',
  '/app/docs',
  '/app/patches',
  '/app/bun.lock',
  '/app/.git',
  '/app/packages/auth/tests',
  '/app/packages/auth/qa',
  '/app/node_modules/next',
  '/app/node_modules/react',
  '/app/node_modules/@biomejs/biome',
]) {
  assert.equal(existsSync(path), false, `Unexpected runtime artifact: ${path}`)
}
assert.equal(
  realpathSync(Bun.resolveSync('@sistemazero/core', '/app/packages/auth')),
  '/app/packages/core/src/index.ts',
)
for (const packageName of readdirSync('/app/node_modules/.bun')) {
  assert.ok(!/^(next|react|@biomejs\/biome|@opentui\/core)@/.test(packageName), packageName)
}
const manifest = JSON.parse(readFileSync('/app/packages/auth/package.json', 'utf8'))
assert.equal(manifest.dependencies['drizzle-kit'], '^0.31.5')
assert.equal(manifest.devDependencies['drizzle-kit'], undefined)
const migrationRoot = '/app/packages/auth/src/infrastructure/persistence/drizzle/migrations'
const journalBytes = readFileSync(`${migrationRoot}/meta/_journal.json`)
const journal = JSON.parse(journalBytes.toString('utf8'))
assert.ok(journal.entries.length > 0)
for (const entry of journal.entries)
  assert.ok(statSync(`${migrationRoot}/${entry.tag}.sql`).size > 0)

const application = await import('/app/packages/auth/src/composition-root.ts')
assert.equal(typeof application.createApplication, 'function')
const { default: config } = await import('/app/packages/auth/drizzle.config.ts')
assert.equal(config.dialect, 'postgresql')
assert.equal(config.migrations.table, 'auth_migrations')
const wrapper = await import('/app/scripts/release/start.mjs')
assert.equal(typeof wrapper.start, 'function')
const graph = await Bun.build({
  entrypoints: ['/app/packages/auth/src/index.ts'],
  target: 'bun',
})
assert.ok(graph.success, 'The real Auth start graph must resolve from the final image')
const migration = Bun.spawn(
  ['bun', 'run', '--filter', '@sistemazero/auth', 'db:migrate', '--help'],
  {
    cwd: '/app',
    stdout: 'pipe',
    stderr: 'pipe',
  },
)
const [code, stdout, stderr] = await Promise.all([
  migration.exited,
  new Response(migration.stdout).text(),
  new Response(migration.stderr).text(),
])
assert.equal(code, 0, `Migration CLI failed: ${stderr}`)
assert.match(stdout + stderr, /drizzle-kit migrate/)
const password = 'image-smoke-only-not-a-user-password'
const hash = await Bun.password.hash(password, {
  algorithm: 'argon2id',
  memoryCost: 4096,
  timeCost: 1,
})
assert.equal(await Bun.password.verify(password, hash), true)
const maintenance = Bun.spawn(
  ['bun', '/app/scripts/release/start.mjs', '/absent-entrypoint-must-not-be-imported.ts'],
  {
    env: { ...process.env, RELEASE_MAINTENANCE_MODE: 'full', HOST: '127.0.0.1', PORT: '3002' },
    stdout: 'pipe',
    stderr: 'inherit',
  },
)
try {
  const reader = maintenance.stdout.getReader()
  let startup = ''
  try {
    while (!startup.includes('\n')) {
      const next = await reader.read()
      assert.equal(next.done, false, 'Maintenance process exited before listening')
      startup += new TextDecoder().decode(next.value)
      assert.ok(startup.length < 4096)
    }
  } finally {
    reader.releaseLock()
  }
  assert.equal(JSON.parse(startup.trim()).event, 'release.maintenance')
  const ready = await fetch('http://127.0.0.1:3002/readyz')
  assert.equal(ready.status, 200)
  assert.equal(ready.headers.get('x-release-maintenance'), 'full')
  assert.deepEqual(await ready.json(), { status: 'maintenance' })
  const auth = await fetch('http://127.0.0.1:3002/auth/me')
  assert.equal(auth.status, 503)
  assert.equal((await auth.json()).error.code, 'RELEASE_MAINTENANCE')
} finally {
  maintenance.kill('SIGTERM')
  assert.equal(await maintenance.exited, 0)
}
process.env.RELEASE_MAINTENANCE_MODE = 'invalid'
await assert.rejects(() => wrapper.start(), /RELEASE_MAINTENANCE_MODE must be off or full/)
delete process.env.RELEASE_MAINTENANCE_MODE
console.log(
  JSON.stringify({
    state: 'IMAGE_STATIC_SMOKE_PASSED',
    bun: Bun.version,
    uid: process.getuid(),
    workspaces: ['auth', 'core'],
    migrationEntries: journal.entries.length,
    migrationJournalSha256: createHash('sha256').update(journalBytes).digest('hex'),
    migrationsApplied: false,
    applicationBooted: false,
    runtimeStartGraph: true,
    migrationCli: true,
    argon2id: true,
    maintenanceWrapper: true,
    maintenanceDoesNotImportApplication: true,
  }),
)
