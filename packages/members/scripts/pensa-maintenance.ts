import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import type postgres from 'postgres'
import { z } from 'zod'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'
import { withPensaCutoverMigrations } from './pensa-cutover-migrations'

const mode = process.argv[2]
if (!['preflight', 'cutover', 'rollback', 'verify'].includes(mode ?? ''))
  throw new Error('Use preflight, cutover, rollback or verify')
const value = (name: string) => {
  const index = process.argv.indexOf(name)
  return index < 0 ? undefined : process.argv[index + 1]
}
const apply = process.argv.includes('--apply')
const target = new URL(process.env.PENSA_MAINTENANCE_DATABASE_URL ?? '')
const manifestArgument = value('--manifest')
if (!manifestArgument) throw new Error('Select a private backup path with --manifest')
const manifestPath = resolve(manifestArgument)
const migrations = fileURLToPath(
  new URL('../src/infrastructure/persistence/drizzle/migrations/', import.meta.url),
)
const journal = z
  .object({ entries: z.array(z.object({ idx: z.number(), tag: z.string(), when: z.number() })) })
  .parse(JSON.parse(await readFile(resolve(migrations, 'meta/_journal.json'), 'utf8')))
const final = journal.entries.find((e) => e.idx === 128),
  baseline = journal.entries.find((e) => e.idx === 125)
