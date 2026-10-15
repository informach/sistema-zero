import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import postgres from 'postgres'

async function rejected(query: PromiseLike<unknown>): Promise<boolean> {
  try {
    await query
    return false
  } catch {
    return true
  }
}

const base =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5433/sistemazero'
const target = new URL(base)
target.pathname = '/sistemazero_pensa_review3_migrations'
const admin = postgres(base, { max: 1, connect_timeout: 2, onnotice: () => {} })
let available = false
try {
  await admin`select 1`
  try {
    await admin.unsafe('create database sistemazero_pensa_review3_migrations')
  } catch (error) {
    if ((error as { code?: string }).code !== '42P04') throw error
  }
  available = true
} catch (error) {
  if (process.env.TEST_DATABASE_URL) throw error
  console.warn('[tests/db] Postgres indisponível — migration 0115 PULADA.')
} finally {
  await admin.end({ timeout: 1 })
}

// Banco isolado de revisão; nunca usa o banco de desenvolvimento como alvo do DDL.
test.skipIf(!available)(
  'migration 0115 real: reaplicação, funções válidas, um programador e cascata',
  async () => {
    const db = postgres(target.toString(), { max: 1, onnotice: () => {} })
    const schema = `pensa_v2_migration_${randomUUID().replaceAll('-', '')}`
    try {
      await db.unsafe(`create schema "${schema}"`)
      await db.unsafe(`create table "${schema}".pensa_projects (id uuid primary key)`)
      await db.unsafe(`create table "${schema}".pensa_tasks (id uuid primary key)`)
      const ddl = (
        await Bun.file(
          new URL(
            '../../src/infrastructure/persistence/drizzle/migrations/0115_pensa_v2_team.sql',
            import.meta.url,
          ),
        ).text()
      ).replaceAll('"members"', `"${schema}"`)
      await db.unsafe(ddl)
      await db.unsafe(ddl)
      const columns =
        await db`select column_name from information_schema.columns where table_schema = ${schema} and table_name = 'pensa_tasks'`
      expect(columns.map((row) => row.column_name)).toContain('assignee_profile_id')
      expect(columns.map((row) => row.column_name)).toContain('completed_by_profile_id')
      const id = randomUUID(),
        owner = randomUUID(),
        member = randomUUID()
      await db.unsafe(`insert into "${schema}".pensa_projects values ($1)`, [id])
      const insert = (profile: string, role: string) =>
        db.unsafe(
          `insert into "${schema}".pensa_project_roles (project_id, profile_id, role, assigned_by) values ($1, $2, $3, $4)`,
          [id, profile, role, owner],
        )
      await insert(owner, 'code')
      expect(await rejected(insert(member, 'code'))).toBe(true)
      expect(await rejected(insert(member, 'admin'))).toBe(true)
      await insert(member, 'art')
      await db.unsafe(`delete from "${schema}".pensa_projects where id = $1`, [id])
      expect(await db.unsafe(`select * from "${schema}".pensa_project_roles`)).toHaveLength(0)
    } finally {
      await db.unsafe(`drop schema if exists "${schema}" cascade`)
      await db.end()
    }
  },
  30_000,
)
