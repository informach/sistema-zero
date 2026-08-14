import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import snapshot from '../../src/infrastructure/persistence/drizzle/migrations/meta/0063_snapshot.json'

const migration = readFileSync(
  new URL(
    '../../src/infrastructure/persistence/drizzle/migrations/0063_deep_psylocke.sql',
    import.meta.url,
  ),
  'utf8',
)
const constraint =
  snapshot.tables['members.courses'].checkConstraints.courses_career_slot_check.value

describe('contrato da migration 0063', () => {
  test('o SQL aplicado e o snapshot Drizzle carregam o mesmo CHECK', () => {
    expect(migration).toContain(`CHECK (${constraint})`)
  })

  test('solta snapshots somente do curso-base vivo que será finalizado', () => {
    expect(migration).toContain('FROM "members"."courses" AS "course"')
    expect(migration).toContain('"course"."id" = "event"."source_id"')
    expect(migration).toContain('"course"."career_slot" = 1')
  })
})
