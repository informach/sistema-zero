import type postgres from 'postgres'

/** Sparse DB fixtures also need the live tables now included in account erasure. */
export async function prepareLiveTestSchema(database: ReturnType<typeof postgres>) {
  await database.begin(async (sql) => {
    await sql`select pg_advisory_xact_lock(1432014, 102)`
    for (const [table, file] of [
      ['live_programs', '0102_live_workshops.sql'],
      ['live_recording_jobs', '0103_live_recording_jobs.sql'],
      ['live_replay_positions', '0104_live_replay_positions.sql'],
      ['live_materials', '0105_live_materials_recording_commands.sql'],
      ['live_learning_progress', '0106_live_learning.sql'],
    ] as const) {
      const [existing] = await sql`select to_regclass(${`members.${table}`}) as name`
      if (existing?.name) continue
      const migration = await Bun.file(
        new URL(`../../src/infrastructure/persistence/drizzle/migrations/${file}`, import.meta.url),
      ).text()
      for (const statement of migration.split('--> statement-breakpoint'))
        if (statement.trim()) await sql.unsafe(statement)
    }
    // 0108 is idempotent (IF NOT EXISTS): always applied, so an older test database that
    // already had the live tables gains the recording columns and the reconcile lease table.
    const terminal = await Bun.file(
      new URL(
        '../../src/infrastructure/persistence/drizzle/migrations/0108_live_recording_terminal_states.sql',
        import.meta.url,
      ),
    ).text()
    for (const statement of terminal.split('--> statement-breakpoint'))
      if (statement.trim()) await sql.unsafe(statement)
    await sql`create table if not exists members.account_deletion_fences (account_id uuid primary key, created_at timestamptz not null)`
  })
}