if (!final || !baseline) throw new Error('The reviewed Pensa cutover migration baseline is missing')
const hash = (value: string) => createHash('sha256').update(value).digest('hex')
const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`
const allowed = (name: string) =>
  /^pensa_[a-z0-9_]+$/.test(name) && !['pensa_deletion_jobs', 'pensa_provider_usage'].includes(name)
const conn = createDbConnection(target.toString(), {
  max: 2,
  ssl: target.searchParams.get('sslmode') === 'require',
})
let readSql: postgres.Sql | postgres.TransactionSql = conn.sql
const pgEnvironment = {
  ...process.env,
  PGHOST: target.hostname,
  PGPORT: target.port || '5432',
  PGUSER: decodeURIComponent(target.username),
  PGPASSWORD: decodeURIComponent(target.password),
  PGDATABASE: target.pathname.slice(1),
  PGSSLMODE: target.searchParams.get('sslmode') ?? 'prefer',
}
const identity = {
  host: target.hostname,
  port: target.port || '5432',
  database: target.pathname.slice(1),
}
const manifestSchema = z.strictObject({
  identity: z.strictObject({ host: z.string(), port: z.string(), database: z.string() }),
  createdAt: z.string(),
  baseline: z.number(),
  final: z.number(),
  tables: z.array(z.string()),
  operationalHash: z.string(),
  backupFile: z.string(),
  backupHash: z.string(),
  enumSql: z.array(z.string()),
  foreignKeys: z.array(
    z.strictObject({ table: z.string(), name: z.string(), definition: z.string() }),
  ),
  reservations: z.array(z.strictObject({ id: z.string(), projectId: z.string() })),
  narrations: z.array(z.strictObject({ id: z.string(), projectId: z.string() })),
  sentinels: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  prefixes: z.array(z.string()),
  projects: z.number(),
  runningOperations: z.number(),
  pendingReservations: z.number(),
  projectIds: z.array(z.string()),
  deletionJobIds: z.array(z.string()),
})

async function tables() {
  return (
    await readSql`select table_name from information_schema.tables where table_schema='members' and left(table_name,6)='pensa_' order by table_name`
  )
    .map((row) => String(row.table_name))
    .filter(allowed)
}
async function operationalHash(names: string[]) {
  const contents: string[] = []
  for (const name of names) {
    if (!allowed(name)) throw new Error('The backup contains an unrelated table')
    const rows = await readSql.unsafe(
      `select row_to_json(t) as data from members.${quoted(name)} t`,
    )
    contents.push(
      `${name}:${rows
        .map((row) => JSON.stringify(row.data))
        .sort()
        .join('\n')}`,
    )
  }
  return hash(contents.join('\n'))
}
async function foreignKeys() {
  const rows =
    await readSql`select ns.nspname as schema, cl.relname as "table", c.conname as name, pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_class cl on cl.oid=c.conrelid join pg_namespace ns on ns.oid=cl.relnamespace join pg_class referenced on referenced.oid=c.confrelid where c.contype='f' and left(referenced.relname,6)='pensa_' and left(cl.relname,6)<>'pensa_' order by ns.nspname,cl.relname,c.conname`
  if (
    rows.some(
      (r) =>
        r.schema !== 'members' ||
        !['ai_usage_reservations', 'private_narrations'].includes(String(r.table)),
    )
  )
    throw new Error(
      'An unexpected external foreign key depends on Pensa; review it before maintenance',
    )
  return rows.map((row) => ({
    table: String(row.table),
    name: String(row.name),
    definition: String(row.definition),
  }))
}
async function assertNoDependentViews() {
  const views =
    await readSql`select distinct n.nspname as schema,v.relname as name from pg_depend d join pg_rewrite r on r.oid=d.objid join pg_class v on v.oid=r.ev_class join pg_namespace n on n.oid=v.relnamespace join pg_class referenced on referenced.oid=d.refobjid join pg_namespace rn on rn.oid=referenced.relnamespace where d.classid='pg_rewrite'::regclass and d.refclassid='pg_class'::regclass and v.relkind in ('v','m') and rn.nspname='members' and left(referenced.relname,6)='pensa_' and referenced.relname not in ('pensa_provider_usage','pensa_deletion_jobs')`
  if (views.length)
    throw new Error('A view depends on Pensa; maintenance refuses to drop an uninventoried object')
}

async function latest() {
  return Number(
    (await readSql`select max(created_at) as value from drizzle.members_migrations`)[0]?.value ?? 0,
  )
}
async function tool(binary: string, args: string[], input?: string) {
  const process = Bun.spawn([binary, ...args], {
    env: pgEnvironment,
    stdin: input === undefined ? 'ignore' : 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (input !== undefined && process.stdin) {
    process.stdin.write(input)
    process.stdin.end()
  }
  const [output, error, code] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ])
  if (code !== 0) throw new Error(`PostgreSQL utility failed (${code}): ${error}`)
  return output
}

try {
  if (mode === 'preflight') {
    await conn.sql.begin('isolation level repeatable read read only', async (transaction) => {
      readSql = transaction
      if ((await latest()) !== baseline.when)
        throw new Error('Preflight requires the reviewed pre-cutover migration baseline (0125)')
      await assertNoDependentViews()
      const names = await tables()
      const snapshotId = String((await readSql`select pg_export_snapshot() as id`)[0]?.id)
      const dump = await tool(process.env.PENSA_PG_DUMP ?? 'pg_dump', [
        '--snapshot',
        snapshotId,
        '--no-owner',
        '--no-privileges',
        '--column-inserts',
        ...names.flatMap((name) => ['--table', `members.${name}`]),
      ])
      const enums =
        await readSql`select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as labels from pg_type t join pg_namespace ns on ns.oid=t.typnamespace join pg_enum e on e.enumtypid=t.oid where ns.nspname='members' and left(t.typname,6)='pensa_' group by t.typname order by t.typname`
      const enumSql = enums.map(
        (e) =>
          `CREATE TYPE members.${quoted(String(e.name))} AS ENUM (${z.array(z.string()).parse(e.labels).map(literal).join(',')});`,
      )
      const reservations = (
        await readSql`select id,project_id as "projectId" from members.ai_usage_reservations where project_id is not null`
      ).map((r) => ({ id: String(r.id), projectId: String(r.projectId) }))
      const narrations = (
        await readSql`select id,project_id as "projectId" from members.private_narrations where project_id is not null`
      ).map((r) => ({ id: String(r.id), projectId: String(r.projectId) }))
      const prefixes = (
        await readSql`select distinct 'creations/'||person.profile_id::text||'/pensa/'||p.id::text||'/' as prefix from members.pensa_projects p cross join lateral (select p.user_id as profile_id union select profile_id from members.pensa_project_members where project_id=p.id union select profile_id from members.pensa_checkpoints where project_id=p.id union select profile_id from members.private_narrations where project_id=p.id) person union select f.value->>'destination' as prefix from members.pensa_operations o cross join lateral jsonb_array_elements(coalesce(o.output->'files','[]'::jsonb)) f(value) where o.kind='restore' and o.status<>'succeeded' and f.value->>'destination' is not null`
      )
        .map((r) => String(r.prefix))
        .sort()
      const sentinels: Record<string, Array<Record<string, unknown>>> = {}
      for (const table of [
        'creations',
        'ai_usage_daily',
        'pensa_provider_usage',
        'xp_events',
        'coin_events',
      ])
        sentinels[table] = (
          await readSql.unsafe(`select row_to_json(t) as data from members.${quoted(table)} t`)
        ).map((r) => z.record(z.string(), z.unknown()).parse(r.data))
      const backupFile = resolve(dirname(manifestPath), `${manifestPath.split(/[\\/]/).at(-1)}.sql`)
      await writeFile(backupFile, dump, { encoding: 'utf8', flag: 'wx' })
      const counts = (
        await readSql`select (select count(*) from members.pensa_projects) as projects, (select count(*) from members.pensa_operations where status='running') as running, (select count(*) from members.ai_usage_reservations where project_id is not null and status='reserved') as pending`
      )[0]
      const projectIds = (await readSql`select id from members.pensa_projects`).map((r) =>
        String(r.id),
      )
      const deletionJobIds = (await readSql`select id from members.pensa_deletion_jobs`).map((r) =>
        String(r.id),
      )
      const manifest = manifestSchema.parse({
        identity,
        createdAt: new Date().toISOString(),
        baseline: baseline.when,
        final: final.when,
        tables: names,
        operationalHash: await operationalHash(names),
        backupFile,
        backupHash: hash(dump),
        enumSql,
        foreignKeys: await foreignKeys(),
        reservations,
        narrations,
        sentinels,
        prefixes,
        projects: Number(counts?.projects ?? 0),
        runningOperations: Number(counts?.running ?? 0),
        pendingReservations: Number(counts?.pending ?? 0),
        projectIds,
        deletionJobIds,
      })
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), {
        encoding: 'utf8',
        flag: 'wx',
      })
      console.log(
        JSON.stringify({
          mode,
          manifest: manifestPath,
          projects: manifest.projects,
          runningOperations: manifest.runningOperations,
          pendingReservations: manifest.pendingReservations,
          privatePaths: prefixes.length,
          backupHash: manifest.backupHash,
        }),
      )
    })
    readSql = conn.sql
  } else {
    const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestPath, 'utf8')))
    if (
      JSON.stringify(manifest.identity) !== JSON.stringify(identity) ||
      manifest.baseline !== baseline.when ||
      manifest.final !== final.when
    )
      throw new Error('Manifest database or migration revision differs')
    const dump = await readFile(manifest.backupFile, 'utf8')
    if (hash(dump) !== manifest.backupHash) throw new Error('The scoped backup changed')
    if (
      apply &&
      (!process.argv.includes('--workers-fenced') || !process.argv.includes('--no-child-data'))
    )
      throw new Error(
        'Apply requires --workers-fenced (including cleanup) and --no-child-data after the operational checks',
      )
    await assertNoDependentViews()
    if (mode === 'cutover') {
      if (
        (await latest()) !== manifest.baseline ||
        (await operationalHash(manifest.tables)) !== manifest.operationalHash ||
        JSON.stringify(await foreignKeys()) !== JSON.stringify(manifest.foreignKeys)
      )
        throw new Error('Pensa changed since preflight; fence workers and create a new manifest')
      const appliedMigrations = await withPensaCutoverMigrations(
        migrations,
        async (folder, tags) => {
          if (apply)
            await migrate(conn.db, {
              migrationsFolder: folder,
              migrationsTable: 'members_migrations',
            })
          return tags
        },
      )
      console.log(
        JSON.stringify({
          mode,
          dryRun: !apply,
          projects: manifest.projects,
          migrations: appliedMigrations,
          retained: [
            'creations',
            'xp_events',
            'coin_events',
            'ai_usage_daily',
            'pensa_provider_usage',
            'pensa_deletion_jobs',
          ],
        }),
      )
    } else if (mode === 'rollback') {
      if ((await latest()) !== manifest.final)
        throw new Error('Rollback requires the exact reviewed post-cutover migration revision')
      const current = await tables(),
        keys = await foreignKeys()
      const enums =
        await readSql`select t.typname as name from pg_type t join pg_namespace ns on ns.oid=t.typnamespace where ns.nspname='members' and t.typtype='e' and left(t.typname,6)='pensa_'`
      const restore = [
        ...keys.map(
          (k) => `ALTER TABLE members.${quoted(k.table)} DROP CONSTRAINT ${quoted(k.name)};`,
        ),
        `DROP TABLE ${current.map((name) => `members.${quoted(name)}`).join(', ')};`,
        ...enums.map((e) => `DROP TYPE members.${quoted(String(e.name))};`),
        ...manifest.enumSql,
        dump,
        ...manifest.foreignKeys.map(
          (k) =>
            `ALTER TABLE members.${quoted(k.table)} ADD CONSTRAINT ${quoted(k.name)} ${k.definition};`,
        ),
        ...manifest.reservations.map(
          (r) =>
            `UPDATE members.ai_usage_reservations SET project_id=${literal(r.projectId)}::uuid WHERE id=${literal(r.id)}::uuid AND project_id IS NULL;`,
        ),
        ...manifest.narrations.map(
          (r) =>
            `UPDATE members.private_narrations SET project_id=${literal(r.projectId)}::uuid WHERE id=${literal(r.id)} AND project_id IS NULL;`,
        ),
        ...manifest.projectIds
          .filter((id) => !manifest.deletionJobIds.includes(id))
          .map(
            (id) =>
              `UPDATE members.pensa_deletion_jobs SET completed_at=now(),last_error='Cancelled by scoped rollback',updated_at=now() WHERE id=${literal(id)}::uuid;`,
          ),
        `DELETE FROM drizzle.members_migrations WHERE created_at > ${manifest.baseline} AND created_at <= ${manifest.final};`,
      ].join('\n')
      if (apply)
        await tool(
          process.env.PENSA_PSQL ?? 'psql',
          ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--single-transaction'],
          restore,
        )
      console.log(
        JSON.stringify({
          mode,
          dryRun: !apply,
          tables: manifest.tables,
          restoredReservations: manifest.reservations.length,
          sharedCountersRewritten: false,
          privateCleanup: 'Keep Pensa cleanup fenced until the rollback window is closed.',
        }),
      )
    } else {
      const issues: string[] = []
      for (const [table, before] of Object.entries(manifest.sentinels)) {
        const after = (
          await readSql.unsafe(`select row_to_json(t) as data from members.${quoted(table)} t`)
        ).map((r) => z.record(z.string(), z.unknown()).parse(r.data))
        const key = (r: Record<string, unknown>) =>
          table === 'ai_usage_daily'
            ? `${r.account_id}:${r.day}:${r.feature}`
            : table === 'pensa_provider_usage'
              ? `${r.account_id}:${r.day}`
              : String(r.id)
        const byId = new Map(after.map((r) => [key(r), r]))
        for (const row of before) {
          const current = byId.get(key(row))
          if (!current) issues.push(`${table}:missing:${key(row)}`)
          else if (
            (table === 'creations' && Number(current.revision) < Number(row.revision)) ||
            (table === 'ai_usage_daily' && Number(current.used) < Number(row.used)) ||
            (table === 'pensa_provider_usage' && Number(current.calls) < Number(row.calls))
          )
            issues.push(`${table}:regressed:${key(row)}`)
          else if (
            table === 'creations' &&
            Number(current.revision) === Number(row.revision) &&
            ['storage_ref', 'bytes', 'kind', 'format_version', 'parts', 'content_fingerprint'].some(
              (field) => JSON.stringify(current[field]) !== JSON.stringify(row[field]),
            )
          )
            issues.push(`${table}:changed_without_revision:${key(row)}`)
          else if (
            ['xp_events', 'coin_events'].includes(table) &&
            JSON.stringify(current) !== JSON.stringify(row)
          )
            issues.push(`${table}:changed:${key(row)}`)
        }
      }
      console.log(JSON.stringify({ mode, ok: !issues.length, issues }))
      if (issues.length) process.exitCode = 1
    }
  }
} finally {
  await conn.close()
}
