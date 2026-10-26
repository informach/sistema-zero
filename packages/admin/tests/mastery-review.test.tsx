import { expect, test } from 'bun:test'
import { resolve } from 'node:path'

test('mastery review UI validates decisions without sharing editor mocks with other suites', async () => {
  const child = Bun.spawn(
    [process.execPath, 'test', './tests/fixtures/mastery-review.fixture.tsx'],
    {
      cwd: resolve(import.meta.dir, '..'),
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const [status, output, errors] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ])
  expect(status, output + errors).toBe(0)
  expect(errors).toContain('3 pass')
}, 30000)
