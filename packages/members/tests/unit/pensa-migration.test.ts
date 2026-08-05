import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const migration = readFileSync(
  new URL(
    '../../src/infrastructure/persistence/drizzle/migrations/0060_pensa_planner_v2.sql',
    import.meta.url,
  ),
  'utf8',
)
const snapshot = readFileSync(
  new URL(
    '../../src/infrastructure/persistence/drizzle/migrations/meta/0060_snapshot.json',
    import.meta.url,
  ),
  'utf8',
)

describe('migração destrutiva do Pensa planejador', () => {
  test('apaga toda a árvore legada e recria somente os cinco artefatos e o novo progresso', () => {
    for (const table of [
      'pensa_projects',
      'pensa_cycles',
      'pensa_conversations',
      'pensa_artifacts',
      'pensa_tasks',
      'pensa_checklist_items',
    ]) {
      expect(migration).toContain(`DROP TABLE IF EXISTS "members"."${table}" CASCADE`)
    }
    expect(migration).toContain(
      "ENUM('idea', 'game_design', 'visual_direction', 'task_plan', 'plan_review')",
    )
    expect(migration).toContain("ENUM('planned', 'in_progress', 'completed')")
    expect(migration).toContain('"completed_step_ids" jsonb')
    expect(migration).toContain('"output_ref" jsonb')
  })

  test('não toca os armazenamentos autônomos do Pinta ou do Estúdio', () => {
    expect(migration).not.toMatch(/DROP TABLE[^;]+(?:studio|pinta)(?!_tasks)/i)
  })

  test('deixa o metadata do Drizzle alinhado ao schema novo', () => {
    expect(snapshot).toContain('"members.pensa_tasks"')
    expect(snapshot).toContain('"progress_status"')
    expect(snapshot).not.toContain('pensa_checklist_items')
    expect(snapshot).not.toContain('studio_snapshot')
    expect(snapshot).not.toContain('friendly_spec')
  })
})
