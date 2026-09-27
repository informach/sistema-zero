import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { createDbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { prepareTestDatabase } from './test-database'

/**
 * A migration da equipe do Pensa (`0098`): a coluna `share_code` com o índice único PARCIAL
 * (dois planos sem código convivem; dois com o mesmo código não) e a tabela
 * `pensa_project_members` que cai na cascata do projeto. Roda o DDL de verdade num schema
 * isolado, como o teste da migration do Molda.
 */
const url = await prepareTestDatabase()
test.skipIf(!url)(
  'Pensa team migration: partial unique share code and cascading members',
  async () => {
    if (!url) throw new Error('Test database unavailable')
    const conn = createDbConnection(url)
    const schema = `test_pensa_team_${randomUUID().replaceAll('-', '')}`
    try {
      await conn.sql.unsafe(`create schema "${schema}"`)
      await conn.sql.unsafe(
        `create table "${schema}".pensa_projects (id uuid primary key, user_id uuid not null, name text not null)`,
      )
      const ddl = await Bun.file(
        new URL(
          '../../src/infrastructure/persistence/drizzle/migrations/0098_pensa_project_members.sql',
          import.meta.url,
        ),
      ).text()
      await conn.sql.unsafe(ddl.replaceAll('"members"', `"${schema}"`))
      const owner = randomUUID()
      const p1 = randomUUID()
      const p2 = randomUUID()
      const p3 = randomUUID()
      await conn.sql.unsafe(
        `insert into "${schema}".pensa_projects (id, user_id, name) values ('${p1}','${owner}','A'), ('${p2}','${owner}','B'), ('${p3}','${owner}','C')`,
      )
      // Dois sem código convivem.
      const semCodigo = await conn.sql.unsafe(
        `select count(*)::int as n from "${schema}".pensa_projects where share_code is null`,
      )
      expect(semCodigo[0]?.n).toBe(3)
      await conn.sql.unsafe(
        `update "${schema}".pensa_projects set share_code = 'ABC234' where id = '${p1}'`,
      )
      let duplicated = false
      try {
        await conn.sql.unsafe(
          `update "${schema}".pensa_projects set share_code = 'ABC234' where id = '${p2}'`,
        )
      } catch {
        duplicated = true
      }
      expect(duplicated).toBe(true)
      // Membro cai com o projeto.
      const member = randomUUID()
      await conn.sql.unsafe(
        `insert into "${schema}".pensa_project_members (project_id, profile_id, account_id, invited_by, joined_at) values ('${p1}','${member}','${randomUUID()}','${owner}', now())`,
      )
      let duplicatedMember = false
      try {
        await conn.sql.unsafe(
          `insert into "${schema}".pensa_project_members (project_id, profile_id, account_id, invited_by, joined_at) values ('${p1}','${member}','${randomUUID()}','${owner}', now())`,
        )
      } catch {
        duplicatedMember = true
      }
      expect(duplicatedMember).toBe(true)
      await conn.sql.unsafe(`delete from "${schema}".pensa_projects where id = '${p1}'`)
      const left = await conn.sql.unsafe(
        `select count(*)::int as n from "${schema}".pensa_project_members`,
      )
      expect(left[0]?.n).toBe(0)
    } finally {
      await conn.sql.unsafe(`drop schema if exists "${schema}" cascade`)
      await conn.close()
    }
  },
)
