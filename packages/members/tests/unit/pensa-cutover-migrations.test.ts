import { expect, test } from 'bun:test'
import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { withPensaCutoverMigrations } from '../../scripts/pensa-cutover-migrations'

test('Pensa maintenance gives Drizzle only the reviewed cutover, even after later migrations', async () => {
  const source = fileURLToPath(
    new URL('../../src/infrastructure/persistence/drizzle/migrations/', import.meta.url),
  )
  const all = readMigrationFiles({ migrationsFolder: source })
  expect(all.length).toBeGreaterThan(129)
  let temporary = ''
  await withPensaCutoverMigrations(source, async (folder, tags) => {
    temporary = folder
    expect(tags).toEqual([
      '0126_pensa_functional_reset',
      '0127_pensa_functional_schema',
      '0128_pensa_remove_documentary_workflow',
    ])
    expect(readMigrationFiles({ migrationsFolder: folder })).toEqual(all.slice(126, 129))
  })
  expect(
    await access(temporary).then(
      () => true,
      () => false,
    ),
  ).toBe(false)
  expect(readMigrationFiles({ migrationsFolder: source })).toEqual(all)
})
