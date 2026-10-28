import { expect, test } from 'bun:test'

test('Admin Python language routes preserve authorization and cancellation', () => {
  const result = Bun.spawnSync(
    [process.execPath, 'test', './tests/studio-python-language-routes.fixture.ts'],
    { cwd: import.meta.dir.replace(/[\\/]tests$/, ''), stdout: 'pipe', stderr: 'pipe' },
  )
  const output = `${result.stdout.toString()}\n${result.stderr.toString()}`
  expect(result.exitCode, output).toBe(0)
})
