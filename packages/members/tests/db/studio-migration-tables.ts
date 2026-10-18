/** Sparse adapter fixtures use the actual generated DDL for these independent tables.
 * Full migration/upgrade tests still replay the entire journal, including all foreign keys. */
export async function studioMigrationTableStatements(tables: readonly string[]) {
  const source = await Bun.file(
    new URL(
      '../../src/infrastructure/persistence/drizzle/migrations/0135_freezing_madripoor.sql',
      import.meta.url,
    ),
  ).text()
  const statements = source.split('--> statement-breakpoint').filter((statement) =>
    tables.some((table) => {
      if (!/^[a-z_]+$/.test(table)) throw new Error('Invalid fixture table')
      const target = `"members"."${table}"`
      const sql = statement.trim()
      return (
        sql.startsWith(`CREATE TABLE ${target} `) ||
        sql.startsWith(`ALTER TABLE ${target} `) ||
        (/^CREATE (?:UNIQUE )?INDEX /.test(sql) && sql.includes(` ON ${target} `))
      )
    }),
  )
  for (const table of tables)
    if (
      !statements.some((statement) =>
        statement.trim().startsWith(`CREATE TABLE "members"."${table}" `),
      )
    )
      throw new Error(`Generated table migration is missing: ${table}`)
  return statements
}
