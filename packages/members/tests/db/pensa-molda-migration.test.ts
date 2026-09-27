import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

const url = await prepareTestDatabase()
test.skipIf(!url)(
  'Molda migration preserves existing destinations and adds a usable enum value',
  async () => {
    if (!url) throw new Error('Test database unavailable')
    const conn = createDbConnection(url)
    // Isolated test schema: exercise the exact generated statement on every run.
    const schema = `test_molda_${randomUUID().replaceAll('-', '')}`
    try {
      await conn.sql.unsafe(`create schema "${schema}"`)
      await conn.sql.unsafe(
        `create type "${schema}".pensa_task_destination as enum ('pinta','studio')`,
      )
      await conn.sql.unsafe(
        `create table "${schema}".tasks (id text primary key, destination "${schema}".pensa_task_destination)`,
      )
      await conn.sql.unsafe(`insert into "${schema}".tasks values ('original','pinta')`)
      const ddl = await Bun.file(
        new URL(
          '../../src/infrastructure/persistence/drizzle/migrations/0077_pensa_molda_destination.sql',
          import.meta.url,
        ),
      ).text()
      await conn.sql.unsafe(ddl.replaceAll('"members"', `"${schema}"`))
      await conn.sql.unsafe(`insert into "${schema}".tasks values ('new','molda')`)
      const rows = await conn.sql.unsafe(
        `select id, destination::text from "${schema}".tasks order by id`,
      )
      expect(rows.map((row) => ({ id: row.id, destination: row.destination }))).toEqual([
        { id: 'new', destination: 'molda' },
        { id: 'original', destination: 'pinta' },
      ])
    } finally {
      await conn.sql.unsafe(`drop schema if exists "${schema}" cascade`)
      await conn.close()
    }
  },
)
