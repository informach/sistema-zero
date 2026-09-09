import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('importação altera somente o rascunho e não sincroniza Zappy', () => {
  // Bun module mocks are global: isolate the gateway/Next lifecycle boundaries from other suites.
  const result = Bun.spawnSync(
    [process.execPath, 'test', './tests/fixtures/learning-import-sync.fixture.ts'],
    {
      cwd: resolve(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  expect(new TextDecoder().decode(result.stderr)).toContain('3 pass')
  expect(result.exitCode).toBe(0)
}, 10000)
