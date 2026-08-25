import { describe, expect, test } from 'bun:test'
import {
  findBlockingIndexesOnExistingTables,
  findMigrationSafetyViolations,
} from '../../scripts/migration-safety'

describe('segurança das migrations de índices', () => {
  test('detecta índice transacional em tabela já existente', () => {
    expect(
      findBlockingIndexesOnExistingTables(
        'CREATE INDEX "users_email_idx" ON "users" USING btree ("email");',
      ),
    ).toEqual(['users'])
  })

  test('permite índice da tabela criada na mesma migration', () => {
    const sql = `
      CREATE TABLE "sessions" ("id" uuid PRIMARY KEY);
      CREATE INDEX "sessions_id_idx" ON "sessions" USING btree ("id");
    `
    expect(findBlockingIndexesOnExistingTables(sql)).toEqual([])
  })

  test('nenhuma migration nova usa CREATE INDEX do Drizzle em tabela existente', () => {
    expect(findMigrationSafetyViolations()).toEqual([])
  })
})
