import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'

const dir = new URL('../../src/infrastructure/persistence/drizzle/migrations/', import.meta.url)

test('Pensa reset materializes scoped cleanup and detaches reservations before cascade', async () => {
  const reset = await readFile(new URL('0126_pensa_functional_reset.sql', dir), 'utf8')
  expect(reset.indexOf('INSERT INTO members.pensa_deletion_jobs')).toBeLessThan(
    reset.indexOf('DELETE FROM members.pensa_projects'),
  )
  expect(reset.indexOf('SET project_id = NULL')).toBeLessThan(
    reset.indexOf('DELETE FROM members.pensa_projects'),
  )
  expect(reset).toContain("status = 'reserved'")
  expect(reset).toContain('members.private_narrations')
  expect(reset).not.toMatch(
    /(?:DELETE FROM|TRUNCATE|DROP TABLE) members\.(?:creations|ai_usage_daily|pensa_provider_usage|xp_events|coin_events)/,
  )
  expect(reset).not.toContain('DROP SCHEMA')
})

test('generated schema removes cycle FKs before deleting their tables and preserves financial rows', async () => {
  const schema = await readFile(new URL('0127_pensa_functional_schema.sql', dir), 'utf8')
  const removal = await readFile(new URL('0128_pensa_remove_documentary_workflow.sql', dir), 'utf8')
  expect(schema).toContain('DROP CONSTRAINT "pensa_checkpoints_cycle_id_pensa_cycles_id_fk"')
  expect(schema).toContain('DROP CONSTRAINT "pensa_operations_cycle_id_pensa_cycles_id_fk"')
  expect(schema).not.toContain('DROP TABLE "members"."pensa_cycles"')
  expect(removal).toContain('DROP TABLE "members"."pensa_cycles"')
  expect(removal).not.toContain('DROP CONSTRAINT')
  expect(schema).toContain('ON DELETE set null')
  for (const table of [
    'pensa_project_revisions',
    'pensa_plan_drafts',
    'pensa_mission_progress',
    'pensa_execution_events',
  ]) {
    expect(schema).toContain(`CREATE TABLE "members"."${table}"`)
  }
})
