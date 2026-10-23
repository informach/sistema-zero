import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'

// Mounted at /qa in the final image. No application, migration or seed is run.
assert.equal(process.cwd(), '/app')
assert.equal(process.getuid(), 1000)
assert.equal(Bun.version, '1.4.4')
assert.equal(process.env.NODE_ENV, 'production')
const workspaces = ['core', 'members', 'pinta', 'studio', 'ui']
assert.deepEqual(readdirSync('/app/packages').sort(), workspaces)
for (const path of [
  '/root/.bun/install/cache',
  '/home/bun/.bun/install/cache',
  '/app/docs',
  '/app/patches',
  '/app/bun.lock',
  '/app/.git',
  '/app/.cache',
  '/app/packages/members/tests',
  '/app/packages/members/qa',
  '/app/packages/members/scripts/test-pensa-db.ts',
  '/app/packages/members/scripts/convert-studio-manifest-examples.ts',
  '/app/node_modules/@biomejs/biome',
]) {
  assert.equal(existsSync(path), false, `Unexpected runtime artifact: ${path}`)
}
const manifest = JSON.parse(readFileSync('/app/packages/members/package.json', 'utf8'))
assert.equal(manifest.dependencies['drizzle-kit'], '^0.31.5')
assert.equal(manifest.devDependencies['drizzle-kit'], undefined)
for (const [consumer, workspace] of [
  ['members', 'core'],
  ['members', 'pinta'],
  ['members', 'studio'],
  ['studio', 'ui'],
]) {
  assert.equal(
    realpathSync(Bun.resolveSync(`@sistemazero/${workspace}`, `/app/packages/${consumer}`)),
    `/app/packages/${workspace}/src/index.ts`,
  )
}
for (const [name, command] of Object.entries(manifest.scripts)) {
  const path = /^bun run (scripts\/\S+\.ts)$/.exec(command)?.[1]
  if (path && name !== 'test:pensa-db')
    assert.ok(statSync(`/app/packages/members/${path}`).isFile())
}
const migrationRoot = '/app/packages/members/src/infrastructure/persistence/drizzle/migrations'
const journalBytes = readFileSync(`${migrationRoot}/meta/_journal.json`)
const journal = JSON.parse(journalBytes.toString('utf8'))
assert.ok(journal.entries.length > 0)
for (const entry of journal.entries)
  assert.ok(statSync(`${migrationRoot}/${entry.tag}.sql`).size > 0)
const { default: config } = await import('/app/packages/members/drizzle.config.ts')
assert.equal(config.dialect, 'postgresql')
assert.equal(config.migrations.table, 'members_migrations')
const { withPensaCutoverMigrations } = await import(
  '/app/packages/members/scripts/pensa-cutover-migrations.ts'
)
let temporaryPensaFolder
await withPensaCutoverMigrations(migrationRoot, async (folder, tags) => {
  temporaryPensaFolder = folder
  assert.deepEqual(tags, [
    '0126_pensa_functional_reset',
    '0127_pensa_functional_schema',
    '0128_pensa_remove_documentary_workflow',
  ])
  for (const tag of tags)
    assert.deepEqual(
      readFileSync(`${folder}/${tag}.sql`),
      readFileSync(`${migrationRoot}/${tag}.sql`),
    )
})
assert.equal(existsSync(temporaryPensaFolder), false)
const operations = readdirSync('/app/packages/members/scripts')
  .filter((name) => name.endsWith('.ts'))
  .map((name) => `/app/packages/members/scripts/${name}`)
// Compile the actual application and retained operators without evaluating them.
const graph = await Bun.build({
  entrypoints: [
    '/app/packages/members/src/index.ts',
    '/app/scripts/release/start.mjs',
    '/app/scripts/release/kids-journey-bootstrap.mjs',
    ...operations,
  ],
  target: 'bun',
})
assert.ok(graph.success, 'The real Members application/operational graphs must resolve')
const migration = Bun.spawn(
  ['bun', '--no-env-file', 'run', '--filter', '@sistemazero/members', 'db:migrate', '--help'],
  { cwd: '/app', stdout: 'pipe', stderr: 'pipe' },
)
const [migrationCode, stdout, stderr] = await Promise.all([
  migration.exited,
  new Response(migration.stdout).text(),
  new Response(migration.stderr).text(),
])
assert.equal(migrationCode, 0, `Migration CLI failed: ${stderr}`)
assert.match(stdout + stderr, /drizzle-kit migrate/)
const maintenance = Bun.spawn(
  ['bun', '--no-env-file', '/app/scripts/release/start.mjs', '/absent-entrypoint.ts'],
  {
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'production',
      RELEASE_MAINTENANCE_MODE: 'full',
      HOST: '127.0.0.1',
      PORT: '3004',
    },
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
      assert.equal(next.done, false, 'Maintenance exited before listening')
      startup += new TextDecoder().decode(next.value)
      assert.ok(startup.length < 4096)
    }
  } finally {
    reader.releaseLock()
  }
  assert.equal(JSON.parse(startup.trim()).event, 'release.maintenance')
  const ready = await fetch('http://127.0.0.1:3004/readyz')
  assert.equal(ready.status, 200)
  assert.equal(ready.headers.get('x-release-maintenance'), 'full')
  assert.deepEqual(await ready.json(), { status: 'maintenance' })
  const unavailable = await fetch('http://127.0.0.1:3004/must-not-run-application')
  assert.equal(unavailable.status, 503)
  assert.equal((await unavailable.json()).error.code, 'RELEASE_MAINTENANCE')
} finally {
  maintenance.kill('SIGTERM')
  assert.equal(await maintenance.exited, 0)
}
console.log(
  JSON.stringify({
    state: 'MEMBERS_IMAGE_STATIC_SMOKE_PASSED',
    bun: Bun.version,
    uid: process.getuid(),
    workspaces,
    migrationEntries: journal.entries.length,
    migrationJournalSha256: createHash('sha256').update(journalBytes).digest('hex'),
    operationalEntrypoints: operations.length,
    runtimeStartGraph: true,
    migrationCli: true,
    pensaSqlSelection: true,
    maintenanceDoesNotImportApplication: true,
    migrationsApplied: false,
    applicationBooted: false,
    databaseQualified: false,
    pid1ShutdownQualified: false,
  }),
)
